// The time capsule: a clean octagonal glass room (Villeneuve style). Seen only from inside.
// No furniture: people can walk around. Screen panels along the windows, a halo light, and the mist shell.
import * as THREE from 'three';
import { Builder, G, MAT, canvasTexture, wrapText } from './toon.js';
import { CAPSULE, seatPosition, WORLD } from './config.js';

// The capsule's own materials: when seen from outside they are masked to the round door (stencil).
const CAB = MAT.cabin.clone(); CAB.side = THREE.DoubleSide;
const GLO = MAT.glow.clone();

// Villeneuve palette: dark graphite, matte concrete, thin cool light lines, a few warm amber accents.
const GRAPHITE = 0x262b32, CONCRETE = 0x48505a, DARK = 0x171a1e, FLOOR = 0x2b3038, SEAM = 0x3a414b;
const LIGHT = 0xdff0f2, AMBER = 0xffb36b;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// A box stretched between two points (ribs, seams).
function beam(b, from, to, w, h, color) {
  _a.set(...from); _b.set(...to);
  const len = _a.distanceTo(_b);
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.clone().sub(_a).normalize());
  _e.setFromQuaternion(_q);
  b.add(G.box(w, len, h), color, { pos: [(_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2], rot: [_e.x, _e.y, _e.z] });
}

// Octagon helpers: corner k at angle PI/8 + k*PI/4 from +z, so a flat side faces forward (-z).
const corner = (k, r) => { const a = Math.PI / 8 + k * Math.PI / 4; return [r * Math.sin(a), r * Math.cos(a)]; };
const sideMid = (k) => (k + 1) * Math.PI / 4;   // angle of the side between corner k and k+1
const APO = Math.cos(Math.PI / 8), SIDE = 2 * Math.sin(Math.PI / 8);

function ring(b, r, y, h, thick, color) {
  for (let k = 0; k < 8; k++) {
    const a = sideMid(k);
    b.add(G.box(r * SIDE + thick * 0.8, h, thick), color, { pos: [r * APO * Math.sin(a), y, r * APO * Math.cos(a)], rot: [0, a, 0] });
  }
}

// The door: in the front side (side 3, facing -z). W = opening width, TOP = top of the opening.
const DOOR_SIDE = 3;
const DOOR = { R: 1.0, CY: 1.38 };   // radius and center height of the round opening

// Sides with a screen panel (index k of sideMid). Side 3 is the front (-z) and stays free for the view.
export const PANEL_SIDES = { 2: 'guide', 4: 'guide', 1: 'map', 5: 'status', 0: 'lab', 6: 'lab', 7: 'guide' };

function cabinShell() {
  const { RADIUS: R, SILL, WALL_TOP: TOP, DOME_TOP } = CAPSULE;
  const b = new Builder(900);
  // Floor: dark concrete slab, radial seams and concentric rings.
  b.add(G.cyl(R, R, 0.12, 8), FLOOR, { pos: [0, -0.06, 0], rot: [0, Math.PI / 8, 0] });
  for (let k = 0; k < 8; k++) { const [x, z] = corner(k, R - 0.3); beam(b, [x * 0.33, 0.003, z * 0.33], [x, 0.003, z], 0.025, 0.006, SEAM); }
  for (const r of [1.15, 2.3]) b.add(G.torus(r, 0.012, 3, 8), SEAM, { pos: [0, 0.004, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  b.add(G.cyl(0.9, 0.9, 0.012, 8), SEAM, { pos: [0, 0.006, 0], rot: [0, Math.PI / 8, 0] });
  // Low plinth wall with a chamfered top and a recessed shadow gap.
  ring(b, R, SILL / 2, SILL, 0.16, GRAPHITE);
  ring(b, R - 0.1, SILL + 0.012, 0.025, 0.24, CONCRETE);
  ring(b, R - 0.14, 0.03, 0.06, 0.04, DARK);
  // Mullions: slim dark posts with an inner fin and a light slot.
  for (let k = 0; k < 8; k++) {
    const [x, z] = corner(k, R), [xi, zi] = corner(k, R - 0.1);
    b.add(G.box(0.07, TOP, 0.07), DARK, { pos: [x, TOP / 2, z], rot: [0, Math.PI / 8 + k * Math.PI / 4, 0] });
    b.add(G.box(0.025, TOP - SILL - 0.1, 0.16), GRAPHITE, { pos: [xi, (TOP + SILL) / 2, zi], rot: [0, Math.PI / 8 + k * Math.PI / 4, 0] });
  }
  // Heavy top beam, faceted ceiling panels with seams, and the oculus frame.
  ring(b, R, TOP + 0.08, 0.26, 0.3, GRAPHITE);
  ring(b, R - 0.18, TOP - 0.07, 0.04, 0.08, DARK);
  const rTop = 1.1, domeH = DOME_TOP - TOP - 0.2, y0 = TOP + 0.2;
  b.add(new THREE.CylinderGeometry(rTop, R - 0.1, domeH, 8, 1, true), CONCRETE, { pos: [0, y0 + domeH / 2, 0], rot: [0, Math.PI / 8, 0] });
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = corner(k, R - 0.12), [x1, z1] = corner(k, rTop);
    beam(b, [x0, y0, z0], [x1, DOME_TOP, z1], 0.09, 0.09, DARK);
  }
  for (const f of [0.33, 0.66]) b.add(G.torus((R - 0.1 + (rTop - R + 0.1) * f) / Math.cos(Math.PI / 8) * Math.cos(Math.PI / 8), 0.02, 3, 8), DARK, { pos: [0, y0 + domeH * f - 0.02, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  b.add(G.torus(rTop, 0.08, 4, 8), DARK, { pos: [0, DOME_TOP, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  // Screen consoles along the windows: slim pedestal, angled screen housing.
  for (const k of Object.keys(PANEL_SIDES).map(Number)) {
    const a = sideMid(k), d = R * APO - 0.42, sx = Math.sin(a), sz = Math.cos(a);
    b.add(G.box(0.86, 0.8, 0.12), GRAPHITE, { pos: [d * sx + 0.1 * sx, 0.4, d * sz + 0.1 * sz], rot: [0, a, 0] });
    b.add(G.box(1.0, 0.58, 0.05), DARK, { pos: [d * sx, 1.0, d * sz], rot: [-0.6, a + Math.PI, 0, 'YXZ'] });
  }
  const shell = b.mesh(CAB);

  // Light lines: under the top beam, in the floor gap, mullion slots, oculus ring.
  const g = new Builder(901);
  ring(g, R - 0.2, TOP - 0.1, 0.012, 0.012, LIGHT);
  ring(g, R - 0.17, 0.006, 0.006, 0.03, 0x7fb8b4);
  for (let k = 0; k < 8; k++) {
    const [x, z] = corner(k, R - 0.19);
    g.add(G.box(0.012, TOP - SILL - 0.3, 0.012), LIGHT, { pos: [x, (TOP + SILL) / 2, z] });
  }
  g.add(G.torus(rTop - 0.1, 0.015, 3, 8), LIGHT, { pos: [0, DOME_TOP - 0.05, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  for (const k of Object.keys(PANEL_SIDES).map(Number)) {
    const a = sideMid(k), d = R * APO - 0.36;
    g.add(G.box(0.7, 0.012, 0.012), AMBER, { pos: [d * Math.sin(a), 0.62, d * Math.cos(a)], rot: [0, a, 0] });
  }
  const glow = g.mesh(GLO);

  // Glass: very faint tint, floor to beam.
  const gl = new Builder(903);
  for (let k = 0; k < 8; k++) {
    const a = sideMid(k), d = R * APO - 0.03;
    const cx = d * Math.sin(a), cz = d * Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a);   // side center and tangent
    if (k !== DOOR_SIDE) { gl.add(new THREE.PlaneGeometry(R * SIDE, TOP - SILL), 0xbfe0ea, { pos: [cx, (TOP + SILL) / 2, cz], rot: [0, a, 0] }); continue; }
    // Front side: glass with a round hole for the door.
    const w = R * SIDE, shape = new THREE.Shape();
    shape.moveTo(-w / 2, SILL); shape.lineTo(w / 2, SILL); shape.lineTo(w / 2, TOP); shape.lineTo(-w / 2, TOP); shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, DOOR.CY, DOOR.R + 0.05, 0, Math.PI * 2, true); shape.holes.push(hole);
    gl.add(new THREE.ShapeGeometry(shape, 24), 0xbfe0ea, { pos: [cx, 0, cz], rot: [0, a, 0] });
  }
  gl.add(new THREE.CircleGeometry(rTop, 8), 0xbfe0ea, { pos: [0, DOME_TOP, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  const glass = new THREE.Mesh(gl.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.06, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  glass.renderOrder = 5;
  return { shell, glow, glass };
}

// The time core: a thin halo of light under the oculus and its mirror ring in the floor.
function halo() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: LIGHT, fog: false, toneMapped: false });
  const top = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.018, 4, 64), mat);
  top.rotation.x = Math.PI / 2; top.position.y = CAPSULE.DOME_TOP - 0.55;
  const floor = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.012, 3, 64), mat);
  floor.rotation.x = Math.PI / 2; floor.position.y = 0.012;
  group.add(top, floor);
  return { group, mat, top };
}

// Mist shell around the capsule: hides the outside during time jumps / comfort mode.
function mistShell() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 }, uTime: { value: 0 }, uTunnel: { value: 0 }, uLab: { value: 1 },
      uCalm: { value: new THREE.Color(WORLD.MIST_STEALTH) }, uLabColor: { value: new THREE.Color(WORLD.MIST_LAB) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uOpacity, uTime, uTunnel, uLab; uniform vec3 uCalm, uLabColor; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float a = atan(d.x, d.z);
        // Two static patterns cross-fade: light shimmers without moving (no vection).
        float p1 = 0.5 + 0.5 * sin(a * 5.0 + d.y * 8.0);
        float p2 = 0.5 + 0.5 * sin(a * -4.0 + d.y * 11.0 + 1.7);
        float k = 0.5 + 0.5 * sin(uTime * 0.9);
        float bands = mix(p1, p2, k);
        vec3 tun = mix(vec3(0.10, 0.14, 0.42), vec3(0.42, 0.28, 0.78), bands);
        tun = mix(tun, vec3(1.0, 0.8, 0.42), pow(mix(p2, p1, k), 8.0) * 0.9);
        tun += vec3(0.85, 0.92, 1.0) * pow(max(-d.z, 0.0), 5.0) * 0.9;
        vec3 calm = mix(uCalm, uLabColor, uLab);
        // Lab: soft floor/horizon so the cabin does not float in a white void.
        calm *= mix(0.86, 1.0, smoothstep(-0.4, 0.2, d.y));
        gl_FragColor = vec4(mix(calm, tun, uTunnel), uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 16), mat);
  m.renderOrder = 10;
  m.position.y = 1.2;
  return m;
}

// Screen panels along the windows. Content types: guide (zone choice), map, status, lab.
const SW = 1024, SH = 568, BTN_H = 82;
const FONT = 'system-ui, "Segoe UI", sans-serif';

function letterSpaced(ctx, text, x, y, spacing) {
  for (const ch of text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + spacing; }
  return x;
}

function screenBase(ctx, label, w = SW, h = SH) {
  ctx.fillStyle = '#0d1013'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(223,240,242,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = '#ffb36b'; ctx.font = `600 22px ${FONT}`; ctx.textBaseline = 'middle';
  letterSpaced(ctx, label, 40, 46, 5);
  ctx.textBaseline = 'alphabetic';
}

function drawButtons(ctx, rects) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of rects) {
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6);
    if (b.state === 'here' || b.state === 'go') { ctx.fillStyle = '#ffb36b'; ctx.fill(); }
    else { ctx.strokeStyle = b.state === 'off' ? 'rgba(223,240,242,0.15)' : b.state === 'seen' ? 'rgba(223,240,242,0.45)' : '#dff0f2'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = b.state === 'here' || b.state === 'go' ? '#0d1013' : b.state === 'off' ? 'rgba(223,240,242,0.25)' : '#f2f6f7';
    ctx.font = `600 ${b.font || 26}px ${FONT}`;
    ctx.fillText((b.state === 'seen' ? '✓ ' : '') + b.label.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// A small drawing of a scanned object for the lab screen.
function drawItemIcon(ctx, id, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  if (id === 'soelvmoent') {
    ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8d9196'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, 7); ctx.stroke();
    ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.25 + k * r * 0.25); ctx.bezierCurveTo(-r * 0.15, -r * 0.38 + k * r * 0.25, r * 0.1, -r * 0.1 + k * r * 0.25, r * 0.45, -r * 0.3 + k * r * 0.25); ctx.stroke(); }
  } else { ctx.strokeStyle = '#dff0f2'; ctx.lineWidth = 3; ctx.strokeRect(-r, -r, 2 * r, 2 * r); }
  ctx.restore();
}

function panels(mapDrawer) {
  const geo = new THREE.PlaneGeometry(0.9, 0.5);
  const make = () => {
    const { ctx, tex } = canvasTexture(SW, SH);
    return { ctx, tex, mat: new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }), last: '' };
  };
  const screens = { guide: make(), map: make(), status: make(), lab: make() };
  const group = new THREE.Group();
  const meshes = [];
  const R = CAPSULE.RADIUS;
  for (const [k, type] of Object.entries(PANEL_SIDES)) {
    const a = sideMid(Number(k)), d = R * APO - 0.43;
    const m = new THREE.Mesh(geo, screens[type].mat);
    m.position.set(d * Math.sin(a), 1.0, d * Math.cos(a));
    m.rotation.set(-0.6, a + Math.PI, 0, 'YXZ');
    m.translateZ(0.03);
    m.userData.type = type;
    group.add(m); meshes.push(m);
  }
  let rects = [];

  // Zone choice: title, short text, a row of zones and a row of actions (go out, travel home).
  function drawGuide(caption, buttons, debugLine) {
    const s = screens.guide, ctx = s.ctx;
    const key = caption.key + '|' + buttons.map((b) => b.id + b.state).join() + '|' + debugLine;
    if (key === s.last) return; s.last = key;
    screenBase(ctx, 'TIDSMASKINEN · ZONEVALG');
    if (debugLine) { ctx.fillStyle = '#7fb8b4'; ctx.font = `20px ui-monospace, Consolas, monospace`; ctx.textAlign = 'right'; ctx.fillText(debugLine, SW - 40, 54); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#f2f6f7'; ctx.font = `300 50px ${FONT}`;
    ctx.fillText(caption.title.toUpperCase(), 40, 124);
    ctx.fillStyle = '#b9c4c7'; ctx.font = `30px ${FONT}`;
    wrapText(ctx, caption.body, 40, 174, SW - 80, 40);
    const rows = [buttons.filter((b) => b.row === 0), buttons.filter((b) => b.row === 1)];
    rects = [];
    rows.forEach((row, ri) => {
      const n = row.length, gap = 14, w = (SW - 80 - gap * (n - 1)) / Math.max(n, 1);
      row.forEach((b, i) => rects.push({ ...b, x: 40 + i * (w + gap), y: ri ? 452 : 356, w, h: BTN_H, font: ri ? 30 : 26 }));
    });
    drawButtons(ctx, rects);
    s.tex.needsUpdate = true;
  }

  function drawStatus({ year, place, jumping, jumpProgress }, t) {
    const s = screens.status, ctx = s.ctx;
    // Unknown year: question marks; during a jump the digits scramble.
    const shown = year != null ? String(year) : jumping ? String(1000 + Math.floor(Math.abs(Math.sin(Math.floor(t * 12) * 12.9898) * 43758.5453) % 9000)) : '????';
    const key = `${shown}|${place}|${jumping ? Math.round(jumpProgress * 40) : -1}`;
    if (key === s.last) return; s.last = key;
    screenBase(ctx, 'STATUS');
    ctx.fillStyle = '#7d8a8e'; ctx.font = `600 22px ${FONT}`; letterSpaced(ctx, 'ÅR', 40, 120, 5);
    ctx.fillStyle = year != null || jumping ? '#f2f6f7' : '#ffb36b'; ctx.font = `200 170px ${FONT}`; ctx.fillText(shown, 34, 270);
    ctx.fillStyle = '#7d8a8e'; ctx.font = `600 22px ${FONT}`; letterSpaced(ctx, 'STED', 560, 120, 5);
    ctx.fillStyle = '#f2f6f7'; ctx.font = `300 52px ${FONT}`; ctx.fillText(place, 556, 180);
    ctx.fillStyle = '#7d8a8e'; ctx.font = `600 22px ${FONT}`; letterSpaced(ctx, 'STEALTH', 560, 250, 5);
    ctx.fillStyle = '#7fe0b8'; ctx.beginPath(); ctx.arc(574, 296, 12, 0, 7); ctx.fill();
    ctx.font = `400 34px ${FONT}`; ctx.fillText('AKTIV', 600, 308);
    if (jumping) {
      ctx.strokeStyle = 'rgba(223,240,242,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(40, 420, SW - 80, 14);
      ctx.fillStyle = '#dff0f2'; ctx.fillRect(40, 420, (SW - 80) * jumpProgress, 14);
      ctx.fillStyle = '#7d8a8e'; ctx.font = `600 22px ${FONT}`; letterSpaced(ctx, 'TIDSSPRING', 40, 480, 5);
    }
    s.tex.needsUpdate = true;
  }

  function drawMap(x, z, yaw) {
    const s = screens.map, ctx = s.ctx;
    const key = `${Math.round(x * 2)}|${Math.round(z * 2)}`;
    if (key === s.last) return; s.last = key;
    screenBase(ctx, 'KORT · UKENDT STED');
    mapDrawer(ctx, { x: 40, y: 70, w: SW - 80, h: SH - 110 }, x, z, yaw);
    s.tex.needsUpdate = true;
  }

  // Laboratory: the scanned objects and their analyses (from the data file).
  function drawLab(scanned, data) {
    const s = screens.lab, ctx = s.ctx;
    const key = scanned.join();
    if (key === s.last && s.drawn) return; s.last = key; s.drawn = true;
    screenBase(ctx, 'LABORATORIUM · ANALYSER');
    if (!scanned.length) {
      ctx.fillStyle = '#7d8a8e'; ctx.font = `300 40px ${FONT}`;
      ctx.fillText('Ingen scannede spor endnu.', 40, 150);
      ctx.fillStyle = '#b9c4c7'; ctx.font = `30px ${FONT}`;
      wrapText(ctx, 'Gå ud af kapslen, og peg med håndscanneren på et spor for at scanne det. Laboratoriet arbejder på en kopi – originalen bliver liggende.', 40, 210, SW - 80, 40);
    } else {
      // Newest first; room for two objects on the screen.
      scanned.slice(-2).reverse().forEach((id, i) => {
        const item = data.items[id] || { name: id, analyses: [] }, y = 100 + i * 220;
        drawItemIcon(ctx, id, 110, y + 70, 60);
        ctx.fillStyle = '#f2f6f7'; ctx.font = `300 42px ${FONT}`; ctx.fillText(item.name.toUpperCase(), 200, y + 40);
        if (item.found) { ctx.fillStyle = '#7d8a8e'; ctx.font = `24px ${FONT}`; ctx.fillText(item.found, 200, y + 74); }
        let yy = y + 118;
        for (const a of item.analyses) {
          ctx.fillStyle = '#ffb36b'; ctx.font = `600 22px ${FONT}`; letterSpaced(ctx, a.type.toUpperCase(), 200, yy, 4);
          ctx.fillStyle = '#dfe7e9'; ctx.font = `30px ${FONT}`;
          yy = wrapText(ctx, a.text, 200, yy + 38, SW - 240, 38) + 6;
        }
      });
    }
    s.tex.needsUpdate = true;
  }

  return {
    group, meshes,
    // uv on a guide screen -> button id (only active buttons).
    buttonAt(mesh, uv) {
      if (mesh.userData.type !== 'guide') return null;
      const x = uv.x * SW, y = (1 - uv.y) * SH;
      const r = rects.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && b.state !== 'off' && b.state !== 'here');
      return r ? r.id : null;
    },
    draw({ caption, buttons, debug, status, map, t, scanned, data }) {
      drawGuide(caption, buttons, debug);
      drawStatus(status, t);
      drawMap(map.x, map.z, map.yaw);
      drawLab(scanned, data);
    },
  };
}

// The round door in the front wall: a time portal. It opens like an iris when the capsule stands still in a zone.
// From outside, the inside of the capsule can only be seen through this circle (stencil mask).
function door() {
  const zf = -CAPSULE.RADIUS * APO, R = DOOR.R, CY = DOOR.CY;
  const group = new THREE.Group();
  // Heavy dark ring, a thin light ring and small amber marks around it.
  const frame = new Builder(910);
  frame.add(G.torus(R + 0.07, 0.07, 6, 48), 0x171a1e, { pos: [0, CY, zf] });
  const frameMesh = frame.mesh(CAB.clone());   // own copies: the door frame stays visible outside
  const light = new Builder(911);
  light.add(G.torus(R + 0.005, 0.012, 3, 64), LIGHT, { pos: [0, CY, zf - 0.02] });
  light.add(G.torus(R + 0.005, 0.012, 3, 64), LIGHT, { pos: [0, CY, zf + 0.02] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    light.add(G.box(0.012, 0.05, 0.01), AMBER, { pos: [Math.cos(a) * (R + 0.11), CY + Math.sin(a) * (R + 0.11), zf + 0.075], rot: [0, 0, a + Math.PI / 2] });
    light.add(G.box(0.012, 0.05, 0.01), AMBER, { pos: [Math.cos(a) * (R + 0.11), CY + Math.sin(a) * (R + 0.11), zf - 0.075], rot: [0, 0, a + Math.PI / 2] });
  }
  const lightMesh = light.mesh(GLO.clone());
  // Iris: a glass disc that shrinks into the ring when the door opens.
  const iris = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({ color: 0xbfe0ea, transparent: true, opacity: 0.16, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  iris.position.set(0, CY, zf + 0.01);
  iris.renderOrder = 6;
  // Sign above the door.
  const { ctx, tex } = canvasTexture(512, 96);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.116), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false, transparent: true }));
  sign.position.set(0, CY + R + 0.2, zf + 0.06);
  let lastSign = null;
  const drawSign = (open) => {
    if (open === lastSign) return; lastSign = open;
    ctx.clearRect(0, 0, 512, 96);
    ctx.fillStyle = 'rgba(13,16,19,0.85)'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = open ? '#ffb36b' : '#5d6669'; ctx.font = `600 44px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    letterSpaced(ctx, open ? 'UDGANG' : 'LUKKET', open ? 150 : 158, 50, 10);
    tex.needsUpdate = true;
  };
  drawSign(false);
  // Invisible hit area: click or point at the door to go out.
  const hit = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
  hit.position.set(0, CY, zf);
  // Stencil mask: marks the circle on screen, so the inside only shows through the door when seen from outside.
  const mask = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide, fog: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }));
  mask.position.set(0, CY, zf - 0.03);
  mask.renderOrder = -100;
  mask.visible = false;
  group.add(frameMesh, lightMesh, iris, sign, hit, mask);
  return {
    group, hit, mask,
    setOpen(k) { iris.scale.setScalar(Math.max(1 - k, 0.001)); iris.visible = k < 0.99; drawSign(k > 0.5); },
  };
}

// Small panel by the door, seen when standing outside: the way back in.
function returnPanel() {
  const { ctx, tex } = canvasTexture(768, 320);
  let last = null;
  // debugLine: the performance meter (?debug=1), also shown out here.
  const draw = (debugLine = '') => {
    if (debugLine === last) return; last = debugLine;
    screenBase(ctx, 'TIDSMASKINEN', 768, 320);
    if (debugLine) { ctx.fillStyle = '#7fb8b4'; ctx.font = `20px ui-monospace, Consolas, monospace`; ctx.fillText(debugLine, 40, 84); }
    ctx.fillStyle = '#b9c4c7'; ctx.font = `28px ${FONT}`;
    wrapText(ctx, 'Peg på et spor, og tryk for at scanne det.', 40, debugLine ? 130 : 110, 690, 36);
    drawButtons(ctx, [{ label: '↩ Tilbage til kapslen', state: 'go', x: 40, y: 180, w: 688, h: 96, font: 34 }]);
    tex.needsUpdate = true;
  };
  draw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.3), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  m.userData.draw = draw;
  m.position.set(1.45, 1.1, -CAPSULE.RADIUS * APO - 0.35);
  m.rotation.set(0.25, Math.PI + 0.45, 0, 'YXZ');
  m.visible = false;
  return m;
}

export function buildCapsule({ mapDrawer = () => {} } = {}) {
  const vehicle = new THREE.Group();
  const interior = new THREE.Group();   // hidden while the user is outside (the capsule is in stealth)
  const { shell, glow, glass } = cabinShell();
  interior.add(shell, glow, glass);
  const core = halo();
  interior.add(core.group);
  const screens = panels(mapDrawer);
  interior.add(screens.group);
  const d = door();
  const back = returnPanel();
  const mist = mistShell();
  vehicle.add(interior, d.group, back, mist);
  const rig = new THREE.Group();
  vehicle.add(rig);
  const base = new THREE.Color(LIGHT), hot = new THREE.Color(0xffffff);
  const interiorMats = new Set();
  interior.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => interiorMats.add(m)); });
  return {
    vehicle, rig, mist, panels: screens, door: d, returnPanel: back,
    // Outside, the capsule is in stealth: the inside shows only through the round door.
    setOutside(on) {
      back.visible = on;
      d.mask.visible = on;
      for (const m of interiorMats) {
        m.stencilWrite = on; m.stencilRef = 1;
        m.stencilFunc = on ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc;
        m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
      }
    },
    animateCore(t, speedUp) {
      core.top.scale.setScalar(1 + speedUp * 0.08 * Math.sin(t * 3));
      core.mat.color.copy(base).lerp(hot, speedUp).multiplyScalar(1 + speedUp * 1.5);
    },
  };
}

// Start place (1-10) on the floor inside, or the spot outside the door. walk = desktop walking offset.
export function placeRig(rig, seat, walk = { x: 0, z: 0 }, outside = null) {
  const p = outside || seatPosition(seat);
  rig.position.set(p.x + walk.x, 0, p.z + walk.z);
}
