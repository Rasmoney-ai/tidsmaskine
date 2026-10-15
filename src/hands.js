// The user's own hands as simple gloves (optional hand tracking). Joint poses come from three's XR hands.
import * as THREE from 'three';
import { paint, G, MAT } from './toon.js';

const BONES = [
  ['wrist', 'thumb-metacarpal'], ['thumb-metacarpal', 'thumb-phalanx-proximal'], ['thumb-phalanx-proximal', 'thumb-phalanx-distal'], ['thumb-phalanx-distal', 'thumb-tip'],
];
for (const f of ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger']) {
  BONES.push(['wrist', `${f}-metacarpal`], [`${f}-metacarpal`, `${f}-phalanx-proximal`], [`${f}-phalanx-proximal`, `${f}-phalanx-intermediate`],
    [`${f}-phalanx-intermediate`, `${f}-phalanx-distal`], [`${f}-phalanx-distal`, `${f}-tip`]);
}

export function buildHands(renderer, parent) {
  const jointGeo = paint(G.ball(1, 1), 0xf2f2ee);
  const boneGeo = paint(G.cyl(1, 1, 1, 6), 0xf2f2ee);
  boneGeo.translate(0, 0.5, 0);
  const hands = [0, 1].map((i) => {
    const hand = renderer.xr.getHand(i);
    parent.add(hand);
    const joints = new THREE.InstancedMesh(jointGeo, MAT.cabin, 25);
    const bones = new THREE.InstancedMesh(boneGeo, MAT.cabin, BONES.length);
    joints.frustumCulled = bones.frustumCulled = false;
    joints.visible = bones.visible = false;
    parent.add(joints, bones);
    return { hand, joints, bones };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  return {
    update() {
      for (const h of hands) {
        const J = h.hand.joints;
        const ok = J && J.wrist && J.wrist.visible;
        h.joints.visible = h.bones.visible = !!ok;
        if (!ok) continue;
        let i = 0;
        for (const name in J) {
          const j = J[name];
          const r = (j.jointRadius || 0.008) * 1.35;
          m.compose(j.position, j.quaternion, s.set(r, r, r));
          h.joints.setMatrixAt(i++, m);
          if (i >= 25) break;
        }
        h.joints.count = i;
        h.joints.instanceMatrix.needsUpdate = true;
        BONES.forEach(([a, b], k) => {
          const A = J[a], B = J[b];
          if (!A || !B) return;
          d.subVectors(B.position, A.position);
          const len = d.length();
          q.setFromUnitVectors(up, d.normalize());
          const r = (A.jointRadius || 0.008) * 1.1;
          m.compose(A.position, q, s.set(r, len, r));
          h.bones.setMatrixAt(k, m);
        });
        h.bones.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
