// Small moving life: a flock of crows over the village and butterflies by the runestone.
// Deterministic: positions depend only on trip time t.
import * as THREE from 'three';
import { Builder, G, MAT } from './toon.js';

function birdGeo() {
  const b = new Builder(1001);
  b.add(G.box(0.12, 0.1, 0.45), 0x1e1e22, {});
  b.add(G.cone(0.05, 0.12, 4), 0x3a3020, { pos: [0, 0, 0.28], rot: [Math.PI / 2, 0, 0] });
  // Wings tilted up; scaling y by a negative value flaps them down.
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0.75, 0.35, 0.0, 0, 0, -0.12, 0, 0, 0.12, 0, 0, -0.12, -0.75, 0.35, 0.0], 3));
  b.add(wing, 0x24242a, {});
  return b.geometry();
}

function butterflyGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.05, 0.11, 0.02, 0.07, 0.09, 0, -0.06, 0, 0, 0.05, 0.09, 0, -0.06, 0, 0, -0.04,
    0, 0, 0.05, 0, 0, -0.04, -0.09, 0, -0.06, 0, 0, 0.05, -0.09, 0, -0.06, -0.11, 0.02, 0.07,
  ], 3));
  return new Builder(1002).add(g, 0xffffff, {}).geometry();
}

export function buildLife(parent, timeline) {
  const birds = new THREE.InstancedMesh(birdGeo(), MAT.world, 8);
  const flies = new THREE.InstancedMesh(butterflyGeo(), MAT.world, 6);
  const colors = [0xf2c94c, 0x6aa8e8, 0xf2f2f2, 0xf28c3a, 0x6aa8e8, 0xf2c94c];
  colors.forEach((c, i) => flies.setColorAt(i, new THREE.Color(c)));
  birds.frustumCulled = flies.frustumCulled = false;
  parent.add(birds, flies);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    update(t) {
      for (let i = 0; i < 8; i++) {
        const a = t * 0.16 + i * 0.32, r = 26 + (i % 3) * 3;
        p.set(-88 + Math.cos(a) * r, 16 + (i % 4) * 1.5 + Math.sin(t * 0.5 + i) * 1.2, 18 + Math.sin(a) * r * 0.7);
        e.set(Math.sin(t * 0.7 + i) * 0.1, Math.atan2(-Math.sin(a), Math.cos(a) * 0.7) + Math.PI, Math.cos(a) * 0.35);
        const flap = Math.sin(t * 7 + i * 1.3);
        m.compose(p, q.setFromEuler(e), s.set(1, flap > -0.2 ? flap : -0.2, 1));
        birds.setMatrixAt(i, m);
      }
      birds.instanceMatrix.needsUpdate = true;
      // Butterflies around the runestone meadow, close to the capsule window at the stop.
      for (let i = 0; i < 6; i++) {
        const k = t * (0.35 + i * 0.04) + i * 2.1;
        p.set(2.2 + Math.sin(k) * 1.4 + Math.sin(k * 2.3) * 0.4, 1.2 + Math.sin(k * 1.7) * 0.5 + (i % 3) * 0.35, -7 + Math.cos(k * 0.8) * 2.4);
        e.set(0, k * 1.3, 0);
        const f = Math.abs(Math.sin(t * 13 + i * 2));
        m.compose(p, q.setFromEuler(e), s.set(0.2 + f * 0.8, 1, 1).multiplyScalar(1.5));
        flies.setMatrixAt(i, m);
      }
      flies.instanceMatrix.needsUpdate = true;
    },
  };
}
