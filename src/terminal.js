// The main terminal: one screen in front of where the student stands, with symbol tabs at the bottom
// (zones, map, lab, logbook). Everything in the expedition can be done from here within 2 x 2 m.
// Few words: symbols, pictures and placement instead of text.
import * as THREE from 'three';
import { canvasTexture, wrapText } from './toon.js';
import {
  drawItemIcon, drawAnalysisIcon, drawPeriodIcon, PERIODS, drawTabIcon, drawZoneIcon, drawSymbol, drawQuestion,
  drawRegionMap, regionProjection,
} from './icons.js';
import { weighEvidence, robotLines, yearToT } from './evidence.js';

const TW = 1280, TH = 800, TAB_Y = 690;
const FONT = 'system-ui, "Segoe UI", sans-serif';
const BG = '#0d1013', LINE = '#dff0f2', DIM = 'rgba(223,240,242,0.18)', AMBER = '#ffb36b';
const TEAL = '#7fe0b8', teal = (a) => `rgba(127,224,184,${a})`;   // the traces' color (amber is the student's guess)
const TABS = ['zones', 'map', 'lab', 'log'];

// Logbook layout (canvas pixels). Step a: guess (pin, marker). Step b: mark scanned objects as evidence.
// Step c: travel home when enough are marked; the robot sums up.
const L = {
  map: { x: 40, y: 115, w: 620, h: 310 }, robot: { x: 690, y: 115, w: 550, h: 200 }, home: { x: 690, y: 330, w: 550, h: 95 },
  line: { x: 60, y: 450, w: 1160, h: 110 }, tray: { x: 40, y: 590, w: 1200, h: 84 },
};
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function emptyLog() { return { pin: null, when: null, marked: [] }; }

export function buildTerminal({ mapDrawer }) {
  const { canvas, ctx, tex } = canvasTexture(TW, TH);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.475), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  mesh.userData.type = 'terminal';
  let tab = 'zones', labIdx = -1, labCount = 0;
  let log = emptyLog();
  let regions = [];                 // clickable areas from the last draw
  let drag = null;                  // { kind: 'marker' } while the time marker is dragged
  let pending = null;               // region pressed (fires on release)
  let speech = null;                // what the robot says now (lines), or null
  let dirty = true, lastKey = '';
  let view = null;                  // latest outside info (zone buttons, scanned list, data, clues, home)

  const R = (id, x, y, w, h) => regions.push({ id, x, y, w, h });

  // --- Drawing ------------------------------------------------------------
  function frame() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, TW, TH);
    ctx.strokeStyle = DIM; ctx.lineWidth = 2; ctx.strokeRect(10, 10, TW - 20, TH - 20);
  }
  function tile(r, state) {
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = state === 'here' ? 'rgba(255,179,107,0.18)' : 'rgba(223,240,242,0.04)'; ctx.fill();
    ctx.strokeStyle = state === 'here' || state === 'go' ? AMBER : state === 'off' ? DIM : 'rgba(223,240,242,0.55)';
    ctx.lineWidth = state === 'here' || state === 'go' ? 4 : 2; ctx.stroke();
  }
  function smallLabel(text, x, y, color = 'rgba(223,240,242,0.6)', size = 24, align = 'center') {
    ctx.fillStyle = color; ctx.font = `500 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function header() {
    // Unknown year in the corner (symbol-like), stealth dot.
    const year = view.year != null ? String(view.year) : '????';
    smallLabel(year, TW - 60, 50, view.year != null ? LINE : AMBER, 34, 'right');
    ctx.fillStyle = '#7fe0b8'; ctx.beginPath(); ctx.arc(TW - 35, 50, 8, 0, 7); ctx.fill();
    drawTabIcon(ctx, tab, 50, 50, 20, AMBER);
  }
  function tabs() {
    const w = TW / TABS.length;
    TABS.forEach((t, i) => {
      const x = i * w, on = t === tab;
      ctx.fillStyle = on ? 'rgba(255,179,107,0.14)' : 'rgba(223,240,242,0.03)'; ctx.fillRect(x + 6, TAB_Y + 6, w - 12, TH - TAB_Y - 22);
      if (on) { ctx.fillStyle = AMBER; ctx.fillRect(x + 6, TAB_Y + 6, w - 12, 5); }
      drawTabIcon(ctx, t, x + w / 2, TAB_Y + 52, 30, on ? AMBER : 'rgba(223,240,242,0.7)');
      R('tab:' + t, x, TAB_Y, w, TH - TAB_Y);
    });
  }

  function drawZones() {
    const zones = view.zoneButtons;   // [{ id, name, state }]
    zones.forEach((z, i) => {
      const r = { x: 40 + i * 302, y: 100, w: 286, h: 300 };
      tile(r, z.state);
      drawZoneIcon(ctx, z.id, r.x + r.w / 2, r.y + 125, 70, z.state === 'off' ? DIM : z.state === 'here' ? AMBER : LINE);
      smallLabel(z.name, r.x + r.w / 2, r.y + 255, z.state === 'off' ? DIM : 'rgba(223,240,242,0.8)', 26);
      if (z.state === 'seen') smallLabel('✓', r.x + r.w - 30, r.y + 30, '#7fe0b8', 30);
      if (z.state !== 'off' && z.state !== 'here') R('zone:' + z.id, r.x, r.y, r.w, r.h);
    });
    // Door out and travel home: symbols only. Home is lit when enough evidence is marked;
    // pressed too early, the robot asks for more (in the logbook).
    const door = { x: 40, y: 430, w: 590, h: 230 }, home = { x: 650, y: 430, w: 590, h: 230 };
    tile(door, view.doorOpen ? 'go' : 'off');
    drawSymbol(ctx, 'door', door.x + door.w / 2, door.y + door.h / 2, 80, view.doorOpen ? AMBER : DIM);
    if (view.doorOpen) R('door', door.x, door.y, door.w, door.h);
    const ready = api.ready();
    tile(home, !view.homeOn ? 'off' : ready ? 'go' : 'on');
    drawSymbol(ctx, 'home', home.x + home.w / 2, home.y + home.h / 2, 80, !view.homeOn ? DIM : ready ? AMBER : 'rgba(223,240,242,0.6)');
    if (view.homeOn) R('home', home.x, home.y, home.w, home.h);
  }

  function drawMapTab() {
    mapDrawer(ctx, { x: 40, y: 100, w: TW - 80, h: 570 }, view.map.x, view.map.z, view.map.yaw, view.map.clues);
  }

  function drawLab() {
    const scanned = view.scanned, data = view.data;
    if (scanned.length !== labCount) { labCount = scanned.length; labIdx = labCount - 1; }
    if (!scanned.length) {
      drawTabIcon(ctx, 'lab', TW / 2, 330, 110, DIM);
      drawQuestion(ctx, TW / 2, 330, 120, 0.5);
      return;
    }
    const id = scanned[labIdx], item = data.items[id] || { name: id, analyses: [] };
    // Arrows and position among the scanned objects.
    if (scanned.length > 1) {
      tile({ x: TW - 450, y: 25, w: 90, h: 60 }, 'on'); drawSymbol(ctx, 'prev', TW - 405, 55, 18); R('labPrev', TW - 450, 25, 90, 60);
      tile({ x: TW - 260, y: 25, w: 90, h: 60 }, 'on'); drawSymbol(ctx, 'next', TW - 215, 55, 18); R('labNext', TW - 260, 25, 90, 60);
    }
    smallLabel(`${labIdx + 1} / ${scanned.length}`, TW - 310, 55, 'rgba(223,240,242,0.7)', 26);
    drawItemIcon(ctx, id, 140, 220, 80);
    ctx.fillStyle = LINE; ctx.font = `300 44px ${FONT}`; ctx.fillText(item.name.toUpperCase(), 270, 170);
    let y = 240;
    for (const an of item.analyses) {
      drawAnalysisIcon(ctx, an.type, 300, y - 10, 22);
      ctx.fillStyle = '#dfe7e9'; ctx.font = `28px ${FONT}`;
      y = wrapText(ctx, an.text, 350, y, TW - 400, 36) + 18;
    }
  }

  // Thumbnail of a scanned object in a small square; marked evidence is lit with a check.
  function thumb(id, x, y, s, marked = false) {
    ctx.beginPath(); ctx.roundRect(x, y, s, s, 8);
    ctx.fillStyle = marked ? teal(0.2) : 'rgba(223,240,242,0.05)'; ctx.fill();
    ctx.strokeStyle = marked ? TEAL : 'rgba(223,240,242,0.4)'; ctx.lineWidth = marked ? 4 : 2; ctx.stroke();
    drawItemIcon(ctx, id, x + s / 2, y + s / 2, s * 0.32);
    if (marked) drawSymbol(ctx, 'check', x + s - 14, y + 14, 9, TEAL);
  }

  // The period timeline with the student's marker (amber) and the traces' datings (teal), overlap bright.
  function timeline(r, when, ev, interactive = true) {
    const yLine = r.y + r.h - 20, X = (t) => r.x + t * r.w;
    if (ev && ev.items.length) {
      for (const it of ev.items) {
        const xa = X(yearToT(it.evidence.dating[0])), xb = X(yearToT(it.evidence.dating[1]));
        ctx.fillStyle = teal(0.16); ctx.fillRect(xa, yLine - 12, Math.max(4, xb - xa), 24);
      }
      if (ev.time) {
        const xa = X(yearToT(ev.time.from)), xb = X(yearToT(ev.time.to)), w = Math.max(8, xb - xa), x0 = (xa + xb - w) / 2;
        ctx.fillStyle = teal(0.9); ctx.fillRect(x0, yLine - 16, w, 32);
        ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.strokeRect(x0 - 5, yLine - 22, w + 10, 44);
      }
    }
    ctx.strokeStyle = 'rgba(223,240,242,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(r.x, yLine); ctx.lineTo(r.x + r.w, yLine); ctx.stroke();
    for (let i = 0; i < PERIODS; i++) {
      const x = r.x + (i + 0.5) * (r.w / PERIODS);
      drawPeriodIcon(ctx, i, x, r.y + 30, 26);
      ctx.beginPath(); ctx.moveTo(x, yLine - 8); ctx.lineTo(x, yLine + 8); ctx.stroke();
    }
    if (when != null) {
      const x = X(when);
      ctx.fillStyle = AMBER; ctx.strokeStyle = AMBER; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, r.y + 56); ctx.lineTo(x, yLine); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, yLine - 2); ctx.lineTo(x - 16, yLine + 22); ctx.lineTo(x + 16, yLine + 22); ctx.closePath(); ctx.fill();
    } else if (interactive) {
      // No marker yet: a "?" sits on the line, between two periods.
      const x = r.x + r.w / 2 + r.w / PERIODS / 2;
      ctx.fillStyle = BG; ctx.fillRect(x - 22, yLine - 26, 44, 52);
      drawQuestion(ctx, x, yLine, 48, 0.6);
    }
    if (interactive) R('timeline', r.x - 20, r.y - 10, r.w + 40, r.h + 40);
  }

  // The region map with the traces' zones: 'her' zones and their overlap (bright), 'ud' zones at their
  // origin with a line to the overlap. Zones beyond the map edge get an arrow at the edge.
  function evidenceMap(r, ev) {
    const P = regionProjection(r), s = P.toXY(0, 50)[1] - P.toXY(0, 51)[1];   // pixels per degree of latitude
    const circle = (z) => { const [x, y] = P.toXY(z.lon, z.lat); return { x, y, r: (z.radiusKm / 111.2) * s }; };
    const here = ev.here.map(circle), out = ev.out.map(circle);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    for (const c of here) {
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7);
      ctx.fillStyle = teal(0.1); ctx.fill(); ctx.strokeStyle = teal(0.55); ctx.lineWidth = 2; ctx.stroke();
    }
    // Overlap of all 'her' zones: clip to each in turn, then fill. Its center by sampling the smallest zone.
    let center = null;
    if (here.length) {
      ctx.save();
      for (const c of here) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.clip(); }
      ctx.fillStyle = teal(0.6); ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      const m = here.reduce((a, b) => (b.r < a.r ? b : a));
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
        const x = m.x - m.r + (2 * m.r * i) / 20, y = m.y - m.r + (2 * m.r * j) / 20;
        if (here.every((c) => Math.hypot(x - c.x, y - c.y) <= c.r)) { sx += x; sy += y; n++; }
      }
      if (n) center = [sx / n, sy / n];
    }
    for (const c of out) {
      const onMap = inside({ x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 8 }, c.x, c.y);
      let ex = c.x, ey = c.y;
      if (!onMap) {
        // Pull the point back along the line from the map center to just inside the edge.
        const mx = r.x + r.w / 2, my = r.y + r.h / 2, dx = c.x - mx, dy = c.y - my;
        const k = Math.min((r.w / 2 - 22) / Math.abs(dx || 1e-6), (r.h / 2 - 22) / Math.abs(dy || 1e-6));
        ex = mx + dx * k; ey = my + dy * k;
      }
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7);
      ctx.fillStyle = 'rgba(223,240,242,0.07)'; ctx.fill();
      ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(223,240,242,0.55)'; ctx.lineWidth = 2; ctx.stroke();
      if (center) { ctx.beginPath(); ctx.moveTo(center[0], center[1]); ctx.lineTo(ex, ey); ctx.strokeStyle = teal(0.85); ctx.lineWidth = 3; ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = LINE;
      if (!onMap) {
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(c.y - ey, c.x - ex));
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else { ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  function mapWithPin(r, pin, ev, showQuestion = true) {
    drawRegionMap(ctx, r);
    if (ev) evidenceMap(r, ev);
    if (pin) { const [x, y] = regionProjection(r).toXY(pin[0], pin[1]); drawSymbol(ctx, 'pin', x, y - 4, 18); }
    else if (showQuestion) drawQuestion(ctx, r.x + r.w / 2, r.y + r.h / 2, 90);
  }

  // The capsule's robot with what it says, in a box (text for now; speech later).
  function robotBox(r, lines, size = 28) {
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = 'rgba(223,240,242,0.04)'; ctx.fill(); ctx.strokeStyle = 'rgba(223,240,242,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    drawSymbol(ctx, 'robot', r.x + 50, r.y + 60, 30, lines ? TEAL : 'rgba(223,240,242,0.45)');
    if (!lines) return;
    ctx.fillStyle = LINE; ctx.font = `${size}px ${FONT}`;
    let y = r.y + 30 + size;
    for (const line of lines) y = wrapText(ctx, line, r.x + 105, y, r.w - 125, size * 1.3) + size * 0.5;
  }

  // Dots for the evidence needed: one per item, lit as items are marked.
  function needDots(x, y, have, need) {
    for (let i = 0; i < need; i++) {
      ctx.beginPath(); ctx.arc(x + i * 34, y, 11, 0, 7);
      ctx.fillStyle = i < have ? TEAL : 'rgba(223,240,242,0.06)'; ctx.fill();
      ctx.strokeStyle = i < have ? TEAL : 'rgba(223,240,242,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  function drawLog() {
    const data = view.data, need = data.evidence.minItems, ev = weighEvidence(data, log.marked);
    smallLabel('Hvor?', L.map.x, 95, 'rgba(223,240,242,0.7)', 26, 'left');
    mapWithPin(L.map, log.pin, ev);
    R('logmap', L.map.x, L.map.y, L.map.w, L.map.h);
    robotBox(L.robot, speech);
    // Travel home: lit when enough evidence is marked.
    const ready = api.ready();
    tile(L.home, !view.homeOn ? 'off' : ready ? 'go' : 'on');
    drawSymbol(ctx, 'home', L.home.x + 60, L.home.y + L.home.h / 2, 30, view.homeOn && ready ? AMBER : 'rgba(223,240,242,0.5)');
    needDots(L.home.x + 140, L.home.y + L.home.h / 2, log.marked.length, need);
    if (view.homeOn) R('home', L.home.x, L.home.y, L.home.w, L.home.h);
    smallLabel('Hvornår?', L.line.x - 20, 440, 'rgba(223,240,242,0.7)', 26, 'left');
    timeline(L.line, log.when, ev);
    // The tray: every scanned object. Tap to mark it as evidence (tap again to unmark).
    const s = 78;
    view.scanned.forEach((id, i) => {
      const x = L.tray.x + i * (s + 12), y = L.tray.y + 2;
      thumb(id, x, y, s, log.marked.includes(id));
      R('item:' + id, x, y, s, s);
    });
    if (!view.scanned.length) drawQuestion(ctx, L.tray.x + 40, L.tray.y + 40, 50);
    // Small clear buttons for the pin and the marker.
    if (log.pin) { drawSymbol(ctx, 'clear', L.map.x + L.map.w - 22, L.map.y + 22, 16); R('clearPin', L.map.x + L.map.w - 44, L.map.y, 44, 44); }
    if (log.when != null) { drawSymbol(ctx, 'clear', L.line.x + L.line.w + 2, L.line.y + 30, 16); R('clearWhen', L.line.x + L.line.w - 20, L.line.y + 8, 44, 44); }
  }

  // Travelling home: the robot sums up on the whole screen.
  function drawSpeech() {
    robotBox({ x: 40, y: 60, w: TW - 80, h: TH - 120 }, speech, 40);
  }

  // At home: the travel card. The student's guess beside the overlap from the traces, the marked
  // objects and the robot's open question. No judgement.
  function drawCard() {
    const data = view.data, ev = weighEvidence(data, log.marked), said = robotLines(data, log.marked);
    smallLabel('Rejsekort', 40, 45, AMBER, 30, 'left');
    smallLabel('Dit gæt', 40, 92, 'rgba(223,240,242,0.7)', 24, 'left');
    smallLabel('Sporene', 420, 92, 'rgba(223,240,242,0.7)', 24, 'left');
    // Same shape as the logbook map (2:1), so the pin lands where it was placed.
    mapWithPin({ x: 40, y: 110, w: 360, h: 180 }, log.pin, null);
    mapWithPin({ x: 420, y: 110, w: 360, h: 180 }, null, ev, false);
    robotBox({ x: 800, y: 110, w: 440, h: 230 }, said.ready ? [said.lines[1]] : null, 24);
    timeline({ x: 60, y: 385, w: 1160, h: 110 }, log.when, ev, false);
    log.marked.forEach((id, i) => thumb(id, 40 + i * 76, 518, 66, true));
    tile({ x: 640, y: 600, w: 600, h: 80 }, 'go');
    drawSymbol(ctx, 'door', 940, 640, 28, AMBER);
    R('again', 640, 600, 600, 80);
  }

  function draw() {
    regions = [];
    frame();
    if (view.finished) drawCard();
    else if (view.jumpingHome && speech) drawSpeech();
    else {
      header();
      if (tab === 'zones') drawZones();
      else if (tab === 'map') drawMapTab();
      else if (tab === 'lab') drawLab();
      else drawLog();
      tabs();
    }
    tex.needsUpdate = true;
  }

  // --- Interaction --------------------------------------------------------
  const hitAt = (x, y) => { for (let i = regions.length - 1; i >= 0; i--) if (inside(regions[i], x, y)) return regions[i]; return null; };
  const toXY = (uv) => [uv.x * TW, (1 - uv.y) * TH];
  const setWhen = (x) => { log.when = Math.min(1, Math.max(0, (x - L.line.x) / L.line.w)); };

  const api = {
    mesh,
    get log() { return log; },
    // Enough evidence marked to travel home.
    ready() { return !!view && log.marked.length >= view.data.evidence.minItems; },
    // Asked to travel home: with enough evidence the robot sums up (true); otherwise it asks for more (false).
    requestHome() {
      if (!view) return false;
      const said = robotLines(view.data, log.marked);
      speech = said.lines; dirty = true;
      if (!said.ready) tab = 'log';
      return said.ready;
    },
    verdict() { return view ? robotLines(view.data, log.marked) : null; },
    reset() { log = emptyLog(); tab = 'zones'; speech = null; drag = null; labIdx = -1; labCount = 0; dirty = true; },
    showTab(t) { if (TABS.includes(t)) { tab = t; dirty = true; } },
    // Redraw when anything on screen changed.
    update(v) {
      view = v;
      const key = [v.finished, v.jumpingHome, v.year, v.doorOpen, v.homeOn, v.zoneButtons.map((z) => z.id + z.state).join(), v.scanned.join(), v.map.clues.sharp, v.map.clues.links.length, Math.round(v.map.x), Math.round(v.map.z)].join('|');
      if (key !== lastKey) { lastKey = key; dirty = true; }
      if (dirty) { draw(); dirty = false; }
    },
    down(uv) {
      const [x, y] = toXY(uv), r = hitAt(x, y);
      pending = r;
      if (r && r.id === 'timeline') { drag = { kind: 'marker' }; setWhen(x); dirty = true; }
    },
    move(uv) {
      if (!drag) return;
      setWhen(toXY(uv)[0]); dirty = true;
    },
    // Returns an action for the app ('A'..'D', 'door', 'home', 'again') or null.
    up(uv) {
      const [x, y] = toXY(uv), r = hitAt(x, y);
      let action = null;
      if (drag) { drag = null; pending = null; dirty = true; return null; }
      if (r && pending && r.id === pending.id) {
        const id = r.id;
        if (id.startsWith('tab:')) tab = id.slice(4);
        else if (id === 'labPrev' || id === 'labNext') { if (labCount > 1) labIdx = (labIdx + (id === 'labNext' ? 1 : -1) + labCount) % labCount; }
        else if (id === 'logmap') log.pin = regionProjection(L.map).toLonLat(x, y);
        else if (id === 'clearPin') log.pin = null;
        else if (id === 'clearWhen') log.when = null;
        else if (id.startsWith('item:')) {
          const it = id.slice(5), i = log.marked.indexOf(it);
          if (i >= 0) log.marked.splice(i, 1); else log.marked.push(it);
          speech = null;   // the robot's last words no longer fit
        }
        else if (id.startsWith('zone:')) action = id.slice(5);
        else action = id;   // door, home, again
        dirty = true;
      }
      pending = null;
      return action;
    },
    get dragging() { return !!drag; },
  };
  return api;
}
