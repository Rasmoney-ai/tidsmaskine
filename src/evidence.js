// The evidence phase: the rules from data/jelling.json ("evidence"), kept apart from the drawing.
// Marked items lay their dating on the timeline and their zone on the map. The time is the overlap
// of all datings; the place is the overlap of the 'her' zones. 'Ud' zones show where things came from.
import { PERIODS } from './icons.js';

// Where years sit on the period timeline (0..1). The period pictures are evenly spaced, the years are not:
// one anchor per picture center (stone tool, bronze axe, Viking ship, castle, church, factory, today).
const ANCHOR_YEARS = [-5000, -1200, 950, 1250, 1500, 1850, 2026];
const EDGE = [-10000, 2100];
export function yearToT(year) {
  const pts = [[0, EDGE[0]], ...ANCHOR_YEARS.map((y, i) => [(i + 0.5) / PERIODS, y]), [1, EDGE[1]]];
  if (year <= pts[0][1]) return 0;
  for (let i = 1; i < pts.length; i++) {
    const [t0, y0] = pts[i - 1], [t1, y1] = pts[i];
    if (year <= y1) return t0 + ((year - y0) / (y1 - y0)) * (t1 - t0);
  }
  return 1;
}

// Everything the marked items say together.
export function weighEvidence(data, marked) {
  const items = marked.map((id) => ({ id, ...data.items[id] })).filter((it) => it.evidence);
  let from = -Infinity, to = Infinity;
  for (const it of items) { from = Math.max(from, it.evidence.dating[0]); to = Math.min(to, it.evidence.dating[1]); }
  const time = items.length ? (from <= to ? { from, to } : null) : null;   // null: no overlap (yet)
  const zone = (it) => ({ id: it.evidence.zone, item: it.id, ...data.regions[it.evidence.zone] });
  const here = items.filter((it) => it.trace !== 'ud' && data.regions[it.evidence.zone]).map(zone);
  const out = items.filter((it) => it.trace === 'ud' && data.regions[it.evidence.zone]).map(zone);
  return { items, time, here, out, revealed: items.some((it) => it.evidence.revealsPlace) };
}

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

// What the capsule's robot says. Too few items: 'tooFew'. Otherwise 'done' with time and place, and the open question.
export function robotLines(data, marked) {
  const E = data.evidence, need = E.minItems - marked.length;
  if (need > 0) return { ready: false, lines: [fill(E.robot.tooFew, { missing: need })] };
  const ev = weighEvidence(data, marked);
  const width = ev.time ? ev.time.to - ev.time.from : Infinity;
  const tp = E.timePhrases.find((p) => width <= p.maxWidth) || E.timePhrases[E.timePhrases.length - 1];
  const time = ev.time ? fill(tp.text, { from: ev.time.from, to: ev.time.to, mid: Math.round((ev.time.from + ev.time.to) / 2) }) : tp.text;
  // Place: revealed by a stone; else the phrase for the narrowest 'her' zone, if it has one.
  const narrow = [...ev.here].sort((a, b) => a.radiusKm - b.radiusKm)[0];
  const place = ev.revealed ? E.placePhrases.revealed : (narrow && E.placePhrases[narrow.id]) || E.placePhrases.default;
  const both = marked.includes('thorshammer') && marked.includes('kors');
  return {
    ready: true,
    lines: [fill(E.robot.done, { place, time }), both ? E.robot.openQuestionBoth : E.robot.openQuestionDefault],
    time: ev.time, place,
  };
}
