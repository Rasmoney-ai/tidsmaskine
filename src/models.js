// Loads the GLB models from Claude Design (models/) and adapts them to the cel-shaded look.
// Missing files are skipped, and the code-built placeholders are used instead.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { MAT, toonMap } from './toon.js';

// Keys used in the code -> file in models/. Ids match MODELLER.md.
const KEYS = [
  'b1_langhus', 'b2_langhus_lille', 'b3_grubehus', 'b4_vaev', 'b5_braende', 'b6_ildsted', 'b7_toende', 'b8_broend',
  'b9_fisk', 'b10_baenk', 'b11_hegn', 'b12_faar', 'b13_kvinde', 'b14_mand', 'b15_dreng', 'b16_pige',
  'c1_palisade', 'c2_port', 'c3a_sten', 'c3b_sten', 'c3c_sten', 'c3d_sten', 'c4_toerv', 'c5_toervstak', 'c6_kaerre', 'c7_okse',
  'c8a_toervebaerer', 'c8b_toervebaerer', 'c8c_toervebaerer', 'c8d_toervebaerer',
  'd1_runesten', 'd2_gormsten', 'd3_kirke', 'd4_harald', 'd5_stenhugger', 'd6_poppo', 'd7a_vagt', 'd7b_vagt', 'd8_hund',
  'e1a_eg', 'e1b_eg', 'e1c_eg', 'e2a_birk', 'e2b_birk', 'e3_fjerntrae', 'e4a_busk', 'e4b_busk', 'e5a_sten', 'e5b_sten', 'e5c_sten',
  'e6_siv', 'e7_krage', 'e8a_sommerfugl', 'e8b_sommerfugl', 'e8c_sommerfugl',
  'f1_oekse', 'f2_hammer', 'f3_mejsel', 'f4_spyd', 'f5_skjold', 'f6_korsstav', 'f7_ten', 'f8_spand',
];

export async function loadModels(onProgress = () => {}) {
  const loader = new GLTFLoader();
  const out = {};
  let done = 0;
  await Promise.all(KEYS.map(async (key) => {
    try { out[key] = await loader.loadAsync(`models/${key}.glb`); } catch (e) { console.warn('Model not loaded:', key, e); }
    onProgress(++done / KEYS.length);
  }));
  return out;
}

// --- Static models -------------------------------------------------------

// All meshes merged into one faceted, vertex-colored geometry (bind pose for skinned meshes).
const geoCache = new WeakMap();
export function staticGeometry(gltf, filter = () => true) {
  if (geoCache.has(gltf) && filter.length === 0) return geoCache.get(gltf);
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !filter(o)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const n = g.attributes.position.count;
    const vc = g.attributes.color;
    const c = o.material.color || new THREE.Color(1, 1, 1);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set(vc ? [vc.getX(i) * c.r, vc.getY(i) * c.g, vc.getZ(i) * c.b] : [c.r, c.g, c.b], i * 3);
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  const geo = mergeGeometries(parts);
  if (filter.length === 0) geoCache.set(gltf, geo);
  return geo;
}

export function prop(gltf) { return new THREE.Mesh(staticGeometry(gltf), MAT.world); }

// Many copies in one draw call. items: [{ x, y, z, yaw, s }]
export function instanced(gltf, items) {
  const mesh = new THREE.InstancedMesh(staticGeometry(gltf), MAT.world, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromAxisAngle(up, it.yaw || 0);
    const k = it.s || 1;
    m.compose(v.set(it.x, it.y || 0, it.z), q, s.set(k, it.sy || k, k));
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

// Textured model (the runestones): keep the painted texture, use toon shading.
export function texturedProp(gltf) {
  const root = gltf.scene;
  root.traverse((o) => { if (o.isMesh) o.material = toonMap(o.material.map); });
  return root;
}

// Model with named parts kept separate (fire with flames, crow wings).
export function parts(gltf) {
  const root = gltf.scene, byName = {};
  root.traverse((o) => { if (o.isMesh) { o.material = MAT.world; byName[o.name] = o; } });
  return { root, parts: byName };
}

// --- Rigged characters ---------------------------------------------------

// One skinned mesh. Returns the scene root and bones by name.
// Note: each GLB is used once; several copies of the same rigged figure would need SkeletonUtils.clone.
export function riggedCharacter(gltf) {
  const root = gltf.scene;
  let mesh = null;
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    mesh = o;
    o.material = MAT.world;     // toon shading, keeps the vertex colors
    o.frustumCulled = false;    // bounds of skinned meshes do not follow the pose
  });
  const bones = {};
  mesh.skeleton.bones.forEach((b) => { bones[b.name] = b; });
  return { root, mesh, bones };
}

// Bone posing in character space. In the T-pose all bones have identity rest rotation,
// so a bone's rotation is "turn the rest direction into the wanted direction".
const _rest = new THREE.Matrix4(), _goal = new THREE.Matrix4(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

function basis(m, dir, ref) {
  _a.copy(dir).normalize();
  _b.copy(ref).addScaledVector(_a, -ref.dot(_a)).normalize();
  _c.crossVectors(_a, _b);
  return m.makeBasis(_a, _b, _c);
}

function parentQuat(bone, root, out) {
  out.identity();
  for (let p = bone.parent; p && p !== root; p = p.parent) out.premultiply(p.quaternion);
  return out;
}

export function aimBone(bone, root, restDir, restRef, dir, ref) {
  basis(_rest, restDir, restRef);
  basis(_goal, dir, ref);
  _goal.multiply(_rest.transpose());
  _q.setFromRotationMatrix(_goal);
  parentQuat(bone, root, _pq);
  bone.quaternion.copy(_pq.invert().multiply(_q));
}

export function restPosition(bone, root) {
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  bone.getWorldPosition(v);
  return root.worldToLocal(v);
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// Humanoid helper for Mixamo-named figures: arms, hands, legs and head in plain terms.
export class Humanoid {
  constructor(gltf) {
    const { root, mesh, bones } = riggedCharacter(gltf);
    this.root = root; this.mesh = mesh; this.B = bones;
    const rp = (n) => restPosition(bones[n], root);
    this.rest = {
      L: rp('LeftHand').sub(rp('LeftArm')).normalize(), R: rp('RightHand').sub(rp('RightArm')).normalize(),
    };
    this.shoulder = { L: rp('LeftArm'), R: rp('RightArm') };
    this.armLen = rp('LeftHand').distanceTo(rp('LeftArm'));
    this._d = new THREE.Vector3(); this._r = new THREE.Vector3(); this._h = new THREE.Vector3();
  }
  // Point the whole arm (upper arm + forearm straight) in a direction (character space).
  arm(side, dir, ref = Z) {
    const B = this.B, s = side === 'L' ? 'Left' : 'Right';
    this._d.copy(dir).normalize();
    // Twist reference: sideways, so the palm stays sensible; falls back to Z when pointing along it.
    this._r.crossVectors(side === 'L' ? this._d : Y, side === 'L' ? Y : this._d).addScaledVector(ref, 0.3);
    aimBone(B[s + 'Arm'], this.root, this.rest[side], Z, this._d, this._r);
    B[s + 'ForeArm'].quaternion.identity();
  }
  // Reach for a point (character space) with a bent elbow when the point is close.
  reach(side, target, ref = Z) {
    const B = this.B, s = side === 'L' ? 'Left' : 'Right', sh = this.shoulder[side];
    const to = this._h.subVectors(target, sh), d = Math.min(to.length(), this.armLen * 0.999);
    const half = this.armLen / 2, bend = Math.acos(Math.min(d / this.armLen, 1));
    to.normalize();
    // Upper arm tilts down by the bend angle; forearm comes back up toward the target.
    const side3 = new THREE.Vector3().crossVectors(to, Y).normalize();
    if (side3.lengthSq() < 1e-4) side3.copy(X);
    const up = new THREE.Vector3().crossVectors(side3, to).normalize();
    const upper = to.clone().multiplyScalar(Math.cos(bend)).addScaledVector(up, -Math.sin(bend));
    const elbow = sh.clone().addScaledVector(upper, half);
    const fore = new THREE.Vector3().subVectors(target, elbow).normalize();
    this._r.crossVectors(side === 'L' ? upper : Y, side === 'L' ? Y : upper).addScaledVector(ref, 0.3);
    aimBone(B[s + 'Arm'], this.root, this.rest[side], Z, upper, this._r);
    this._r.crossVectors(side === 'L' ? fore : Y, side === 'L' ? Y : fore).addScaledVector(ref, 0.3);
    aimBone(B[s + 'ForeArm'], this.root, this.rest[side], Z, fore, this._r);
  }
  // Turn the hand so an object held along the hand's +Z points in `dir`.
  holdDir(side, dir, armDir) {
    const s = side === 'L' ? 'Left' : 'Right';
    aimBone(this.B[s + 'Hand'], this.root, Z, this.rest[side], dir, armDir);
  }
  // Relaxed standing: arms down, slow breathing, gentle head movement.
  stand(t, seed = 0, look = 0.3) {
    const B = this.B;
    this.arm('L', this._h.set(0.2, -1, 0.06)); this.arm('R', this._h.set(-0.2, -1, 0.06));
    B.Spine1.rotation.x = 0.015 * Math.sin(t * 1.4 + seed);
    B.Head.rotation.set(0.04 * Math.sin(t * 0.5 + seed), look * Math.sin(t * 0.21 + seed), 0);
    this.legs(0, 0);
  }
  // Walking: phase in radians, amp = stride size.
  legs(phase, amp, knee = 0.6) {
    const B = this.B, s = Math.sin(phase);
    B.LeftUpLeg.rotation.set(-s * amp, 0, 0.03); B.RightUpLeg.rotation.set(s * amp, 0, -0.03);
    B.LeftLeg.rotation.x = Math.max(0, -Math.cos(phase)) * knee * amp * 2;
    B.RightLeg.rotation.x = Math.max(0, Math.cos(phase)) * knee * amp * 2;
    B.Hips.position.y = B.Hips.userData.y0 ??= B.Hips.position.y;
    B.Hips.position.y = B.Hips.userData.y0 + Math.abs(Math.cos(phase)) * 0.025 * (amp > 0 ? 1 : 0);
  }
  walk(phase, amp = 0.45) {
    this.legs(phase, amp);
    const s = Math.sin(phase) * amp * 0.8;
    this.arm('L', this._h.set(0.18, -1, s)); this.arm('R', this._h.set(-0.18, -1, -s));
  }
  // Hold something (attach to a hand bone). obj's grip at its origin, handle along +Z.
  attach(side, obj) { this.B[(side === 'L' ? 'Left' : 'Right') + 'Hand'].add(obj); return obj; }
}

// Four-legged animals (dog, ox, sheep): same simple skeleton names.
export function quadruped(gltf) {
  const { root, mesh, bones: B } = riggedCharacter(gltf);
  return {
    root, mesh, B,
    legs: [B.FL_Upper, B.FR_Upper, B.HL_Upper, B.HR_Upper],
    head: B.Head, neck: B.Neck, jaw: B.Jaw, tail: B.Tail,
  };
}
