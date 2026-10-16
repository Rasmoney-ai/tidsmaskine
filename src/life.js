// Small moving life: a flock of crows over the village and butterflies by the runestone.
// Deterministic: positions depend only on trip time t. Uses the Claude Design models when loaded.
import * as THREE from 'three';
import { Builder, G, MAT } from './toon.js';
import { staticGeometry } from './models.js';

function birdGeo() {
  const b = new Builder(1001);
  b.add(G.box(0.12, 0.1, 0.45), 0x1e1e22, {});
  b.add(G.cone(0.05, 0.12, 4), 0x3a3020, { pos: [0, 0, 0.28], rot: [Math.PI / 2, 0, 0] });
  return b.geometry();
}
function wingGeo(side) {
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, side * 0.75, 0, 0.0, 0, 0, -0.12], 3));
  return new Builder(1003).add(wing, 0x24242a, {}).geometry();
}
function butterflyGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.05, 0.11, 0.02, 0.07, 0.09, 0, -0.06, 0, 0, 0.05, 0.09, 0, -0.06, 0, 0, -0.04,
    0, 0, 0.05, 0, 0, -0.04, -0.09, 0, -0.06, 0, 0, 0.05, -0.09, 0, -0.06, -0.11, 0.02, 0.07,
  ], 3));
  return new Builder(1002).add(g, 0xffffff, {}).geometry();
}

export function buildLife(parent, timeline, M = {}) {
  // Crows: body and the two wings as separate instanced meshes, so the wings can flap.
  const crow = M.e7_krage;
  const body = new THREE.InstancedMesh(crow ? staticGeometry(crow, (o) => !o.name.startsWith('vinge')) : birdGeo(), MAT.world, 8);
  const wings = [
    new THREE.InstancedMesh(crow ? staticGeometry(crow, (o) => o.name === 'vinge_V') : wingGeo(1), MAT.world, 8),
    new THREE.InstancedMesh(crow ? staticGeometry(crow, (o) => o.name === 'vinge_H') : wingGeo(-1), MAT.world, 8),
  ];
  // Butterflies: one instanced mesh per color variant; wings fold by squeezing x.
  const flyKeys = ['e8a_sommerfugl', 'e8b_sommerfugl', 'e8c_sommerfugl'].filter((k) => M[k]);
  const flies = flyKeys.length
    ? flyKeys.map((k) => new THREE.InstancedMesh(staticGeometry(M[k]), MAT.world, 2))
    : [new THREE.InstancedMesh(butterflyGeo(), MAT.world, 6)];
  if (!flyKeys.length) [0xf2c94c, 0x6aa8e8, 0xf2f2f2, 0xf28c3a, 0x6aa8e8, 0xf2c94c].forEach((c, i) => flies[0].setColorAt(i, new THREE.Color(c)));
  const flySize = flyKeys.length ? 2.2 : 1.5;
  [body, ...wings, ...flies].forEach((m) => { m.frustumCulled = false; parent.add(m); });

  const m = new THREE.Matrix4(), w = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  return {
    update(t, zones = ['village', 'stone']) {
      const birdsOn = zones.includes('village'), fliesOn = zones.includes('stone');
      body.visible = wings[0].visible = wings[1].visible = birdsOn;
      flies.forEach((f) => { f.visible = fliesOn; });
      if (birdsOn) {
        for (let i = 0; i < 8; i++) {
          const a = t * 0.16 + i * 0.32, r = 26 + (i % 3) * 3;
          p.set(-88 + Math.cos(a) * r, 16 + (i % 4) * 1.5 + Math.sin(t * 0.5 + i) * 1.2, 18 + Math.sin(a) * r * 0.7);
          e.set(Math.sin(t * 0.7 + i) * 0.1, Math.atan2(-Math.sin(a), Math.cos(a) * 0.7) + Math.PI, Math.cos(a) * 0.35);
          m.compose(p, q.setFromEuler(e), one);
          body.setMatrixAt(i, m);
          const flap = 0.55 * Math.sin(t * 7 + i * 1.3);
          wings[0].setMatrixAt(i, w.makeRotationZ(flap).premultiply(m));
          wings[1].setMatrixAt(i, w.makeRotationZ(-flap).premultiply(m));
        }
        body.instanceMatrix.needsUpdate = wings[0].instanceMatrix.needsUpdate = wings[1].instanceMatrix.needsUpdate = true;
      }
      if (fliesOn) {
        // Butterflies around the runestone meadow, close to the capsule window at the stop.
        for (let i = 0; i < 6; i++) {
          const k = t * (0.35 + i * 0.04) + i * 2.1;
          p.set(2.2 + Math.sin(k) * 1.4 + Math.sin(k * 2.3) * 0.4, 1.2 + Math.sin(k * 1.7) * 0.5 + (i % 3) * 0.35, -7 + Math.cos(k * 0.8) * 2.4);
          e.set(0, k * 1.3, 0);
          const f = Math.abs(Math.sin(t * 13 + i * 2));
          m.compose(p, q.setFromEuler(e), s.set(0.2 + f * 0.8, 1, 1).multiplyScalar(flySize));
          const mesh = flies[i % flies.length], slot = Math.floor(i / flies.length);
          mesh.setMatrixAt(slot, m);
        }
        flies.forEach((f) => { f.instanceMatrix.needsUpdate = true; });
      }
    },
  };
}
