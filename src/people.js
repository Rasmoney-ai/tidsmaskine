// Low-poly characters and animals built in code. Poses are set from trip time t only.
import * as THREE from 'three';
import { Builder, G, MAT } from './toon.js';

const SKIN = [0xf1c7a5, 0xe8b48f, 0xd9a07a];

function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// Person facing +z. Returns handles for animation.
export function makePerson(o = {}) {
  const c = {
    skin: SKIN[0], tunic: 0x8a6b3f, pants: 0x5b4a3a, shoe: 0x3b2a1e, hair: 0x9a6a35,
    belt: 0x4a3322, ...o,
  };
  const root = new THREE.Group();
  const s = c.scale || 1;
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);

  // Torso (+ dress, cloak, belt).
  const b = new Builder(c.seed || 1);
  if (c.dress) {
    b.add(G.cyl(0.17, 0.33, 1.25, 8), c.dress, { pos: [0, 0.78, 0], vary: 0.05 });
    if (c.apron) b.add(G.cyl(0.175, 0.29, 0.8, 8, 1), c.apron, { pos: [0, 1.0, 0.012], scale: [1, 1, 1.02] });
    if (c.brooch) for (const x of [-0.1, 0.1]) b.add(G.ball(0.045, 0), c.brooch, { pos: [x, 1.32, 0.17], scale: [1, 1.3, 0.6] });
  } else {
    b.add(G.cyl(0.19, 0.26, 0.64, 8), c.tunic, { pos: [0, 1.12, 0], vary: 0.05 });
    b.add(G.cyl(0.235, 0.24, 0.06, 8), c.belt, { pos: [0, 0.96, 0] });
  }
  if (c.robe) b.add(G.cyl(0.2, 0.34, 1.4, 8), c.robe, { pos: [0, 0.72, 0], vary: 0.04 });
  if (c.cloak) {
    b.add(G.box(0.56, 1.05, 0.06), c.cloak, { pos: [0, 0.98, -0.25], rot: [0.12, 0, 0] });
    b.add(G.box(0.62, 0.12, 0.42), c.cloak, { pos: [0, 1.43, -0.02] });
    b.add(G.ball(0.05, 0), 0xf2c94c, { pos: [0.16, 1.4, 0.2] });
  }
  if (c.shield) {
    b.add(G.cyl(0.42, 0.42, 0.04, 12), c.shield, { pos: [0, 1.05, -0.3], rot: [Math.PI / 2, 0, 0] });
    b.add(G.cyl(0.09, 0.09, 0.06, 8), 0x9a9a9a, { pos: [0, 1.05, -0.33], rot: [Math.PI / 2, 0, 0] });
  }
  b.add(G.cyl(0.06, 0.07, 0.1, 6), c.skin, { pos: [0, 1.47, 0] });
  const torso = b.mesh(); body.add(torso);

  // Head.
  const head = pivot(body, 0, 1.5, 0);
  const h = new Builder(2);
  h.add(G.ball(0.13, 1), c.skin, { pos: [0, 0.13, 0], scale: [1, 1.1, 1] });
  h.add(G.box(0.03, 0.03, 0.02), 0x222222, { pos: [-0.045, 0.16, 0.12] });
  h.add(G.box(0.03, 0.03, 0.02), 0x222222, { pos: [0.045, 0.16, 0.12] });
  h.add(G.cone(0.025, 0.06, 4), c.skin, { pos: [0, 0.12, 0.14], rot: [Math.PI / 2, 0, 0] });
  if (c.hair !== null) {
    h.add(G.ball(0.14, 1), c.hair, { pos: [0, 0.18, -0.025], scale: [1.02, 0.85, 1.02] });
    if (c.longHair) h.add(G.box(0.24, 0.32, 0.1), c.hair, { pos: [0, 0.02, -0.1] });
  }
  if (c.beard) h.add(G.cone(0.1, 0.22, 6), c.beard, { pos: [0, -0.02, 0.07], rot: [Math.PI, 0, 0] });
  if (c.circlet) h.add(G.cyl(0.142, 0.142, 0.04, 10), 0xf2c94c, { pos: [0, 0.2, -0.01] });
  if (c.cap) h.add(G.cone(0.15, 0.18, 8), c.cap, { pos: [0, 0.3, -0.01] });
  if (c.headscarf) h.add(G.ball(0.15, 1), c.headscarf, { pos: [0, 0.17, -0.03], scale: [1.03, 0.9, 1.05] });
  head.add(h.mesh());

  // Arms and legs.
  const arm = (side) => {
    const p = pivot(body, side * 0.25, 1.38, 0);
    const a = new Builder(3);
    a.add(G.box(0.1, 0.6, 0.11), c.sleeve || (c.dress && !c.tunicArms ? c.dress : c.tunic), { pos: [0, -0.28, 0] });
    a.add(G.ball(0.055, 0), c.skin, { pos: [0, -0.62, 0] });
    p.add(a.mesh());
    p.hand = pivot(p, 0, -0.62, 0);
    return p;
  };
  const leg = (side) => {
    const p = pivot(body, side * 0.1, 0.84, 0);
    const l = new Builder(4);
    l.add(G.box(0.13, 0.78, 0.14), c.pants, { pos: [0, -0.39, 0] });
    l.add(G.box(0.14, 0.08, 0.24), c.shoe, { pos: [0, -0.8, 0.04] });
    p.add(l.mesh());
    return p;
  };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
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
  const bm = body.mesh(); root.add(bm);
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
