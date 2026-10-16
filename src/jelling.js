// Jelling around 968: village, palisade, mounds, ship setting, church, runestones and the people.
import * as THREE from 'three';
import { Builder, G, MAT, rng, paint, canvasTexture, outline, thickOutline } from './toon.js';
import { groundHeight } from './world.js';
import { staticShadows, blob } from './shadows.js';
import { prop, instanced, texturedProp, parts } from './models.js';

const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Layout (x east, z south). Distances compressed so everything fits a 3-minute trip.
export const SITES = {
  northMound: { x: 0, z: -64, r: 24, h: 8.5 },
  southMound: { x: -2, z: 46, r: 17, top: 10, h: 1.9 },
  church: { x: 0, z: -28 },
  stone: { x: 0, z: -14 },
  palisadeX: -47, gate: [13, 27],
};

export function southMoundHeight(x, z) {
  const m = SITES.southMound, r = Math.hypot(x - m.x, z - m.z);
  if (r >= m.r) return 0;
  if (r <= m.top) return m.h;
  return m.h * (m.r - r) / (m.r - m.top);
}

// Areas where grass and flowers must not grow.
export function occupied(x, z) {
  const n = SITES.northMound, s = SITES.southMound;
  if (Math.hypot(x - n.x, z - n.z) < n.r + 1) return true;
  if (Math.hypot(x - s.x, z - s.z) < s.r + 1) return true;
  if (Math.abs(x - SITES.palisadeX) < 1.5) return true;
  if (x > -108 && x < -84 && z > -5 && z < 5) return true;
  if (x > -90 && x < -66 && z > 34 && z < 42) return true;
  return false;
}

function place(obj, x, z, yaw = 0, lift = 0) {
  obj.position.set(x, groundHeight(x, z) + lift, z);
  obj.rotation.y = yaw;
  return obj;
}

// Viking longhouse with bowed walls and a curved roof ridge. Long axis = x.
function longhouse(L, W, seed) {
  const b = new Builder(seed);
  const n = 10, wall = 2.0, ridge = 5.2;
  const pos = [], idx = [];
  const ring = (s) => {
    const k = 1 - 0.22 * (2 * s - 1) ** 2;
    return { x: -L / 2 + s * L, w: (W / 2) * k, r: ridge - 0.5 * (2 * s - 1) ** 2 };
  };
  // Walls (vertical planks feel via per-face color variation).
  const wallGeo = new THREE.BufferGeometry(), roofGeo = new THREE.BufferGeometry();
  const wp = [], rp = [];
  for (let i = 0; i < n; i++) {
    const a = ring(i / n), c = ring((i + 1) / n);
    for (const side of [-1, 1]) {
      const A = [a.x, 0, side * a.w], B = [c.x, 0, side * c.w], C = [c.x, wall, side * c.w], D = [a.x, wall, side * a.w];
      if (side > 0) wp.push(...A, ...B, ...C, ...A, ...C, ...D); else wp.push(...A, ...C, ...B, ...A, ...D, ...C);
      const E = [a.x, wall - 0.15, side * (a.w + 0.6)], F = [c.x, wall - 0.15, side * (c.w + 0.6)];
      const RA = [a.x, a.r, 0], RC = [c.x, c.r, 0];
      if (side > 0) rp.push(...E, ...F, ...RC, ...E, ...RC, ...RA); else rp.push(...E, ...RC, ...F, ...E, ...RA, ...RC);
    }
  }
  // Gable ends: wall triangles + hipped roof ends.
  for (const s of [0, 1]) {
    const e = ring(s), dir = s === 0 ? -1 : 1;
    const l = [e.x, 0, -e.w], r = [e.x, 0, e.w], lt = [e.x, wall, -e.w], rt = [e.x, wall, e.w];
    if (dir < 0) wp.push(...l, ...r, ...rt, ...l, ...rt, ...lt); else wp.push(...l, ...rt, ...r, ...l, ...lt, ...rt);
    const tip = [e.x + dir * 0.9, wall - 0.15, 0], top = [e.x, e.r, 0];
    const El = [e.x, wall - 0.15, -(e.w + 0.6)], Er = [e.x, wall - 0.15, e.w + 0.6];
    if (dir < 0) rp.push(...El, ...tip, ...top, ...tip, ...Er, ...top); else rp.push(...El, ...top, ...tip, ...tip, ...top, ...Er);
  }
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  b.add(wallGeo, 0x8b6440, { vary: 0.12 });
  b.add(roofGeo, 0xbfa063, { vary: 0.08 });
  // Doors on both long sides, smoke hole frame.
  b.add(G.box(1.2, 1.7, 0.2), 0x3d2a1a, { pos: [-L * 0.15, 0.85, W / 2 * 0.93] });
  b.add(G.box(1.2, 1.7, 0.2), 0x3d2a1a, { pos: [L * 0.2, 0.85, -W / 2 * 0.93] });
  b.add(G.box(0.9, 0.3, 0.9), 0x5a4128, { pos: [0, ridge + 0.05, 0] });
  // Slanted outer posts typical for the period.
  for (let i = 1; i < n; i += 2) {
    const a = ring(i / n);
    for (const side of [-1, 1]) b.add(G.box(0.2, 2.3, 0.2), 0x5e4027, { pos: [a.x, 1.0, side * (a.w + 0.55)], rot: [side * -0.3, 0, 0] });
  }
  // Crossed gable boards and a darker ridge cap.
  for (const s of [0, 1]) {
    const e = ring(s), dir = s === 0 ? -1 : 1;
    for (const z of [-0.5, 0.5]) b.add(G.box(0.12, 1.6, 0.1), 0x4a3220, { pos: [e.x + dir * 0.55, e.r + 0.25, z * 0.5], rot: [z * 1.4, 0, 0] });
  }
  for (let i = 0; i < n; i++) { const a = ring((i + 0.5) / n); b.add(G.box(L / n + 0.05, 0.22, 0.6), 0x8a7440, { pos: [a.x, a.r + 0.02, 0] }); }
  const mesh = b.mesh();
  outline(mesh, OUT_BIG);
  return mesh;
}

const OUT_BIG = thickOutline(0.06), OUT_MED = thickOutline(0.03);

function pitHouse(seed) {
  const b = new Builder(seed);
  b.add(G.box(4, 0.8, 3.2), 0x7a5a38, { pos: [0, 0.4, 0], vary: 0.1 });
  b.add(G.cyl(0, 3.0, 2.4, 4), 0xb59a5c, { pos: [0, 2.0, 0], rot: [0, Math.PI / 4, 0], scale: [1.3, 1, 1], vary: 0.08 });
  b.add(G.box(0.9, 1.0, 0.2), 0x3d2a1a, { pos: [0, 0.6, 1.62] });
  const mesh = b.mesh();
  outline(mesh, OUT_BIG);
  return mesh;
}

function loom() {
  const b = new Builder(31);
  b.add(G.box(0.1, 2.0, 0.1), 0x6b4a2e, { pos: [-0.8, 1.0, 0], rot: [-0.25, 0, 0] });
  b.add(G.box(0.1, 2.0, 0.1), 0x6b4a2e, { pos: [0.8, 1.0, 0], rot: [-0.25, 0, 0] });
  b.add(G.box(1.8, 0.1, 0.1), 0x6b4a2e, { pos: [0, 1.95, -0.24] });
  b.add(G.box(1.5, 1.3, 0.02), 0xb8423a, { pos: [0, 1.25, -0.08], rot: [-0.25, 0, 0], vary: 0.1 });
  b.add(G.box(1.5, 0.4, 0.02), 0xe8dcc0, { pos: [0, 0.45, 0.13], rot: [-0.25, 0, 0] });
  for (let i = 0; i < 7; i++) b.add(G.ball(0.07, 0), 0x8a857a, { pos: [-0.65 + i * 0.22, 0.25, 0.18] });
  return b.mesh();
}

function woodpile(seed) {
  const b = new Builder(seed);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++)
    b.add(G.cyl(0.14, 0.14, 1.4, 6), 0x9b7046, { pos: [-0.75 + i * 0.3 + r * 0.15, 0.14 + r * 0.25, 0], rot: [Math.PI / 2, 0, 0], vary: 0.1 });
  b.add(G.cyl(0.3, 0.32, 0.45, 8), 0x7a5532, { pos: [1.6, 0.22, 0.4] });
  return b.mesh();
}

function firePit() {
  const b = new Builder(41);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(G.dodeca(0.18), 0x7d7a74, { pos: [Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6] }); }
  b.add(G.box(0.06, 1.3, 0.06), 0x4a3322, { pos: [-0.7, 0.65, 0] });
  b.add(G.box(0.06, 1.3, 0.06), 0x4a3322, { pos: [0.7, 0.65, 0] });
  b.add(G.box(1.5, 0.05, 0.05), 0x4a3322, { pos: [0, 1.28, 0] });
  b.add(G.cyl(0.25, 0.2, 0.35, 8), 0x2b2b2b, { pos: [0, 0.75, 0] });
  const pit = b.mesh();
  const flame = new Builder(42);
  flame.add(G.cone(0.3, 0.6, 5), 0xff9a2e, { pos: [0, 0.3, 0] });
  flame.add(G.cone(0.18, 0.45, 5), 0xffe066, { pos: [0, 0.25, 0] });
  const f = new THREE.Mesh(flame.geometry(), MAT.glow.clone());
  f.material.fog = true;
  pit.add(f);
  pit.flame = f;
  return pit;
}

function fenceRing(cx, cz, r, rand) {
  const b = new Builder(51);
  const n = Math.round((Math.PI * 2 * r) / 1.2);
  for (let i = 0; i < n; i++) {
    if (i === 0) continue; // opening
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    b.add(G.box(0.12, 1.1, 0.12), 0x6b4a2e, { pos: [x, 0.55, z] });
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const len = 2 * r * Math.sin(Math.PI / n);
    for (const y of [0.45, 0.85])
      b.add(G.box(len, 0.07, 0.05), 0x8a6a45, { pos: [(x + Math.cos(a2) * r) / 2, y, (z + Math.sin(a2) * r) / 2], rot: [0, -(a + a2) / 2 + Math.PI / 2, 0] });
  }
  return place(b.mesh(), cx, cz);
}

function palisade() {
  const post = new Builder(61);
  post.add(G.box(0.38, 4.0, 0.34), 0x6e5133, { pos: [0, 2.0, 0], vary: 0.1 });
  post.add(G.cone(0.26, 0.5, 4), 0x6e5133, { pos: [0, 4.25, 0], rot: [0, Math.PI / 4, 0] });
  const geo = post.geometry();
  const spots = [];
  for (let z = -110; z <= 110; z += 0.4) if (z < SITES.gate[0] || z > SITES.gate[1]) spots.push(z);
  const mesh = new THREE.InstancedMesh(geo, MAT.world, spots.length);
  const m = new THREE.Matrix4(), c = new THREE.Color(), r = rng(62);
  spots.forEach((z, i) => {
    const x = SITES.palisadeX + Math.sin(z * 0.9) * 0.05;
    m.makeScale(1, 0.92 + r() * 0.16, 1).setPosition(x, groundHeight(x, z) - 0.2, z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setScalar(0.85 + r() * 0.25));
  });
  const g = new THREE.Group();
  g.add(mesh);
  // Gate posts and lintel.
  const gate = new Builder(63);
  for (const z of SITES.gate) gate.add(G.box(0.6, 5.6, 0.6), 0x5a4128, { pos: [0, 2.6, z] });
  gate.add(G.box(0.7, 0.6, SITES.gate[1] - SITES.gate[0] + 1), 0x5a4128, { pos: [0, 5.5, (SITES.gate[0] + SITES.gate[1]) / 2] });
  g.add(place(gate.mesh(), SITES.palisadeX, 0));
  return g;
}

function mounds(extras = true) {
  const g = new THREE.Group();
  const n = SITES.northMound;
  const prof = [new THREE.Vector2(n.r + 0.6, -0.5)];
  for (let i = 8; i >= 0; i--) { const a = i / 8; prof.push(new THREE.Vector2(n.r * Math.sin(a * Math.PI / 2) ** 0.9, n.h * Math.cos(a * Math.PI / 2))); }
  const north = paint(new THREE.LatheGeometry(prof, 18), 0x6f9a42, { vary: 0.06, rand: rng(71) });
  const nm = new THREE.Mesh(north, MAT.world);
  g.add(place(nm, n.x, n.z, 0, -0.3));

  const s = SITES.southMound;
  const sp = [new THREE.Vector2(s.r + 0.5, -0.4), new THREE.Vector2(s.r, 0), new THREE.Vector2(s.top + (s.r - s.top) * 0.5, s.h * 0.5), new THREE.Vector2(s.top, s.h), new THREE.Vector2(0, s.h)];
  const south = paint(new THREE.LatheGeometry(sp, 18), 0x7a6a3c, { vary: 0.12, rand: rng(72) });
  // Darker fresh earth on top, greener turf on the sides: color by height.
  const pos = south.attributes.position, col = south.attributes.color, c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    c.set(y > s.h - 0.05 ? 0x6e5236 : 0x6c8a3e).multiplyScalar(0.92 + ((i * 7919) % 13) / 100);
    for (let j = 0; j < 3; j++) col.setXYZ(i + j, c.r, c.g, c.b);
  }
  g.add(place(new THREE.Mesh(south, MAT.world), s.x, s.z, 0, -0.3));

  if (extras) {
  // Turf stacks near the foot of the south mound.
  const turf = new Builder(73);
  const r = rng(74);
  for (let k = 0; k < 3; k++) for (let y = 0; y < 3; y++) for (let i = 0; i < 4; i++)
    turf.add(G.box(0.55, 0.16, 0.4), y === 2 ? 0x5e8a38 : 0x6b4f33, { pos: [k * 1.5 + i * 0.05, 0.08 + y * 0.17, i * 0.42], rot: [0, (r() - 0.5) * 0.2, 0] });
  g.add(place(turf.mesh(), -29, 35));
  // Ox cart with turf.
  const cart = new Builder(75);
  cart.add(G.box(1.4, 0.15, 2.2), 0x7a5532, { pos: [0, 0.75, 0] });
  for (const x of [-0.75, 0.75]) cart.add(G.cyl(0.5, 0.5, 0.1, 10), 0x5a4128, { pos: [x, 0.5, 0.2], rot: [0, 0, Math.PI / 2] });
  cart.add(G.box(0.1, 0.1, 2.0), 0x7a5532, { pos: [0, 0.7, 2.0] });
  for (let i = 0; i < 6; i++) cart.add(G.box(0.5, 0.15, 0.38), 0x5e7a36, { pos: [-0.3 + (i % 2) * 0.6, 0.92, -0.6 + Math.floor(i / 2) * 0.5] });
  g.add(place(cart.mesh(), -33, 40, 0.4));
  }
  return g;
}

// Ship setting: two curved rows of standing stones, center at the north mound.
function shipSetting(route, shadows, M = {}) {
  const nearRoute = (x, z) => route.some((p) => Math.hypot(p.x - x, p.z - z) < 4);
  const n = SITES.northMound;
  const half = 130, W = 30;
  const spots = [];
  for (let k = -half; k <= half; k += 3.6) {
    const w = W * (1 - (k / half) ** 2);
    for (const side of [-1, 1]) {
      const x = n.x + side * w, z = n.z + k;
      if (Math.hypot(x - n.x, z - n.z) < n.r + 1) continue;
      const s = SITES.southMound; if (Math.hypot(x - s.x, z - s.z) < s.r - 1) continue;
      if (z < -150 || nearRoute(x, z)) continue;
      spots.push([x, z]);
    }
  }
  spots.push([n.x, n.z - half], [n.x, n.z + half]);
  if (M.c3a_sten && M.c3b_sten && M.c3c_sten && M.c3d_sten) {
    // Four stone shapes; the tall one (d) also marks the stem and stern.
    const r = rng(82), keys = ['c3a_sten', 'c3b_sten', 'c3c_sten', 'c3d_sten'], lists = [[], [], [], []];
    spots.forEach(([x, z]) => {
      const end = Math.abs(z - n.z) > half - 8, v = end ? 3 : Math.floor(r() * 4);
      lists[v].push({ x, z, y: groundHeight(x, z) - 0.08, yaw: Math.atan2(x - n.x, 0) + (r() - 0.5) * 0.5, s: end ? 1.3 : 0.9 + r() * 0.25 });
      shadows.push([x, groundHeight(x, z), z, 2.2, 2.2, 0, 1.6]);
    });
    const g = new THREE.Group();
    lists.forEach((l, i) => { if (l.length) g.add(instanced(M[keys[i]], l)); });
    return g;
  }
  const geo = paint(G.dodeca(0.6), 0x8e8a82, { scale: [1, 2.2, 0.75], pos: [0, 0.8, 0], vary: 0.08, rand: rng(81) });
  const mesh = new THREE.InstancedMesh(geo, MAT.world, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Color(), r = rng(82);
  spots.forEach(([x, z], i) => {
    const big = Math.abs(z - n.z) > half - 8 ? 1.7 : 1;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 0.6 - 0.3);
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 0.15, z), q, sc.set(big * (0.8 + r() * 0.4), big * (0.75 + r() * 0.5), big));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setScalar(0.85 + r() * 0.3));
    shadows.push([x, groundHeight(x, z), z, 2.2 * big, 2.2 * big, 0, 1.6 * big]);
  });
  return mesh;
}

function church() {
  const b = new Builder(91);
  const L = 10, W = 6, H = 3.6;
  b.add(G.box(W, H, L), 0x4a3424, { pos: [0, H / 2, 0], vary: 0.1 });
  // Steep roof as a stretched triangular prism.
  const roof = new THREE.CylinderGeometry(1, 1, L + 0.8, 3);
  b.add(roof, 0x2f241c, { pos: [0, H + 1.35, 0], rot: [-Math.PI / 2, 0, 0], scale: [W * 0.62, 1, 2.9], vary: 0.06 });
  b.add(G.box(4, 3, 3.6), 0x4a3424, { pos: [0, 1.5, -L / 2 - 1.8], vary: 0.1 });
  b.add(new THREE.CylinderGeometry(1, 1, 4.2, 3), 0x2f241c, { pos: [0, 3 + 1.0, -L / 2 - 1.8], rot: [-Math.PI / 2, 0, 0], scale: [2.5, 1, 2.1] });
  b.add(G.box(1.5, 2.4, 0.3), 0x24180f, { pos: [0, 1.2, L / 2 + 0.05] });
  b.add(G.box(0.2, 1.6, 0.2), 0xd9b44a, { pos: [0, H + 3.4, L / 2 + 0.3] });
  b.add(G.box(0.9, 0.2, 0.2), 0xd9b44a, { pos: [0, H + 3.6, L / 2 + 0.3] });
  // Dragon-head gable ornaments.
  for (const z of [L / 2 + 0.4, -L / 2 - 0.4]) {
    const d = z > 0 ? 1 : -1;
    b.add(G.cone(0.2, 0.9, 4), 0x2f241c, { pos: [0, H + 2.6, z], rot: [d * 0.6, 0, 0] });
    b.add(G.box(0.18, 0.18, 0.5), 0x2f241c, { pos: [0, H + 3.05, z + d * 0.35], rot: [d * -0.4, 0, 0] });
    b.add(G.ball(0.05, 0), 0xd9b44a, { pos: [0, H + 3.12, z + d * 0.55] });
  }
  // Shingle rows on the roof.
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) b.add(G.box(0.05, 0.08, L + 0.8), 0x241b14, { pos: [s * (0.55 + i * 0.48), H + 2.65 - i * 0.48 * 1.42, 0], rot: [0, 0, s * -0.95] });
  const mesh = b.mesh();
  outline(mesh, OUT_BIG);
  return place(mesh, SITES.church.x, SITES.church.z);
}

// Runic letters drawn as strokes in a 0.5 x 1 box.
const RUNES = {
  a: [[[.25, 0], [.25, 1]], [[.08, .38], [.42, .62]]],
  n: [[[.25, 0], [.25, 1]], [[.08, .62], [.42, .38]]],
  b: [[[.1, 0], [.1, 1]], [[.1, 0], [.4, .25], [.1, .5], [.4, .75], [.1, 1]]],
  t: [[[.25, 0], [.25, 1]], [[.05, .3], [.25, 0], [.45, .3]]],
  f: [[[.1, 0], [.1, 1]], [[.1, .35], [.45, .05]], [[.1, .62], [.45, .32]]],
  k: [[[.15, 0], [.15, 1]], [[.15, .35], [.45, .05]]],
  h: [[[.25, 0], [.25, 1]], [[.05, .2], [.45, .6]], [[.45, .2], [.05, .6]]],
  i: [[[.25, 0], [.25, 1]]],
  l: [[[.15, 0], [.15, 1]], [[.15, 0], [.45, .3]]],
  m: [[[.25, 0], [.25, 1]], [[.25, .3], [.05, .05]], [[.25, .3], [.45, .05]]],
  o: [[[.25, 0], [.25, 1]], [[.25, .3], [.05, .5]]],
  r: [[[.1, 0], [.1, 1]], [[.1, 0], [.42, .22], [.1, .45], [.42, 1]]],
  R: [[[.25, 0], [.25, 1]], [[.25, .7], [.05, .95]], [[.25, .7], [.45, .95]]],
  s: [[[.1, .05], [.1, .4], [.4, .6], [.4, .95]]],
  þ: [[[.1, 0], [.1, 1]], [[.1, .25], [.4, .45], [.1, .65]]],
  u: [[[.1, 1], [.1, 0], [.4, .3], [.4, 1]]],
};
// Turn of the runestone model so its rune face (side A) looks at the capsule's stop.
const RUNE_FACE_YAW = -2 * Math.PI / 3;
const RUNE_LINES = ['haraltr:kunukR:baþ:kaurua', 'kubl:þausi:aft:kurm', 'faþur:sin:auk:aft:þourui', 'muþur:sina:sa:haraltr:ias'];

function runeTexture() {
  const { ctx, tex, canvas } = canvasTexture(512, 1024);
  ctx.fillStyle = '#b8b2a6'; ctx.fillRect(0, 0, 512, 1024);
  const r = rng(101);
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(${90 + r() * 60},${90 + r() * 50},${80 + r() * 40},0.18)`; ctx.beginPath(); ctx.arc(r() * 512, r() * 1024, 4 + r() * 18, 0, 7); ctx.fill(); }
  // Painted serpent ribbon around the inscription (the stone was originally painted).
  ctx.lineWidth = 16; ctx.strokeStyle = '#1f3f8a';
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = i / 200, per = 2 * (440 + 900);
    let d = t * per, x, y;
    if (d < 440) { x = 36 + d; y = 70; } else if ((d -= 440) < 900) { x = 476; y = 70 + d; } else if ((d -= 900) < 440) { x = 476 - d; y = 970; } else { d -= 440; x = 36; y = 970 - d; }
    const w = Math.sin(t * Math.PI * 46) * 9;
    const X = x + (x === 36 ? w : x === 476 ? -w : 0), Y = y + (y === 70 ? w : y === 970 ? -w : 0);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#c23b2e'; ctx.stroke();
  ctx.fillStyle = '#c23b2e'; ctx.beginPath(); ctx.ellipse(60, 990, 26, 16, -0.4, 0, 7); ctx.fill();
  const top = 120, lineH = 190;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  RUNE_LINES.forEach((line, li) => {
    const y0 = top + li * lineH;
    ctx.fillStyle = '#c23b2e'; ctx.fillRect(28, y0 - 14, 456, 8); ctx.fillRect(28, y0 + 150, 456, 8);
    const chars = [...line], w = 440 / chars.length;
    chars.forEach((ch, i) => {
      const x0 = 36 + i * w;
      ctx.strokeStyle = li % 2 ? '#1f3f8a' : '#1b1b1b';
      ctx.lineWidth = 9;
      if (ch === ':') { ctx.fillStyle = ctx.strokeStyle; for (const y of [0.35, 0.65]) { ctx.beginPath(); ctx.arc(x0 + w * 0.5, y0 + y * 130, 5, 0, 7); ctx.fill(); } return; }
      for (const stroke of RUNES[ch] || []) {
        ctx.beginPath();
        stroke.forEach(([sx, sy], k) => { const X = x0 + sx * w * 1.6, Y = y0 + sy * 130; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke();
      }
    });
  });
  tex.needsUpdate = true;
  canvas.dataset.kind = 'runes';
  return tex;
}

function runestones(M = {}) {
  const g = new THREE.Group();
  const s = SITES.stone;
  if (M.d1_runesten) {
    const big = texturedProp(M.d1_runesten);
    big.rotation.y = RUNE_FACE_YAW;
    g.add(big);
    if (M.d2_gormsten) { const small = texturedProp(M.d2_gormsten); small.position.set(3, 0, -2.5); small.rotation.y = 0.4; g.add(small); }
    const chips = new Builder(104), rr = rng(105);
    for (let i = 0; i < 18; i++) chips.add(G.dodeca(0.05 + rr() * 0.05), 0xb0aa9f, { pos: [(rr() - 0.5) * 1.6, 0.03, 0.9 + rr() * 0.9] });
    g.add(chips.mesh());
    return place(g, s.x, s.z, Math.atan2(-5, 5));
  }
  // Harald's stone: three-sided, slightly leaning, ~2.4 m tall.
  const shape = new THREE.CylinderGeometry(0.55, 0.9, 2.45, 3, 1);
  const stone = new THREE.Mesh(paint(shape, 0xa8a196, { pos: [0, 1.2, 0], vary: 0.05, rand: rng(102) }), MAT.world);
  outline(stone, OUT_MED);
  g.add(stone);
  // Inscription face: one side of the triangle, facing local +z after rotation.
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.3), new THREE.MeshToonMaterial({ map: runeTexture() }));
  // Cylinder with 3 radial segments: a face normal points to angle 60deg from +x... rotate stone so one face points to +z.
  stone.rotation.y = Math.PI / 3;
  const apothemBottom = 0.9 * 0.5, apothemTop = 0.55 * 0.5;
  face.position.set(0, 1.2, (apothemBottom + apothemTop) / 2 + 0.02);
  const tilt = Math.atan2(apothemBottom - apothemTop, 2.45);
  face.rotation.x = -tilt;
  // Make the face trapezoid match the tapering stone.
  const fp = face.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i), k = 0.78 + (0.5 - (y + 1.15) / 2.3) * 0.5; fp.setX(i, fp.getX(i) * k * 1.3); }
  g.add(face);
  // Small stone (Gorm's stone for Thyra).
  const small = new THREE.Mesh(paint(G.dodeca(0.5), 0x8f8a80, { pos: [0, 0.7, 0], scale: [0.9, 1.6, 0.5], rand: rng(103) }), MAT.world);
  small.position.set(3, 0, -2.5);
  g.add(small);
  // Stone chips on the ground.
  const chips = new Builder(104), r = rng(105);
  for (let i = 0; i < 18; i++) chips.add(G.dodeca(0.05 + r() * 0.05), 0xb0aa9f, { pos: [(r() - 0.5) * 1.6, 0.03, 0.7 + r() * 0.9] });
  g.add(chips.mesh());
  // Face the inscription toward the capsule's stop (south-west).
  const yaw = Math.atan2(-5, 5); // direction (-x, +z) from the stone
  return place(g, s.x, s.z, yaw);
}

// ---------------------------------------------------------------------------
// Actors and their animation. Each actor: { update(t) }.

const SMOKE_TEX = (() => {
  const { ctx, tex } = canvasTexture(64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(240,240,236,0.45)'); g.addColorStop(1, 'rgba(240,240,236,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  tex.needsUpdate = true;
  return tex;
})();

function smoke(x, y, z, seed) {
  const group = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: SMOKE_TEX, color: 0xb9b6b0, transparent: true, depthWrite: false }));
    group.add(m); puffs.push(m);
  }
  group.position.set(x, y, z);
  return {
    group,
    update(t) {
      puffs.forEach((m, i) => {
        const p = (t * 0.09 + i / 7 + seed * 0.13) % 1;
        m.position.set(p * 3.5 + Math.sin(t * 0.4 + i) * 0.3, p * 9, p * 1.2);
        m.scale.setScalar(0.8 + p * 3.2);
        m.material.opacity = 0.75 * smooth(p / 0.12) * (1 - smooth((p - 0.45) / 0.55));
        m.material.rotation = i + t * 0.1;
      });
    },
  };
}

// Village props: barrels, a well, a fish-drying rack, benches.
function props() {
  const b = new Builder(700);
  const barrel = (x, z) => {
    const y = groundHeight(x, z);
    b.add(new THREE.LatheGeometry([[0.25, 0], [0.3, 0.35], [0.25, 0.7]].map(([r, h]) => new THREE.Vector2(r, h)), 10), 0x7a5532, { pos: [x, y, z], vary: 0.08 });
    for (const h of [0.12, 0.58]) b.add(G.torus(0.275, 0.018, 3, 10), 0x3a3a38, { pos: [x, y + h, z], rot: [Math.PI / 2, 0, 0] });
    b.add(G.cyl(0.24, 0.24, 0.02, 10), 0x5a3e22, { pos: [x, y + 0.7, z] });
  };
  [[-89, 4.6], [-88.4, 5.3], [-81, 34], [-74.5, 34.4], [-103, 4.8]].forEach(([x, z]) => barrel(x, z));
  // Well.
  const wx = -96, wz = 32, wy = groundHeight(wx, wz);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.add(G.dodeca(0.28), 0x8a857a, { pos: [wx + Math.cos(a) * 0.75, wy + 0.25, wz + Math.sin(a) * 0.75], vary: 0.1 }); }
  for (const s of [-1, 1]) b.add(G.box(0.12, 1.8, 0.12), 0x5e4027, { pos: [wx + s * 0.9, wy + 0.9, wz] });
  b.add(G.cyl(0.06, 0.06, 2.0, 6), 0x7a5532, { pos: [wx, wy + 1.6, wz], rot: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.14, 0.12, 0.25, 8), 0x6b4a2e, { pos: [wx + 0.2, wy + 1.05, wz] });
  // Fish-drying rack.
  const fx = -100, fz = 9, fy = groundHeight(fx, fz);
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.add(G.box(0.08, 1.9, 0.08), 0x5e4027, { pos: [fx + s * 1.5, fy + 0.9, fz + t * 0.4], rot: [t * 0.2, 0, 0] });
  b.add(G.box(3.2, 0.06, 0.06), 0x5e4027, { pos: [fx, fy + 1.75, fz] });
  for (let i = 0; i < 9; i++) b.add(G.cone(0.07, 0.5, 4), 0xb8b0a0, { pos: [fx - 1.3 + i * 0.32, fy + 1.45, fz], rot: [Math.PI, 0, 0], scale: [1, 1, 0.4] });
  // Benches.
  for (const [x, z, yaw] of [[-84, 9.5, 0.2], [-73, 32, -0.1]]) {
    const y = groundHeight(x, z);
    b.add(G.box(1.6, 0.08, 0.35), 0x7a5532, { pos: [x, y + 0.45, z], rot: [0, yaw, 0] });
    for (const s of [-0.6, 0.6]) b.add(G.box(0.1, 0.45, 0.3), 0x5e4027, { pos: [x + Math.cos(yaw) * s, y + 0.22, z - Math.sin(yaw) * s], rot: [0, yaw, 0] });
  }
  const mesh = b.mesh();
  outline(mesh, OUT_MED);
  return mesh;
}

// Hoof prints in a muddy patch (one textured decal on the ground).
function hoofPrints(x, z, yaw) {
  const { ctx, tex } = canvasTexture(512, 512);
  const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  g.addColorStop(0, 'rgba(92,70,46,0.95)'); g.addColorStop(0.7, 'rgba(98,76,50,0.75)'); g.addColorStop(1, 'rgba(98,76,50,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  const r = rng(707);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(${70 + r() * 30},${52 + r() * 20},${34 + r() * 14},0.35)`; ctx.beginPath(); ctx.arc(r() * 512, r() * 512, 6 + r() * 24, 0, 7); ctx.fill(); }
  // Two tracks of U-shaped hoof prints crossing the mud.
  ctx.strokeStyle = 'rgba(40,28,18,0.9)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const px = 256 + side * 34 + Math.sin(i * 0.7) * 10, py = 470 - i * 50 - (side > 0 ? 24 : 0);
    ctx.beginPath(); ctx.arc(px, py, 16, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
  }
  tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 1;
  m.position.set(x, groundHeight(x, z) + 0.03, z);
  m.rotation.y = yaw;
  return m;
}

// A silver coin with a strange inscription, lying on the bench (scannable).
function silverCoin() {
  const { ctx, tex } = canvasTexture(256, 256);
  ctx.fillStyle = '#c9ccd0'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8d9196'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(128, 128, 70, 0, 7); ctx.stroke();
  // Unfamiliar script: flowing strokes in rings.
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  const r = rng(808);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, R = 90;
    ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * R, 128 + Math.sin(a) * R);
    ctx.quadraticCurveTo(128 + Math.cos(a + 0.08) * (R + 12 * r()), 128 + Math.sin(a + 0.08) * (R - 10), 128 + Math.cos(a + 0.18) * R, 128 + Math.sin(a + 0.18) * R);
    ctx.stroke();
  }
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(84, 100 + k * 28); ctx.bezierCurveTo(110, 86 + k * 28, 140, 118 + k * 28, 172, 96 + k * 28); ctx.stroke(); }
  tex.needsUpdate = true;
  const face = new THREE.MeshToonMaterial({ map: tex, gradientMap: MAT.world.gradientMap });
  const rim = new THREE.MeshToonMaterial({ color: 0xa9adb2, gradientMap: MAT.world.gradientMap });
  // The coin is a bit larger than life (6 cm) so it can be seen and pointed at in VR.
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 20), [rim, face, face]);
  coin.rotation.z = 0.06;
  coin.userData.materials = [rim, face];
  return coin;
}

export function buildJelling(scene, timeline, models = {}) {
  const M = models;
  const group = new THREE.Group();
  const actors = [];
  const shadows = [];
  const scannables = [];
  const r = rng(200);
  // Zones: only the zones a stop can see are shown and animated. 'always' stays visible.
  const zones = { always: new THREE.Group(), village: new THREE.Group(), mounds: new THREE.Group(), stone: new THREE.Group() };
  Object.values(zones).forEach((z) => group.add(z));
  let zone = 'village';
  const add = (...objs) => zones[zone].add(...objs);
  const act = (a) => { a.zone = zone; actors.push(a); };
  const gy = (x, z) => groundHeight(x, z);
  const modelAt = (key, x, z, yaw = 0) => place(prop(M[key]), x, z, yaw);
  const item = (key) => prop(M[key]);
  // Something the hand scanner can scan: the object, a larger invisible hit volume, and its id in the data file.
  const scannable = (id, object, hitRadius) => {
    const hit = new THREE.Mesh(new THREE.SphereGeometry(hitRadius, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    object.add(hit);
    scannables.push({ id, object, hit, zone });
  };

  // --- Village: recently left. Smoke still rises, the axe sits in the block, the weave is unfinished.
  if (M.b1_langhus) add(modelAt('b1_langhus', -96, 0, Math.PI / 2)); else add(place(longhouse(22, 7.2, 301), -96, 0));
  if (M.b2_langhus_lille) add(modelAt('b2_langhus_lille', -78, 38, Math.PI / 2 + 0.06)); else add(place(longhouse(18, 6.4, 302), -78, 38, 0.06));
  if (M.b3_grubehus) add(instanced(M.b3_grubehus, [{ x: -110, y: gy(-110, 36), z: 36, yaw: 0.3 }, { x: -64, y: gy(-64, 4), z: 4, yaw: -0.4 }]));
  else { add(place(pitHouse(303), -110, 36, 0.3)); add(place(pitHouse(304), -64, 4, -0.4)); }
  if (M.b5_braende) add(modelAt('b5_braende', -106.5, 30.5, 0.2)); else add(place(woodpile(305), -106, 29, 0.2));
  // Empty sheep pen.
  if (M.b11_hegn) {
    const cx = -122, cz = 2, rad = 7, n = Math.round((Math.PI * 2 * rad) / 2.06), list = [];
    for (let i = 1; i < n; i++) { const a = (i / n) * Math.PI * 2; list.push({ x: cx + Math.cos(a) * rad, y: gy(cx, cz), z: cz + Math.sin(a) * rad, yaw: -a - Math.PI / 2 }); }
    add(instanced(M.b11_hegn, list));
  } else add(fenceRing(-122, 2, 7, r));
  const BENCH = { x: -85.6, z: 10.4, yaw: 0.15 };
  if (M.b7_toende && M.b8_broend && M.b9_fisk && M.b10_baenk) {
    add(instanced(M.b7_toende, [[-89, 4.6], [-88.3, 5.4], [-81, 34], [-74.5, 34.4], [-103, 4.8]].map(([x, z], i) => ({ x, z, y: gy(x, z), yaw: i }))));
    add(modelAt('b8_broend', -96, 32, 0.3));
    if (M.f8_spand) add(place(item('f8_spand'), -95.1, 33.2, 0.5, 0.37));
    add(modelAt('b9_fisk', -100, 9, Math.PI / 2));
    add(instanced(M.b10_baenk, [[BENCH.x, BENCH.z, BENCH.yaw], [-73, 32, -0.1]].map(([x, z, yaw]) => ({ x, z, y: gy(x, z), yaw }))));
  } else add(props());
  // Loom facing east (+x), left half-finished; the spindle lies on the ground in front of it.
  const LOOM = { x: -88.5, z: 8, yaw: Math.PI / 2 };
  add(M.b4_vaev ? modelAt('b4_vaev', LOOM.x, LOOM.z, LOOM.yaw) : place(loom(), LOOM.x, LOOM.z, -Math.PI / 2));
  if (M.f7_ten) { const sp = item('f7_ten'); sp.rotation.set(0, 0.7, Math.PI / 2); add(place(sp, LOOM.x + 0.9, LOOM.z + 0.3, 0, 0.03)); }
  // Fire still burning, smoke rising.
  let flame;
  if (M.b6_ildsted) { const f = parts(M.b6_ildsted); add(place(f.root, -84, 12)); flame = f.parts.flammer; }
  else { const fire = place(firePit(), -84, 12); add(fire); flame = fire.flame; }
  act({ update(t) { flame.scale.set(1 + 0.12 * Math.sin(t * 11), 1 + 0.25 * Math.sin(t * 7.3) + 0.1 * Math.sin(t * 17), 1 + 0.12 * Math.cos(t * 9)); } });
  for (const s of [smoke(-96, 5.4, 0, 1), smoke(-78, 5.1, 38, 2), smoke(-84, 1.0, 12, 3)]) { add(s.group); act(s); }
  // Chopping block with the axe left stuck in it.
  const block = new Builder(306);
  block.add(G.cyl(0.3, 0.33, 0.5, 9), 0x7a5532, { pos: [0, 0.25, 0], vary: 0.06 });
  block.add(G.cyl(0.29, 0.29, 0.02, 9), 0xc9a26e, { pos: [0, 0.505, 0] });
  const chop = place(block.mesh(), -89.6, 12.9, 0.5);
  if (M.f1_oekse) { const axe = item('f1_oekse'); axe.rotation.set(0.75, 0, Math.PI); axe.position.set(0, 0.98, -0.3); chop.add(axe); }
  chop.add(blob(0.8));
  add(chop);
  // The silver coin on the bench near the fire.
  const coin = silverCoin();
  const bx = BENCH.x + Math.cos(BENCH.yaw) * 0.35, bz = BENCH.z - Math.sin(BENCH.yaw) * 0.35;
  add(place(coin, bx, bz, 0.4, 0.475));
  scannable('soelvmoent', coin, 0.14);

  // --- Palisade, mounds, ship setting, church, stones --------------------
  zone = 'always';
  if (M.c1_palisade && M.c2_port) {
    const list = [];
    for (let z = -108; z <= 108; z += 4) if (z + 2 <= SITES.gate[0] || z - 2 >= SITES.gate[1]) list.push({ x: SITES.palisadeX, z, y: gy(SITES.palisadeX, z) - 0.05, yaw: Math.PI / 2 });
    add(instanced(M.c1_palisade, list));
    add(modelAt('c2_port', SITES.palisadeX, (SITES.gate[0] + SITES.gate[1]) / 2, Math.PI / 2));
  } else add(palisade());
  // Hoof prints in the mud just inside the gate.
  add(hoofPrints(SITES.palisadeX + 3.2, 19.5, Math.PI / 2 + 0.2));
  add(mounds(!(M.c5_toervstak && M.c6_kaerre)));
  add(shipSetting(timeline.routePoints(), shadows, M));
  const sh = (x, z, sx, sz, yaw, h) => shadows.push([x, groundHeight(x, z), z, sx, sz, yaw, h]);
  sh(-96, 0, 27, 11, 0, 4); sh(-78, 38, 23, 10, 0.06, 4); sh(-110, 36, 7, 6, 0.3, 2); sh(-64, 4, 7, 6, -0.4, 2);
  sh(SITES.church.x, SITES.church.z - 1, 10, 17, 0, 5); sh(SITES.stone.x, SITES.stone.z, 2.4, 2.4, 0, 2.4);
  for (let z = -110; z <= 110; z += 6) if (z < SITES.gate[0] - 2 || z > SITES.gate[1] + 2) sh(SITES.palisadeX, z, 3.2, 7, 0, 3);
  sh(-29, 35, 6, 3.5, 0, 0.5); sh(-33, 40, 2.6, 3.5, 0.4, 1); sh(-106, 29, 3, 2, 0.2, 0.8);
  add(staticShadows(shadows));
  add(M.d3_kirke ? modelAt('d3_kirke', SITES.church.x, SITES.church.z, 0) : church());
  add(runestones(M));

  // Turf stack and the ox cart, left where the work stopped.
  zone = 'mounds';
  if (M.c5_toervstak && M.c6_kaerre) {
    add(modelAt('c5_toervstak', -29, 35, 0.1));
    add(modelAt('c6_kaerre', -33, 40, 0.4));
  }
  if (M.c4_toerv) for (const [x, z, yaw] of [[-27.4, 33.6, 0.5], [-26.6, 34.4, 1.2]]) add(modelAt('c4_toerv', x, z, yaw));

  // Tools left by the runestone and the church door.
  zone = 'stone';
  const S = SITES.stone, n2 = [-0.7071, 0.7071], tg = [0.7071, 0.7071];
  const near = (dn, dt) => [S.x + n2[0] * dn + tg[0] * dt, S.z + n2[1] * dn + tg[1] * dt];
  if (M.f2_hammer) { const h = item('f2_hammer'); h.rotation.set(0, 0, Math.PI / 2); const [x, z] = near(0.9, 0.6); add(place(h, x, z, 1.1, 0.03)); }
  if (M.f3_mejsel) { const c = item('f3_mejsel'); c.rotation.set(0, 0, Math.PI / 2); const [x, z] = near(1.0, 0.25); add(place(c, x, z, -0.4, 0.012)); }
  if (M.f4_spyd) { const s = item('f4_spyd'); s.rotation.x = -1.37; add(place(s, SITES.church.x + 2.3, SITES.church.z + 7.05, 0, 0.02)); }
  if (M.f5_skjold) { const s = item('f5_skjold'); s.rotation.set(0, -Math.PI / 2, 0); s.rotation.x = -0.15; add(place(s, SITES.church.x - 2.2, SITES.church.z + 7.1, 0, 0.43)); }

  scene.add(group);
  return {
    group,
    zones,
    emitters: [],
    scannables,
    // Show only the zones the current stop can see.
    setZones(list) { for (const k in zones) zones[k].visible = k === 'always' || list.includes(k); },
    update(t) { for (const a of actors) if (zones[a.zone].visible) a.update(t); },
  };
}

// Top-down map of Jelling for the map screen in the capsule. rect = area on the canvas.
export function drawJellingMap(ctx, rect, cx, cz, yaw, stops) {
  const X0 = -135, X1 = 45, Z0 = -100, Z1 = 62;
  const k = Math.min(rect.w / (X1 - X0), rect.h / (Z1 - Z0));
  const ox = rect.x + (rect.w - (X1 - X0) * k) / 2, oy = rect.y + (rect.h - (Z1 - Z0) * k) / 2;
  const P = (x, z) => [ox + (x - X0) * k, oy + (z - Z0) * k];
  const line = 'rgba(223,240,242,0.55)', dim = 'rgba(223,240,242,0.22)';
  ctx.lineWidth = 2;
  // Ship setting (lens outline).
  const n = SITES.northMound;
  ctx.strokeStyle = dim; ctx.setLineDash([3, 6]); ctx.beginPath();
  for (const side of [-1, 1]) for (let i = 0; i <= 40; i++) {
    const kk = -130 + i * 6.5, w = 30 * (1 - (kk / 130) ** 2);
    const [x, y] = P(n.x + side * w, n.z + kk);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.setLineDash([]);
  // Palisade with the gate.
  ctx.strokeStyle = line; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(...P(SITES.palisadeX, -100)); ctx.lineTo(...P(SITES.palisadeX, SITES.gate[0]));
  ctx.moveTo(...P(SITES.palisadeX, SITES.gate[1])); ctx.lineTo(...P(SITES.palisadeX, 62)); ctx.stroke();
  // Mounds, pond, buildings, stone.
  ctx.lineWidth = 2;
  const circle = (x, z, r, fill) => { const [a, b] = P(x, z); ctx.beginPath(); ctx.arc(a, b, r * k, 0, 7); fill ? (ctx.fillStyle = fill, ctx.fill()) : ctx.stroke(); };
  ctx.strokeStyle = line; circle(n.x, n.z, n.r); circle(SITES.southMound.x, SITES.southMound.z, SITES.southMound.r);
  circle(40, 4, 12, 'rgba(127,184,180,0.25)');
  const rect2 = (x, z, w, d) => { const [a, b] = P(x - w / 2, z - d / 2); ctx.fillStyle = 'rgba(223,240,242,0.35)'; ctx.fillRect(a, b, w * k, d * k); };
  rect2(-96, 0, 22, 7); rect2(-78, 38, 18, 6.4); rect2(-110, 36, 4, 3); rect2(-64, 4, 4, 3); rect2(SITES.church.x, SITES.church.z, 6, 10);
  circle(SITES.stone.x, SITES.stone.z, 1.6, '#ffb36b');
  // Stops.
  ctx.font = '600 20px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  for (const s of Object.values(stops)) {
    const [[x0, z0], [x1, z1]] = s.glide;
    ctx.strokeStyle = 'rgba(255,179,107,0.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(...P(x0, z0)); ctx.lineTo(...P(x1, z1)); ctx.stroke(); ctx.setLineDash([]);
    const [a, b] = P(x1, z1);
    ctx.fillStyle = '#b9c4c7'; ctx.fillText(s.name.toUpperCase(), a + 12, b - 16);
  }
  // The capsule.
  const [a, b] = P(cx, cz);
  ctx.save(); ctx.translate(a, b); ctx.rotate(-yaw);
  ctx.fillStyle = '#ffb36b'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(9, 9); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

export { wrapAngle };
