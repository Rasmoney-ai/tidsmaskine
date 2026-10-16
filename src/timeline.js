// The expedition is a sequence of clips: lab intro, time jump, landing, fog hops between zones, jump home.
// The capsule only moves when the user picks a zone (no guided tour, no auto-advance at zones).
// Everything visible is a pure function of the state (clip, tau): same state => same picture.
import { HOME_YEAR, COUNTDOWN } from './config.js';

// Zones on the site. capsule: where the capsule stands (world x/z, yaw so its door faces the zone).
// base: world-time offset for small ambient motion (smoke, fire). zones: scene groups to show.
export const ZONES = {
  A: { name: 'Landsbyen', base: 1000, capsule: { x: -97.5, z: 17.6, yaw: 0 }, zones: ['village'] },
  B: { name: 'Gravhøjene', base: 2000, capsule: { x: -27, z: 25.8, yaw: Math.PI }, zones: ['mounds', 'stone'] },
  C: { name: 'Runestenen', base: 3000, capsule: { x: -5.24, z: -8.76, yaw: -Math.PI / 4 }, zones: ['stone', 'mounds'] },
  D: { name: 'Palisaden', base: 4000, capsule: { x: -37.8, z: 17, yaw: Math.PI / 2 }, zones: ['village', 'mounds'] },
};
export const ZONE_ORDER = ['A', 'B', 'C', 'D'];
// The map screen draws each place from `glide` (the map is untouched in this milestone).
for (const z of Object.values(ZONES)) z.glide = [[z.capsule.x, z.capsule.z], [z.capsule.x, z.capsule.z]];
const LANDING = { base: 500, capsule: { x: -72, z: -22, yaw: -Math.PI / 2 }, zones: ['village'] };

// Where the user stands when they go out (capsule-local, the door is in the front wall, forward is -z).
export const OUTSIDE_SPOT = { x: 0, z: -5.2 };

const CLIPS = {
  intro: { kind: 'lab', dur: 10, captions: [
    [0, 'Tidsmaskinen · Ekspedition 1', 'I er tidsrejsende detektiver. Kapslen lander et ukendt sted i fortiden. Find ud af hvor, hvornår og hvad der er ved at ske.'],
    [5, 'Regel nr. 1', 'Rør intet. Ændr intet. I tager ikke ting med – I scanner dem. Laboratoriet arbejder på kopier.'],
  ] },
  jumpPast: { kind: 'jump', dir: 'past', dur: 14, captions: [[0, 'Tidsspring', 'Hold godt fast … Destinationen er ukendt.']], sounds: [[0, 'whooshStart'], [13, 'chime']] },
  landing: { kind: 'hold', dur: Infinity, ...LANDING, captions: [[0, 'Ukendt sted · ukendt tid', 'Kapslen er landet. Pladsen ser ud til at være forladt for nylig. Vælg en zone, I vil undersøge.']] },
  hop: { kind: 'hop', dur: 3.5, captions: [[0, 'Tågespring', 'Kapslen skjuler sig i tågen og flytter sig til zonen …']] },
  jumpHome: { kind: 'jump', dir: 'home', dur: 14, captions: [[0, 'Tidsspring', 'Vi vender hjem til vores egen tid.']], sounds: [[0, 'whooshStart'], [13, 'chime']] },
  home: { kind: 'lab', dur: Infinity, captions: [[0, 'Velkommen hjem – år 2026', 'Tag jeres spor og jeres bud med til samtalen i klassen. Hvor og hvornår var I? Hvad var ved at ændre sig?']] },
};
for (const id of ZONE_ORDER) CLIPS[id] = { kind: 'zone', dur: Infinity, ...ZONES[id], captions: [[0, ZONES[id].name, 'Døren er åben. Gå ud og undersøg zonen. Peg med håndscanneren på et spor for at scanne det.']] };

const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };
const ARRIVE = 3;   // seconds of mist clearing after landing
const LEAVE = 1.4;  // seconds of mist rising at the start of a hop

export class Timeline {
  constructor() {
    this.clips = CLIPS;
    this.stops = ZONES;        // name kept for the map screen
    this.order = ZONE_ORDER;
    this.reset();
  }

  reset() {
    this.clipId = 'intro';
    this.visited = new Set();
    this.from = null;      // { clip, tau, mist0 } when hopping or jumping home
    this.target = null;    // zone id a hop leads to
  }

  get clip() { return CLIPS[this.clipId]; }
  get finished() { return this.clipId === 'home'; }
  get place() { return this.clip.capsule ? this.clip : this.from ? CLIPS[this.from.clip] : LANDING; }

  // Called when a clip with a fixed length has run out.
  advance() {
    const id = this.clipId;
    if (id === 'intro') return this._enter('jumpPast');
    if (id === 'jumpPast') return this._enter('landing');
    if (id === 'hop') { const t = this.target; this.visited.add(t); this.target = null; return this._enter(t); }
    if (id === 'jumpHome') return this._enter('home');
    return false;
  }

  // The user picked a zone on the panel: the only way the capsule moves.
  choose(zone, tau = 0) {
    const c = this.clip;
    if (zone === this.clipId || !(c.kind === 'zone' || c.kind === 'hold')) return false;
    this.from = { clip: this.clipId, tau, mist0: this._arriveMist(tau) };
    this.target = zone;
    return this._enter('hop');
  }

  goHome(tau = 0) {
    const c = this.clip;
    if (!(c.kind === 'zone' || c.kind === 'hold')) return false;
    this.from = { clip: this.clipId, tau, mist0: this._arriveMist(tau) };
    return this._enter('jumpHome');
  }

  _arriveMist(tau) { return 1 - smooth(tau / ARRIVE); }
  _enter(id) { this.clipId = id; return true; }

  // The door can open once the capsule stands still in a zone and the mist has cleared.
  doorOpen(tau) { return this.clip.kind === 'zone' && tau > ARRIVE + 0.5; }

  // World time for ambient motion (smoke, fire): continuous within a place.
  worldTime(tau) {
    const c = this.clip;
    if (c.capsule) return c.base + Math.max(tau, 0);
    if (this.from) return CLIPS[this.from.clip].base + this.from.tau + tau;
    return LANDING.base;
  }

  // Points around all capsule positions (used to keep stones out of the capsule's way).
  routePoints() {
    const pts = [];
    for (const p of [LANDING, ...Object.values(ZONES)]) {
      const { x, z, yaw } = p.capsule;
      for (let i = -4; i <= 7; i++) pts.push({ x: x - Math.sin(yaw) * i, z: z - Math.cos(yaw) * i });
    }
    return pts;
  }

  state(tau, comfort = false, out = {}) {
    const c = this.clip, id = this.clipId, p = this.place;
    out.clipId = id; out.kind = c.kind; out.tau = tau;
    out.w = this.worldTime(tau);
    out.x = p.capsule.x; out.z = p.capsule.z; out.yaw = p.capsule.yaw;
    out.zone = c.kind === 'zone' ? id : null;
    out.zones = p.zones;

    let mist = 0, tunnel = 0, lab = 0;
    if (c.kind === 'lab') { mist = 1; lab = 1; }
    else if (c.kind === 'zone' || c.kind === 'hold') mist = this._arriveMist(tau);
    else if (c.kind === 'hop') { const m0 = this.from ? this.from.mist0 : 1; mist = m0 + (1 - m0) * smooth(tau / LEAVE); tunnel = 0.25 * smooth((tau - LEAVE) / 1); }
    else if (c.kind === 'jump') {
      const q = tau / c.dur;
      const m0 = this.from ? this.from.mist0 : 1;
      mist = c.dir === 'home' ? m0 + (1 - m0) * smooth(tau / 2) : 1;
      tunnel = smooth(q / 0.18) * (1 - smooth((q - 0.82) / 0.18));
      lab = c.dir === 'past' ? 1 - smooth(q / 0.18) : smooth((q - 0.82) / 0.18);
    }
    out.mist = mist; out.tunnel = tunnel; out.lab = lab;

    // The year is unknown in the past; during jumps the display scrambles.
    out.year = c.kind === 'lab' ? HOME_YEAR : null;
    out.jumping = c.kind === 'jump';
    out.jumpProgress = c.kind === 'jump' ? tau / c.dur : 0;
    out.alarm = false;
    out.doorOpen = this.doorOpen(tau);
    out.caption = this.captionAt(tau);
    return out;
  }

  captionAt(tau) {
    const c = this.clip;
    if (this.clipId === 'intro' && tau < 0) return { title: 'Gør klar', body: `Ekspeditionen starter om ${Math.ceil(-tau)} …`, key: 'cd' + Math.ceil(-tau) };
    let cap = null;
    for (const x of c.captions || []) if (x[0] <= tau) cap = x;
    if (!cap) return { title: '', body: '', key: this.clipId + 'none' };
    return { title: cap[1], body: cap[2], key: this.clipId + cap[0] };
  }

  sounds() { return this.clip.sounds || []; }

  report() { return { zones: ZONE_ORDER.length, countdown: COUNTDOWN }; }
}
