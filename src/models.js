// Loads the GLB models from Claude Design (models/) and adapts them to the cel-shaded look.
// Missing files are skipped, and the code-built placeholders are used instead.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { MAT } from './toon.js';

const FILES = {
  man: 'models/b14_mand.glb',   // B14: man with axe (rigged, T-pose)
  axe: 'models/f_okse.glb',     // F: bearded axe (prop, grip at origin, handle along +Z)
};

export async function loadModels() {
  const loader = new GLTFLoader();
  const out = {};
  await Promise.all(Object.entries(FILES).map(async ([key, url]) => {
    try { out[key] = await loader.loadAsync(url); } catch (e) { console.warn('Model not loaded:', url, e); }
  }));
  return out;
}

// Rigged character (one skinned mesh). Returns the scene root and bones by Mixamo name.
// Note: each GLB is used once for now; several copies of the same figure will need SkeletonUtils.clone.
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

// Static prop: all parts merged into one faceted, vertex-colored mesh (one draw call).
export function mergedProp(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    g.applyMatrix4(o.matrixWorld);
    g.computeVertexNormals();
    const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  return new THREE.Mesh(mergeGeometries(parts), MAT.world);
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

// Rotation of a bone's parent chain up to (not including) the character root.
function parentQuat(bone, root, out) {
  out.identity();
  for (let p = bone.parent; p && p !== root; p = p.parent) out.premultiply(p.quaternion);
  return out;
}

// Point a limb: restDir/restRef describe the bone in T-pose, dir/ref the wanted pose (character space).
export function aimBone(bone, root, restDir, restRef, dir, ref) {
  basis(_rest, restDir, restRef);
  basis(_goal, dir, ref);
  _goal.multiply(_rest.transpose());
  _q.setFromRotationMatrix(_goal);
  parentQuat(bone, root, _pq);
  bone.quaternion.copy(_pq.invert().multiply(_q));
}

// Position of a bone in character space at rest (T-pose), e.g. the shoulders.
export function restPosition(bone, root) {
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  bone.getWorldPosition(v);
  return root.worldToLocal(v);
}
