// Jelling around 968: village, palisade, mounds, ship setting, church, runestones and the people.
import * as THREE from 'three';
import { Builder, G, MAT, rng, paint, canvasTexture, outline, thickOutline } from './toon.js';
import { groundHeight } from './world.js';
import { makePerson, makeSheep, makeDog, tool, walkPose, standPose } from './people.js';
import { staticShadows, blob } from './shadows.js';
import { riggedCharacter, mergedProp, aimBone, restPosition } from './models.js';

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

function mounds() {
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
  return g;
}

// Ship setting: two curved rows of standing stones, center at the north mound.
function shipSetting(route, shadows) {
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

function runestones() {
  const g = new THREE.Group();
  const s = SITES.stone;
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

function loopPath(points) {
  const segs = [];
  let L = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, s: L }); L += len;
  }
  return {
    L,
    at(s) {
      s = ((s % L) + L) % L;
      for (const g of segs) if (s <= g.s + g.len) {
        const f = (s - g.s) / g.len;
        return { x: g.a[0] + (g.b[0] - g.a[0]) * f, z: g.a[1] + (g.b[1] - g.a[1]) * f, yaw: Math.atan2(g.b[0] - g.a[0], g.b[1] - g.a[1]), seg: segs.indexOf(g) };
      }
      return { x: segs[0].a[0], z: segs[0].a[1], yaw: 0, seg: 0 };
    },
  };
}

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

export function buildJelling(scene, timeline, models = {}) {
  const group = new THREE.Group();
  const actors = [];
  const shadows = [];
  const emitters = [];
  const r = rng(200);
  // Zones: only the zones a stop can see are shown and animated. 'always' stays visible.
  const zones = { always: new THREE.Group(), village: new THREE.Group(), mounds: new THREE.Group(), stone: new THREE.Group() };
  Object.values(zones).forEach((z) => group.add(z));
  let zone = 'village';
  const add = (...objs) => zones[zone].add(...objs);
  const act = (a) => { a.zone = zone; actors.push(a); };
  const emit = (e) => { e.zone = zone; emitters.push(e); };

  // --- Village ---------------------------------------------------------
  add(place(longhouse(22, 7.2, 301), -96, 0));
  add(place(longhouse(18, 6.4, 302), -78, 38, 0.06));
  add(place(pitHouse(303), -110, 36, 0.3));
  add(place(pitHouse(304), -64, 4, -0.4));
  add(place(woodpile(305), -106, 29, 0.2));
  add(fenceRing(-122, 2, 7, r));
  add(props());
  add(place(loom(), -88.5, 8, -Math.PI / 2));
  const fire = place(firePit(), -84, 12);
  add(fire);
  for (const s of [smoke(-96, 5.4, 0, 1), smoke(-78, 5.4, 38, 2)]) { add(s.group); act(s); }
  act({ update(t) { fire.flame.scale.set(1 + 0.12 * Math.sin(t * 11), 1 + 0.25 * Math.sin(t * 7.3) + 0.1 * Math.sin(t * 17), 1 + 0.12 * Math.cos(t * 9)); } });

  // Weaver at the loom.
  const weaver = makePerson({ dress: 0x4f7a8c, apron: 0xc9a86b, brooch: 0xd9b44a, hair: 0xc68b3e, longHair: true, headscarf: 0xe8dcc0, skin: SKIN(1) });
  add(place(weaver.root, -87.6, 8, -Math.PI / 2));
  act({ update(t) {
    standPose(weaver, t, 2);
    weaver.head.rotation.y = 0;
    const k = Math.sin(t * 1.4);
    weaver.armL.rotation.x = -1.2 + 0.1 * k; weaver.armR.rotation.x = -1.2 - 0.1 * k;
    weaver.armL.rotation.z = -0.3 + 0.3 * k; weaver.armR.rotation.z = 0.3 + 0.3 * k;
  } });

  // Man chopping wood (strike every 2.4 s). Uses the Claude Design model (B14 + axe) when loaded.
  const CHOP = 2.4, chopX = -104.4, chopZ = 28.4, chopYaw = Math.PI / 2 + 0.2;
  // Phase of the chop: 0 = axe down in the log, 1 = raised over the shoulder.
  const chopLift = (t) => {
    const p = (t % CHOP) / CHOP;
    if (p < 0.55) return smooth(p / 0.55);
    if (p < 0.66) return 1 - smooth((p - 0.55) / 0.11);
    return 0.08 * smooth((p - 0.66) / 0.34);
  };
  const logGeo = new Builder(306);
  logGeo.add(G.cyl(0.3, 0.33, 0.5, 9), 0x7a5532, { pos: [0, 0.25, 0], vary: 0.06 });
  logGeo.add(G.cyl(0.29, 0.29, 0.02, 9), 0xc9a26e, { pos: [0, 0.505, 0] });
  if (models.man) {
    const man = riggedCharacter(models.man), B = man.bones;
    if (models.axe) { const axe = mergedProp(models.axe); axe.position.set(-0.06, 0, 0); B.RightHand.add(axe); }
    const restR = restPosition(B.RightHand, man.root).sub(restPosition(B.RightArm, man.root)).normalize();
    const restL = restPosition(B.LeftHand, man.root).sub(restPosition(B.LeftArm, man.root)).normalize();
    const shR = restPosition(B.RightArm, man.root), shL = restPosition(B.LeftArm, man.root);
    man.root.add(blob(0.9));
    const log = logGeo.mesh(); log.position.set(0, 0, 0.78); man.root.add(log);
    add(place(man.root, chopX, chopZ, chopYaw));
    const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0), ref = new THREE.Vector3();
    const lowHand = new THREE.Vector3(0, 0.9, 0.5), upHand = new THREE.Vector3(0, 1.98, -0.08);
    const lowAxe = new THREE.Vector3(0, -0.82, 0.57), upAxe = new THREE.Vector3(0, -0.25, -1);
    const hand = new THREE.Vector3(), handL = new THREE.Vector3(), axeDir = new THREE.Vector3(), d = new THREE.Vector3();
    B.LeftUpLeg.rotation.z = 0.1; B.RightUpLeg.rotation.z = -0.1;
    act({ update(t) {
      const k = chopLift(t);
      hand.lerpVectors(lowHand, upHand, k);
      axeDir.lerpVectors(lowAxe, upAxe, k).normalize();
      handL.copy(hand).addScaledVector(axeDir, -0.13);
      B.Spine1.rotation.x = 0.22 * (1 - k) - 0.04;
      B.Head.rotation.x = 0.18 * (1 - k);
      // Arms point at the grip; the arm twist reference stays stable (side vector + a bit of forward).
      d.subVectors(hand, shR).normalize();
      aimBone(B.RightArm, man.root, restR, Z, d, ref.crossVectors(Y, d).addScaledVector(Z, 0.3));
      // The wrist turns so the axe handle points along axeDir.
      aimBone(B.RightHand, man.root, Z, restR, axeDir, d);
      d.subVectors(handL, shL).normalize();
      aimBone(B.LeftArm, man.root, restL, Z, d, ref.crossVectors(d, Y).addScaledVector(Z, 0.3));
    } });
  } else {
    const chopper = makePerson({ tunic: 0x9c4a32, pants: 0x4d4436, hair: 0x6b4423, beard: 0x6b4423, seed: 5 });
    chopper.armR.hand.add(tool('axe'));
    add(place(chopper.root, chopX, chopZ, chopYaw));
    act({ update(t) {
      standPose(chopper, t, 1);
      chopper.head.rotation.y = 0;
      const a = -0.3 - 2.5 * chopLift(t);
      chopper.armR.rotation.x = a; chopper.armL.rotation.x = a + 0.1;
      chopper.armR.rotation.z = 0.15; chopper.armL.rotation.z = -0.15;
      chopper.body.rotation.x = chopLift(t) < 0.2 ? 0.25 : 0.05;
    } });
  }
  emit({ name: 'chop', period: CHOP, offset: CHOP * 0.66, x: -104, z: 29 });

  // Two children playing tag.
  for (let k = 0; k < 2; k++) {
    const kid = makePerson({ tunic: k ? 0x6e8f3e : 0xb5652f, pants: 0x5b4a3a, hair: k ? 0xd9a441 : 0x5a3a20, scale: 0.68, seed: 10 + k, longHair: k === 1 });
    add(kid.root);
    act({ update(t) {
      const w = 0.62, rad = 3.2 + 0.6 * Math.sin(t * 0.4 + k);
      const a = t * w + k * 1.0;
      const x = -86 + Math.cos(a) * rad, z = 29 + Math.sin(a) * rad * 0.8;
      place(kid.root, x, z, Math.atan2(-Math.sin(a), Math.cos(a) * 0.8));
      walkPose(kid, t * 9 + k, 0.7);
    } });
  }

  // Sheep in the pen.
  for (let i = 0; i < 5; i++) {
    const sh = makeSheep(400 + i);
    const x = -122 + (r() - 0.5) * 8, z = 2 + (r() - 0.5) * 8, yaw = r() * 6.28;
    add(place(sh.root, x, z, yaw));
    act({ update(t) { sh.head.rotation.x = 0.6 + 0.4 * Math.sin(t * 0.5 + i * 2); } });
  }
  emit({ name: 'baa', period: 9.7, offset: 3, x: -122, z: 2 });

  // --- Palisade, mounds, ship setting, church, stones --------------------
  zone = 'always';
  add(palisade());
  add(mounds());
  add(shipSetting(timeline.routePoints(), shadows));
  const sh = (x, z, sx, sz, yaw, h) => shadows.push([x, groundHeight(x, z), z, sx, sz, yaw, h]);
  sh(-96, 0, 27, 11, 0, 4); sh(-78, 38, 23, 10, 0.06, 4); sh(-110, 36, 7, 6, 0.3, 2); sh(-64, 4, 7, 6, -0.4, 2);
  sh(SITES.church.x, SITES.church.z - 1, 10, 17, 0, 5); sh(SITES.stone.x, SITES.stone.z, 2.4, 2.4, 0, 2.4);
  for (let z = -110; z <= 110; z += 6) if (z < SITES.gate[0] - 2 || z > SITES.gate[1] + 2) sh(SITES.palisadeX, z, 3.2, 7, 0, 3);
  sh(-29, 35, 6, 3.5, 0, 0.5); sh(-33, 40, 2.6, 3.5, 0.4, 1); sh(-106, 29, 3, 2, 0.2, 0.8);
  add(staticShadows(shadows));
  add(church());
  add(runestones());

  // Turf carriers walking a loop onto the south mound.
  zone = 'mounds';
  const turfLoop = loopPath([[-28, 36.5], [-21, 40], [-11, 43], [-5, 45], [-10, 47], [-20, 44], [-27, 39]]);
  const turfGeo = paint(G.box(0.5, 0.15, 0.38), 0x5e8a38, { rand: rng(500) });
  for (let k = 0; k < 4; k++) {
    const w = makePerson({ tunic: [0x8a6b3f, 0x6d7a4a, 0x9a7a52, 0x7b5d43][k], pants: 0x4d4436, hair: [0x6b4423, 0x3a2a1a, 0xb07a3a, 0x5a3a20][k], beard: k % 2 ? 0x5a3a20 : undefined, seed: 20 + k });
    const turf = new THREE.Mesh(turfGeo, MAT.world);
    turf.position.set(0, 1.25, 0.38);
    w.body.add(turf);
    add(w.root);
    act({ update(t) {
      const s = t * 0.85 + k * turfLoop.L / 4;
      const p = turfLoop.at(s);
      w.root.position.set(p.x, groundHeight(p.x, p.z) + southMoundHeight(p.x, p.z), p.z);
      w.root.rotation.y = p.yaw;
      walkPose(w, s * 4.2, 0.45);
      const carrying = p.seg < 3;
      turf.visible = carrying;
      if (carrying) { w.armL.rotation.x = w.armR.rotation.x = -1.25; w.armL.rotation.z = 0.25; w.armR.rotation.z = -0.25; }
      else { w.armL.rotation.z = -0.08; w.armR.rotation.z = 0.08; }
      w.body.rotation.x = carrying && p.seg > 0 ? 0.12 : 0;
    } });
  }

  zone = 'stone';
  // --- The runestone scene ----------------------------------------------
  const S = SITES.stone;
  const n = new THREE.Vector2(-0.7071, 0.7071), tg = new THREE.Vector2(0.7071, 0.7071);
  const at = (dn, dt) => [S.x + n.x * dn + tg.x * dt, S.z + n.y * dn + tg.y * dt];
  const faceYaw = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

  // Stonemason, chiselling every 1.25 s, stops when the dog barks.
  const mason = makePerson({ tunic: 0x7d6b55, pants: 0x4a3f33, hair: 0x8a5a2a, beard: 0x8a5a2a, cap: 0x5c4d3c, seed: 30 });
  mason.armR.hand.add(tool('hammer'));
  const chisel = tool('chisel'); mason.armL.hand.add(chisel);
  const [mx, mz] = at(0.75, 0.35);
  add(place(mason.root, mx, mz, faceYaw(mx, mz, S.x, S.z)));
  const STRIKE = 1.25;
  act({ update(t) {
    standPose(mason, t, 3);
    mason.head.rotation.y = 0;
    mason.legL.rotation.x = -0.5; mason.legR.rotation.x = 0.3; // kneeling-ish stance
    mason.body.position.y = -0.18;
    if (t < timeline.dogBark) {
      const p = (t % STRIKE) / STRIKE;
      const lift = p < 0.7 ? smooth(p / 0.7) : 1 - smooth((p - 0.7) / 0.12);
      mason.armR.rotation.x = -0.9 - 0.9 * lift; mason.armL.rotation.x = -1.05;
      mason.armR.rotation.z = -0.25; mason.armL.rotation.z = 0.35;
    } else {
      mason.armR.rotation.x = -0.5; mason.armL.rotation.x = -0.6;
      mason.head.rotation.y = -0.9 * smooth((t - timeline.dogBark) / 1.2);
    }
  } });
  emit({ name: 'clink', period: STRIKE, offset: STRIKE * 0.8, x: mx, z: mz, until: timeline.dogBark });

  // King Harald in a blue cloak, gesturing at the stone.
  const harald = makePerson({ tunic: 0xa3322a, pants: 0x3f3a52, cloak: 0x2f5fa8, hair: 0xb98a4a, beard: 0xb98a4a, circlet: true, sleeve: 0xa3322a, seed: 40 });
  const [hx, hz] = at(1.9, -2.5);
  add(place(harald.root, hx, hz, faceYaw(hx, hz, S.x, S.z)));
  act({ update(t) {
    standPose(harald, t, 4);
    const g = (t % 14) / 14;
    harald.armR.rotation.x = g > 0.2 && g < 0.45 ? -1.3 * smooth((g - 0.2) / 0.05) * (1 - smooth((g - 0.4) / 0.05)) : 0.05;
    harald.armL.rotation.x = -0.35; harald.armL.rotation.z = -0.35;
    harald.head.rotation.y = 0.25 * Math.sin(t * 0.3);
    if (t > timeline.dogBark) harald.head.rotation.y = 1.0 * smooth((t - timeline.dogBark - 0.6) / 1.5);
  } });

  // Priest (Poppo) with a cross.
  const priest = makePerson({ robe: 0x3b3b46, tunic: 0x3b3b46, pants: 0x3b3b46, hair: 0x9a9a9a, seed: 50 });
  priest.armR.hand.add(tool('cross'));
  const [px, pz] = at(2.8, -3.9);
  add(place(priest.root, px, pz, faceYaw(px, pz, S.x, S.z)));
  act({ update(t) { standPose(priest, t, 5); priest.armR.rotation.x = -0.3; priest.armL.rotation.x = -0.9; priest.armL.rotation.z = 0.5; } });

  // Two guards by the church.
  for (let k = 0; k < 2; k++) {
    const g = makePerson({ tunic: 0x5a6a3a, pants: 0x3a3226, hair: 0x4a3018, beard: 0x4a3018, shield: k ? 0xc23b2e : 0xd9b44a, seed: 60 + k });
    const sp = tool('spear'); sp.rotation.x = 0.35; g.armR.hand.add(sp);
    const x = SITES.church.x + (k ? 2.4 : -2.4), z = SITES.church.z + 6.2;
    add(place(g.root, x, z, 0));
    act({ update(t) { standPose(g, t, 6 + k); g.armR.rotation.x = -0.35; if (t > timeline.dogBark) g.head.rotation.y = -0.6 * smooth((t - timeline.dogBark - 1) / 1.5); } });
  }

  // The dog: sniffs around, notices the capsule, runs toward it and barks.
  const dog = makeDog();
  add(dog.root);
  const capsule = {};
  const barks = [0, 1.1, 2.4, 4.3, 5.2].map((o) => timeline.dogBark + o);
  act({ update(t) {
    const home = { x: 4.5 + Math.cos(t * 0.35) * 1.6, z: -8.5 + Math.sin(t * 0.35) * 1.2 };
    timeline.poseAtWorld(t, capsule);
    const run = smooth((t - timeline.dogNotice - 0.8) / 2.0);
    // Target: below the capsule's position when it noticed us, slightly offset.
    const tx = 1.2, tz = -11.2;
    const x = home.x + (tx - home.x) * run, z = home.z + (tz - home.z) * run;
    let yaw;
    if (t < timeline.dogNotice) yaw = Math.atan2(-Math.sin(t * 0.35) * 1.6, Math.cos(t * 0.35) * 1.2);
    else yaw = Math.atan2(capsule.x - x, capsule.z - z);
    place(dog.root, x, z, yaw);
    const moving = t < timeline.dogNotice || (run > 0.02 && run < 0.98);
    const phase = t * (run > 0.02 && run < 0.98 ? 16 : 7);
    dog.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 : 0; });
    dog.tail.rotation.y = Math.sin(t * (t > timeline.dogNotice ? 6 : 12)) * 0.5;
    let bark = 0;
    for (const b of barks) if (t >= b && t < b + 0.35) bark = Math.sin((t - b) / 0.35 * Math.PI);
    const look = t > timeline.dogNotice ? 0.55 : -0.1 + 0.15 * Math.sin(t * 2);
    dog.head.rotation.x = -look - bark * 0.25;
    dog.jaw.rotation.x = bark * 0.6;
  } });
  for (const b of barks) emit({ name: 'bark', once: b, follow: dog.root });

  // Birds over the village and the fields (sound only).
  zone = 'always';
  emit({ name: 'bird', period: 6.3, offset: 1, x: -120, z: -20 });
  emit({ name: 'bird', period: 7.7, offset: 4, x: -40, z: 70 });
  emit({ name: 'bird', period: 8.9, offset: 2, x: 30, z: -40 });

  scene.add(group);
  return {
    group,
    zones,
    emitters,
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

function SKIN(i) { return [0xf1c7a5, 0xe8b48f, 0xd9a07a][i]; }

export { wrapAngle };
