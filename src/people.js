// Low-poly characters and animals built in code. Poses are set from trip time t only.
import * as THREE from 'three';
import { Builder, G, MAT, outline } from './toon.js';
import { blob } from './shadows.js';

const SKIN = [0xf1c7a5, 0xe8b48f, 0xd9a07a];

function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// Person facing +z. Returns handles for animation.
const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 10, start = 0, len = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg, start, len);
const dome = (r, frac = 0.5, seg = 10) => new THREE.SphereGeometry(r, seg, 6, 0, Math.PI * 2, 0, Math.PI * frac);

export function makePerson(o = {}) {
  const c = {
    skin: SKIN[0], tunic: 0x8a6b3f, pants: 0x5b4a3a, shoe: 0x3b2a1e, hair: 0x9a6a35,
    belt: 0x4a3322, wrap: 0xcfc2a2, ...o,
  };
  const root = new THREE.Group();
  root.name = c.name || 'person';
  const s = c.scale || 1;
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
  const flat = [1, 1, 0.78];

  // Torso: tunic or dress shaped with a lathe profile (hem, waist, chest, shoulders).
  const b = new Builder(c.seed || 1);
  if (c.dress) {
    b.add(lathe([[0.34, 0.08], [0.3, 0.45], [0.22, 0.95], [0.2, 1.12], [0.22, 1.28], [0.2, 1.38], [0.08, 1.47]]), c.dress, { scale: flat, vary: 0.04 });
    if (c.apron) b.add(lathe([[0.31, 0.3], [0.24, 0.9], [0.215, 1.12], [0.225, 1.3]], 8, -Math.PI / 2.2, Math.PI / 1.1), c.apron, { scale: [1.04, 1, 0.84] });
    if (c.brooch) for (const x of [-0.1, 0.1]) b.add(G.ball(0.05, 1), c.brooch, { pos: [x, 1.3, 0.17], scale: [1, 1.25, 0.55] });
    if (c.brooch) b.add(G.torus(0.1, 0.008, 3, 10, Math.PI), 0x9fd0e0, { pos: [0, 1.3, 0.175], rot: [0, 0, Math.PI] });
  } else {
    b.add(lathe([[0.27, 0.66], [0.25, 0.8], [0.205, 0.97], [0.215, 1.15], [0.225, 1.3], [0.2, 1.39], [0.08, 1.47]]), c.tunic, { scale: flat, vary: 0.04 });
    b.add(G.cyl(0.215, 0.215, 0.06, 10), c.belt, { pos: [0, 0.96, 0], scale: flat });
    b.add(G.box(0.07, 0.06, 0.03), 0xc9a24a, { pos: [0, 0.96, 0.17] });
    if (c.trim) b.add(G.cyl(0.255, 0.275, 0.05, 10), c.trim, { pos: [0, 0.68, 0], scale: flat });
  }
  if (c.robe) b.add(lathe([[0.36, 0.04], [0.3, 0.5], [0.23, 1.0], [0.235, 1.3], [0.2, 1.4], [0.08, 1.48]]), c.robe, { scale: flat, vary: 0.03 });
  if (c.cloak) {
    b.add(lathe([[0.36, 0.55], [0.3, 0.95], [0.27, 1.3], [0.24, 1.42], [0.1, 1.48]], 10, Math.PI / 2 - 0.2, Math.PI + 0.4), c.cloak, { scale: [1.05, 1, 0.9], vary: 0.04 });
    b.add(G.ball(0.055, 1), 0xf2c94c, { pos: [0.15, 1.37, 0.17] });
  }
  if (c.shield) {
    b.add(G.cyl(0.42, 0.42, 0.04, 14), c.shield, { pos: [0, 1.05, -0.25], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) b.add(G.box(0.03, 0.8, 0.01), 0xf0e6d0, { pos: [0, 1.05, -0.275], rot: [0, 0, i * Math.PI / 4] });
    b.add(G.ball(0.08, 1), 0xa0a0a0, { pos: [0, 1.05, -0.29], scale: [1, 1, 0.6] });
  }
  b.add(G.cyl(0.055, 0.065, 0.1, 8), c.skin, { pos: [0, 1.48, 0] });
  const torso = b.mesh(); body.add(torso);

  // Head: egg shape, eyes with whites, brows, nose, ears, hair, beard.
  const head = pivot(body, 0, 1.5, 0);
  const h = new Builder(2);
  h.add(G.ball(0.13, 2), c.skin, { pos: [0, 0.13, 0], scale: [0.95, 1.1, 1] });
  for (const x of [-1, 1]) {
    h.add(G.ball(0.022, 1), 0xf8f4ec, { pos: [x * 0.045, 0.15, 0.108], scale: [1, 0.8, 0.6] });
    h.add(G.ball(0.012, 0), 0x2a2018, { pos: [x * 0.045, 0.15, 0.121] });
    h.add(G.box(0.05, 0.012, 0.015), c.beard || c.hair || 0x6b4a2a, { pos: [x * 0.047, 0.185, 0.115], rot: [0, 0, x * -0.15] });
    h.add(G.ball(0.026, 0), c.skin, { pos: [x * 0.125, 0.13, 0], scale: [0.5, 1, 0.8] });
  }
  h.add(G.cone(0.024, 0.065, 5), c.skin, { pos: [0, 0.115, 0.135], rot: [Math.PI / 2 + 0.3, 0, 0] });
  h.add(G.box(0.05, 0.01, 0.01), 0x9a5a4a, { pos: [0, 0.07, 0.12] });
  if (c.hair !== null) {
    h.add(dome(0.138, 0.55), c.hair, { pos: [0, 0.14, -0.012], rot: [-0.35, 0, 0], vary: 0.06 });
    if (c.longHair) {
      h.add(G.box(0.22, 0.26, 0.08), c.hair, { pos: [0, 0.06, -0.1] });
      for (let i = 0; i < 5; i++) h.add(G.ball(0.04 - i * 0.003, 1), c.hair, { pos: [0, -0.1 - i * 0.065, -0.13 - i * 0.01] });
    }
  }
  if (c.beard) {
    h.add(lathe([[0.0, -0.17], [0.07, -0.08], [0.11, 0.03], [0.12, 0.09]], 8, -Math.PI / 2, Math.PI), c.beard, { pos: [0, 0, 0.015], vary: 0.06 });
    h.add(G.box(0.11, 0.025, 0.03), c.beard, { pos: [0, 0.085, 0.125] });
  }
  if (c.circlet) h.add(G.torus(0.135, 0.014, 4, 14), 0xf2c94c, { pos: [0, 0.2, -0.01], rot: [Math.PI / 2 + 0.25, 0, 0] });
  if (c.cap) h.add(lathe([[0.15, 0], [0.14, 0.08], [0.06, 0.18], [0, 0.2]], 8), c.cap, { pos: [0, 0.17, -0.02], rot: [-0.2, 0, 0] });
  if (c.headscarf) h.add(dome(0.152, 0.6), c.headscarf, { pos: [0, 0.135, -0.02], rot: [-0.45, 0, 0] });
  head.add(h.mesh());

  // Arms: tapered sleeve, cuff, mitten hand with thumb.
  const sleeve = c.sleeve || (c.dress && !c.tunicArms ? c.dress : c.robe || c.tunic);
  const arm = (side) => {
    const p = pivot(body, side * 0.235, 1.36, 0);
    const a = new Builder(3);
    a.add(G.ball(0.075, 1), sleeve, { pos: [0, 0, 0] });
    a.add(G.cyl(0.066, 0.052, 0.55, 8), sleeve, { pos: [0, -0.28, 0] });
    a.add(G.cyl(0.056, 0.056, 0.04, 8), c.trim || sleeve, { pos: [0, -0.54, 0] });
    a.add(G.ball(0.055, 1), c.skin, { pos: [0, -0.62, 0.005], scale: [0.85, 1.15, 0.75] });
    a.add(G.ball(0.022, 0), c.skin, { pos: [side * -0.03, -0.6, 0.04] });
    p.add(a.mesh());
    p.hand = pivot(p, 0, -0.62, 0);
    return p;
  };
  // Legs: trousers, leg wraps, round shoes.
  const leg = (side) => {
    const p = pivot(body, side * 0.1, 0.84, 0);
    const l = new Builder(4);
    l.add(G.cyl(0.085, 0.07, 0.44, 8), c.pants, { pos: [0, -0.2, 0] });
    l.add(G.cyl(0.066, 0.058, 0.36, 8), c.wrap, { pos: [0, -0.59, 0] });
    for (let i = 0; i < 3; i++) l.add(G.box(0.14, 0.012, 0.14), 0x8a7a5a, { pos: [0, -0.48 - i * 0.1, 0], rot: [0.25, 0, 0] });
    l.add(G.ball(0.08, 1), c.shoe, { pos: [0, -0.8, 0.05], scale: [0.85, 0.55, 1.5] });
    p.add(l.mesh());
    return p;
  };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
  outline(torso); outline(head.children[0]);
  root.add(blob(0.9 * s));
  return { root, body, head, armL, armR, legL, legR };
}

// Tools held in a hand (hand pivot's -y continues along the arm).
export function tool(kind) {
  const b = new Builder(9);
  switch (kind) {
    case 'axe':
      b.add(G.cyl(0.025, 0.025, 0.8, 6), 0x8b6a42, { pos: [0, 0, 0.3], rot: [Math.PI / 2, 0, 0] });
      b.add(G.box(0.04, 0.2, 0.14), 0xb8c0c4, { pos: [0, -0.06, 0.66] });
      break;
    case 'hammer':
      b.add(G.cyl(0.02, 0.02, 0.38, 6), 0x8b6a42, { pos: [0, 0, 0.14], rot: [Math.PI / 2, 0, 0] });
      b.add(G.box(0.07, 0.07, 0.16), 0x777777, { pos: [0, 0, 0.32], rot: [0, Math.PI / 2, 0] });
      break;
    case 'chisel':
      b.add(G.cyl(0.015, 0.012, 0.22, 5), 0x9aa0a4, { pos: [0, 0, 0.08], rot: [Math.PI / 2, 0, 0] });
      break;
    case 'spear':
      b.add(G.cyl(0.02, 0.02, 2.3, 6), 0x7a5a36, { pos: [0, 0.55, 0] });
      b.add(G.cone(0.045, 0.22, 4), 0xc0c6ca, { pos: [0, 1.8, 0] });
      break;
    case 'cross':
      b.add(G.cyl(0.02, 0.02, 1.8, 6), 0x7a5a36, { pos: [0, 0.45, 0] });
      b.add(G.box(0.3, 0.04, 0.04), 0xd9b44a, { pos: [0, 1.2, 0] });
      b.add(G.box(0.04, 0.42, 0.04), 0xd9b44a, { pos: [0, 1.2, 0] });
      break;
    case 'spindle':
      b.add(G.cyl(0.01, 0.01, 0.3, 5), 0xc9a36b, { pos: [0, -0.1, 0] });
      b.add(G.cyl(0.04, 0.04, 0.02, 8), 0x7a5a36, { pos: [0, -0.22, 0] });
      break;
  }
  return b.mesh();
}

export function walkPose(p, phase, amp = 0.5) {
  const s = Math.sin(phase);
  p.legL.rotation.x = s * amp; p.legR.rotation.x = -s * amp;
  p.armL.rotation.x = -s * amp * 0.7; p.armR.rotation.x = s * amp * 0.7;
  p.body.position.y = Math.abs(Math.cos(phase)) * 0.04;
}

export function standPose(p, t, seed = 0) {
  p.legL.rotation.x = p.legR.rotation.x = 0;
  p.armL.rotation.x = 0.05 * Math.sin(t * 0.9 + seed); p.armR.rotation.x = 0.05 * Math.sin(t * 0.8 + seed + 1);
  p.armL.rotation.z = -0.08; p.armR.rotation.z = 0.08;
  p.body.position.y = 0.006 * Math.sin(t * 1.6 + seed);
  p.head.rotation.y = 0.35 * Math.sin(t * 0.21 + seed);
}

// Animals ---------------------------------------------------------------

export function makeSheep(seed = 1) {
  const root = new THREE.Group();
  const b = new Builder(seed);
  b.add(G.ball(0.42, 0), 0xf1ead8, { pos: [0, 0.68, 0], scale: [0.9, 0.8, 1.3], vary: 0.06 });
  b.add(G.ball(0.25, 0), 0xf6f0e0, { pos: [0, 0.86, -0.15], vary: 0.06 });
  for (const [x, z] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]])
    b.add(G.box(0.08, 0.45, 0.08), 0x2b2724, { pos: [x, 0.25, z] });
  root.add(b.mesh());
  root.add(blob(1.1));
  const head = pivot(root, 0, 0.8, 0.5);
  const h = new Builder(seed + 1);
  h.add(G.box(0.2, 0.22, 0.3), 0x2b2724, { pos: [0, 0, 0.12] });
  h.add(G.box(0.18, 0.06, 0.08), 0x2b2724, { pos: [-0.14, 0.06, 0.02], rot: [0, 0, 0.4] });
  h.add(G.box(0.18, 0.06, 0.08), 0x2b2724, { pos: [0.14, 0.06, 0.02], rot: [0, 0, -0.4] });
  head.add(h.mesh());
  return { root, head };
}

export function makeDog() {
  const root = new THREE.Group();
  const body = new Builder(21);
  body.add(G.box(0.28, 0.28, 0.7), 0x8a6a48, { pos: [0, 0.5, 0], vary: 0.05 });
  body.add(G.box(0.24, 0.12, 0.5), 0xd8c3a2, { pos: [0, 0.38, 0.05] });
  const bm = body.mesh(); root.add(bm, blob(0.9));
  const legs = [];
  for (const [x, z] of [[-0.1, 0.27], [0.1, 0.27], [-0.1, -0.27], [0.1, -0.27]]) {
    const p = pivot(root, x, 0.42, z);
    const l = new Builder(22); l.add(G.box(0.08, 0.42, 0.08), 0x7a5c3e, { pos: [0, -0.21, 0] });
    p.add(l.mesh()); legs.push(p);
  }
  const head = pivot(root, 0, 0.66, 0.36);
  const h = new Builder(23);
  h.add(G.box(0.24, 0.24, 0.26), 0x8a6a48, { pos: [0, 0.06, 0.05] });
  h.add(G.box(0.13, 0.12, 0.18), 0xd8c3a2, { pos: [0, 0.0, 0.25] });
  h.add(G.box(0.06, 0.05, 0.04), 0x1d1d1d, { pos: [0, 0.05, 0.35] });
  h.add(G.cone(0.06, 0.14, 4), 0x6b4f35, { pos: [-0.08, 0.24, 0.0] });
  h.add(G.cone(0.06, 0.14, 4), 0x6b4f35, { pos: [0.08, 0.24, 0.0] });
  h.add(G.box(0.03, 0.03, 0.02), 0x111111, { pos: [-0.06, 0.12, 0.18] });
  h.add(G.box(0.03, 0.03, 0.02), 0x111111, { pos: [0.06, 0.12, 0.18] });
  const jaw = pivot(head, 0, -0.04, 0.2);
  const j = new Builder(24); j.add(G.box(0.11, 0.04, 0.14), 0xc9b08c, { pos: [0, -0.02, 0.06] });
  jaw.add(j.mesh());
  head.add(h.mesh());
  const tail = pivot(root, 0, 0.6, -0.34);
  const tb = new Builder(25); tb.add(G.box(0.05, 0.05, 0.32), 0x8a6a48, { pos: [0, 0.08, -0.14], rot: [-0.6, 0, 0] });
  tail.add(tb.mesh());
  return { root, body: bm, legs, head, jaw, tail };
}

export const ToonMat = MAT;
