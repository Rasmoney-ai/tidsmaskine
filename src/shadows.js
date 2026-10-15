// Fake soft shadows: dark blurred discs on the ground (no real-time shadow maps).
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(80, 38, -55).normalize();

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export const SHADOW_MAT = new THREE.MeshBasicMaterial({
  color: 0x1c2410, map: blobTexture(), transparent: true, opacity: 0.38, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});
const GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

// Shadow offset away from the sun for an object of height h.
export function shadowOffset(h) { return { x: -SUN_DIR.x / SUN_DIR.y * h * 0.13, z: -SUN_DIR.z / SUN_DIR.y * h * 0.13 }; }

// Many static shadows in one draw call. items: [x, y, z, sizeX, sizeZ, yaw, height]
export function staticShadows(items) {
  const mesh = new THREE.InstancedMesh(GEO, SHADOW_MAT, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  items.forEach(([x, y, z, sx, sz, yaw = 0, h = 0], i) => {
    const o = shadowOffset(h);
    q.setFromAxisAngle(up, yaw);
    m.compose(new THREE.Vector3(x + o.x, y + 0.03, z + o.z), q, s.set(sx, 1, sz));
    mesh.setMatrixAt(i, m);
  });
  mesh.renderOrder = 1;
  return mesh;
}

// A single shadow that moves with a character (add as child of its root).
export function blob(size = 0.9) {
  const m = new THREE.Mesh(GEO, SHADOW_MAT);
  m.scale.set(size, 1, size);
  m.position.y = 0.03;
  m.renderOrder = 1;
  return m;
}
