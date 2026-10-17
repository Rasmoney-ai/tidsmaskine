// The main terminal: one screen in front of where the student stands, with symbol tabs at the bottom
// (zones, map, lab, logbook). Everything in the expedition can be done from here within 2 x 2 m.
// Few words: symbols, pictures and placement instead of text.
import * as THREE from 'three';
import { canvasTexture, wrapText } from './toon.js';
import {
  drawItemIcon, drawAnalysisIcon, drawPeriodIcon, PERIODS, drawTabIcon, drawZoneIcon, drawSymbol, drawQuestion,
  drawRegionMap, regionProjection,
} from './icons.js';

const TW = 1280, TH = 800, TAB_Y = 690;
const FONT = 'system-ui, "Segoe UI", sans-serif';
const BG = '#0d1013', LINE = '#dff0f2', DIM = 'rgba(223,240,242,0.18)', AMBER = '#ffb36b';
const TABS = ['zones', 'map', 'lab', 'log'];

// Logbook layout (canvas pixels).
const L = {
  map: { x: 40, y: 120, w: 440, h: 290 }, whereEv: { x: 500, y: 120, w: 110, h: 290 },
  pairA: { x: 700, y: 150, w: 200, h: 200 }, pairB: { x: 1040, y: 150, w: 200, h: 200 },
  line: { x: 60, y: 470, w: 900, h: 120 }, whenEv: { x: 1000, y: 455, w: 250, h: 110 },
  tray: { x: 40, y: 600, w: 1200, h: 80 },
};
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function emptyLog() { return { pin: null, when: null, pair: [null, null], whereEv: [], whenEv: [] }; }

export function buildTerminal({ mapDrawer }) {
  const { canvas, ctx, tex } = canvasTexture(TW, TH);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.475), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  mesh.userData.type = 'terminal';
  let tab = 'zones', labIdx = -1, labCount = 0;
  let log = emptyLog();
  let regions = [];                 // clickable areas from the last draw
  let drag = null;                  // { kind: 'item', id, x, y, moved } or { kind: 'marker' }
  let pending = null;               // region pressed (fires on release)
  let selected = null;              // tray item chosen by a tap (then tap a target)
  let dirty = true, lastKey = '';
  let view = null;                  // latest outside info (zone buttons, scanned list, data, clues, home)

  const R = (id, x, y, w, h, extra = {}) => regions.push({ id, x, y, w, h, ...extra });

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
    // Door out and travel home: symbols only.
    const door = { x: 40, y: 430, w: 590, h: 230 }, home = { x: 650, y: 430, w: 590, h: 230 };
    tile(door, view.doorOpen ? 'go' : 'off');
    drawSymbol(ctx, 'door', door.x + door.w / 2, door.y + door.h / 2, 80, view.doorOpen ? AMBER : DIM);
    if (view.doorOpen) R('door', door.x, door.y, door.w, door.h);
    tile(home, view.homeOn ? 'go' : 'off');
    drawSymbol(ctx, 'home', home.x + home.w / 2, home.y + home.h / 2, 80, view.homeOn ? AMBER : DIM);
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

  // Thumbnail of a scanned object in a small square.
  function thumb(id, x, y, s, hl = false) {
    ctx.beginPath(); ctx.roundRect(x, y, s, s, 8);
    ctx.fillStyle = hl ? 'rgba(255,179,107,0.2)' : 'rgba(223,240,242,0.05)'; ctx.fill();
    ctx.strokeStyle = hl ? AMBER : 'rgba(223,240,242,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    drawItemIcon(ctx, id, x + s / 2, y + s / 2, s * 0.32);
  }
  function evidence(list, r, key) {
    // Up to three objects as evidence; empty slots show a faint frame.
    // A tall box stacks them; a wide box puts them side by side.
    const row = r.w > r.h;
    const s = row ? Math.min(r.h, (r.w - 20) / 3) : Math.min(r.w, (r.h - 20) / 3);
    R('drop:' + key, r.x, r.y, r.w, r.h);   // registered first, so the thumbnails on top win
    for (let i = 0; i < 3; i++) {
      const x = row ? r.x + i * (s + 10) : r.x + (r.w - s) / 2, y = row ? r.y + (r.h - s) / 2 : r.y + i * (s + 10);
      if (list[i]) { thumb(list[i], x, y, s); R(`rm:${key}:${i}`, x, y, s, s); }
      else { ctx.setLineDash([6, 6]); ctx.strokeStyle = selected ? AMBER : DIM; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, s - 8, s - 8); ctx.setLineDash([]); }
    }
  }
  function timeline(r, when, interactive = true) {
    const yLine = r.y + r.h - 20;
    ctx.strokeStyle = 'rgba(223,240,242,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(r.x, yLine); ctx.lineTo(r.x + r.w, yLine); ctx.stroke();
    for (let i = 0; i < PERIODS; i++) {
      const x = r.x + (i + 0.5) * (r.w / PERIODS);
      drawPeriodIcon(ctx, i, x, r.y + 40, 26);
      ctx.beginPath(); ctx.moveTo(x, yLine - 8); ctx.lineTo(x, yLine + 8); ctx.stroke();
    }
    if (when != null) {
      const x = r.x + when * r.w;
      ctx.fillStyle = AMBER; ctx.strokeStyle = AMBER; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, r.y - 4); ctx.lineTo(x, yLine); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, yLine - 2); ctx.lineTo(x - 16, yLine + 22); ctx.lineTo(x + 16, yLine + 22); ctx.closePath(); ctx.fill();
    } else {
      // No marker yet: a "?" sits on the line, between two periods.
      const x = r.x + r.w / 2 + r.w / PERIODS / 2;
      ctx.fillStyle = BG; ctx.fillRect(x - 22, yLine - 26, 44, 52);
      drawQuestion(ctx, x, yLine, 48, 0.6);
    }
    if (interactive) R('timeline', r.x - 20, r.y - 10, r.w + 40, r.h + 40);
  }
  function regionPin(r, pin) {
    drawRegionMap(ctx, r);
    if (pin) { const [x, y] = regionProjection(r).toXY(pin[0], pin[1]); drawSymbol(ctx, 'pin', x, y - 4, 18); }
    else drawQuestion(ctx, r.x + r.w / 2, r.y + r.h / 2, 90);
  }
  function pairSlot(r, id, key) {
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = 'rgba(223,240,242,0.04)'; ctx.fill();
    ctx.strokeStyle = selected ? AMBER : 'rgba(223,240,242,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    if (id) drawItemIcon(ctx, id, r.x + r.w / 2, r.y + r.h / 2, 60); else drawQuestion(ctx, r.x + r.w / 2, r.y + r.h / 2, 90);
    R('drop:' + key, r.x, r.y, r.w, r.h);
  }

  function drawLog() {
    smallLabel('Hvor?', L.map.x, 95, 'rgba(223,240,242,0.7)', 26, 'left');
    regionPin(L.map, log.pin);
    R('logmap', L.map.x, L.map.y, L.map.w, L.map.h);
    evidence(log.whereEv, L.whereEv, 'where');
    smallLabel('Hvad ændrer sig?', L.pairA.x, 95, 'rgba(223,240,242,0.7)', 26, 'left');
    pairSlot(L.pairA, log.pair[0], 'pairA');
    pairSlot(L.pairB, log.pair[1], 'pairB');
    drawSymbol(ctx, 'notmatch', (L.pairA.x + L.pairA.w + L.pairB.x) / 2, L.pairA.y + L.pairA.h / 2, 34, AMBER);
    smallLabel('Hvornår?', L.line.x - 20, 440, 'rgba(223,240,242,0.7)', 26, 'left');
    timeline(L.line, log.when);
    evidence(log.whenEv, { x: L.whenEv.x, y: L.whenEv.y, w: L.whenEv.w, h: L.whenEv.h }, 'when');
    // The tray: every scanned object, ready to drag (or tap, then tap a field).
    const s = 70;
    view.scanned.forEach((id, i) => {
      const x = L.tray.x + i * (s + 12), y = L.tray.y + 4;
      thumb(id, x, y, s, selected === id);
      R('item:' + id, x, y, s, s, { item: id });
    });
    if (!view.scanned.length) drawQuestion(ctx, L.tray.x + 40, L.tray.y + 40, 50);
    // Small clear buttons for the pin and the marker.
    if (log.pin) { drawSymbol(ctx, 'clear', L.map.x + L.map.w - 22, L.map.y + 22, 16); R('clearPin', L.map.x + L.map.w - 44, L.map.y, 44, 44); }
    if (log.when != null) { drawSymbol(ctx, 'clear', L.line.x + L.line.w + 10, L.line.y - 30, 16); R('clearWhen', L.line.x + L.line.w - 12, L.line.y - 52, 44, 44); }
  }

  // At home: the travel card with the student's answers. No judgement.
  function drawCard() {
    smallLabel('Rejsekort', 40, 50, AMBER, 30, 'left');
    regionPin({ x: 40, y: 90, w: 520, h: 340 }, log.pin);
    const ev = (list, x, y) => list.forEach((id, i) => thumb(id, x + i * 86, y, 76));
    ev(log.whereEv, 40, 445);
    pairSlot({ x: 640, y: 90, w: 220, h: 220 }, log.pair[0], 'cardA');
    pairSlot({ x: 1020, y: 90, w: 220, h: 220 }, log.pair[1], 'cardB');
    drawSymbol(ctx, 'notmatch', 940, 200, 34, AMBER);
    timeline({ x: 640, y: 360, w: 600, h: 120 }, log.when, false);
    ev(log.whenEv, 640, 520);
    regions = regions.filter((r) => !r.id.startsWith('drop:'));
    tile({ x: 640, y: 600, w: 600, h: 80 }, 'go');
    drawSymbol(ctx, 'door', 940, 640, 28, AMBER);
    R('again', 640, 600, 600, 80);
  }

  function draw() {
    regions = [];
    frame();
    if (view.finished) { drawCard(); }
    else {
      header();
      if (tab === 'zones') drawZones();
      else if (tab === 'map') drawMapTab();
      else if (tab === 'lab') drawLab();
      else drawLog();
      tabs();
    }
    // An object being dragged follows the pointer.
    if (drag && drag.kind === 'item' && drag.moved) { ctx.globalAlpha = 0.85; thumb(drag.id, drag.x - 40, drag.y - 40, 80, true); ctx.globalAlpha = 1; }
    tex.needsUpdate = true;
  }

  // --- Interaction --------------------------------------------------------
  const hitAt = (x, y) => { for (let i = regions.length - 1; i >= 0; i--) if (inside(regions[i], x, y)) return regions[i]; return null; };
  const toXY = (uv) => [uv.x * TW, (1 - uv.y) * TH];
  const setWhen = (x) => { log.when = Math.min(1, Math.max(0, (x - L.line.x) / L.line.w)); };

  function placeItem(target, id) {
    if (!id) return false;
    if (target === 'drop:where') { if (!log.whereEv.includes(id) && log.whereEv.length < 3) log.whereEv.push(id); return true; }
    if (target === 'drop:when') { if (!log.whenEv.includes(id) && log.whenEv.length < 3) log.whenEv.push(id); return true; }
    if (target === 'drop:pairA') { log.pair[0] = id; if (log.pair[1] === id) log.pair[1] = null; return true; }
    if (target === 'drop:pairB') { log.pair[1] = id; if (log.pair[0] === id) log.pair[0] = null; return true; }
    return false;
  }

  const api = {
    mesh,
    get log() { return log; },
    // At least one field filled: pin, time marker, or a pair of objects.
    filled() { return !!(log.pin || log.when != null || (log.pair[0] && log.pair[1])); },
    reset() { log = emptyLog(); tab = 'zones'; selected = null; drag = null; labIdx = -1; labCount = 0; dirty = true; },
    showTab(t) { if (TABS.includes(t)) { tab = t; dirty = true; } },
    // Redraw when anything on screen changed.
    update(v) {
      view = v;
      const key = [v.finished, v.year, v.doorOpen, v.homeOn, v.zoneButtons.map((z) => z.id + z.state).join(), v.scanned.join(), v.map.clues.sharp, v.map.clues.links.length, Math.round(v.map.x), Math.round(v.map.z)].join('|');
      if (key !== lastKey) { lastKey = key; dirty = true; }
      if (dirty) { draw(); dirty = false; }
    },
    down(uv) {
      const [x, y] = toXY(uv), r = hitAt(x, y);
      pending = r;
      if (!r) return;
      if (r.id.startsWith('item:')) drag = { kind: 'item', id: r.item, x, y, x0: x, y0: y, moved: false };
      else if (r.id === 'timeline') { drag = { kind: 'marker' }; setWhen(x); dirty = true; }
    },
    move(uv) {
      if (!drag) return;
      const [x, y] = toXY(uv);
      if (drag.kind === 'marker') { setWhen(x); dirty = true; return; }
      drag.x = x; drag.y = y;
      if (Math.hypot(x - drag.x0, y - drag.y0) > 18) drag.moved = true;
      dirty = true;
    },
    // Returns an action for the app ('zone:A', 'door', 'home', 'again') or null.
    up(uv) {
      const [x, y] = toXY(uv), r = hitAt(x, y);
      let action = null;
      if (drag && drag.kind === 'item') {
        if (drag.moved) { if (r) placeItem(r.id, drag.id); selected = null; }
        else selected = selected === drag.id ? null : drag.id;   // tap: choose, then tap a field
        drag = null; dirty = true; pending = null;
        return null;
      }
      if (drag && drag.kind === 'marker') { drag = null; pending = null; dirty = true; return null; }
      if (r && pending && r.id === pending.id) {
        const id = r.id;
        if (id.startsWith('tab:')) { tab = id.slice(4); selected = null; }
        else if (id === 'labPrev' || id === 'labNext') { if (labCount > 1) labIdx = (labIdx + (id === 'labNext' ? 1 : -1) + labCount) % labCount; }
        else if (id === 'logmap') { if (selected && placeItem('drop:where', selected)) selected = null; else log.pin = regionProjection(L.map).toLonLat(x, y); }
        else if (id === 'clearPin') log.pin = null;
        else if (id === 'clearWhen') log.when = null;
        else if (id.startsWith('rm:')) { const [, key, i] = id.split(':'); (key === 'where' ? log.whereEv : log.whenEv).splice(Number(i), 1); }
        else if (id.startsWith('drop:')) {
          if (selected) { placeItem(id, selected); selected = null; }
          else if (id === 'drop:pairA') log.pair[0] = null;
          else if (id === 'drop:pairB') log.pair[1] = null;
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
