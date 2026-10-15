// Landscape: terrain, sky, light, fog, trees and grass. Low detail far away, fog hides the horizon.
import * as THREE from 'three';
import { MAT, Builder, G, rng, paint } from './toon.js';
import { WORLD } from './config.js';

const CENTER_X = -60, CENTER_Z = 0;

// Dirt paths (polyline segments) used for ground coloring.
const PATHS = [
  [[-170, 20], [-47, 20]], [[-47, 20], [-30, 21], [-14, 18], [-6, 4], [-2, -10]],
  [[-24, 33], [-17, 37]], [[-2, -14], [0, -24]], [[-98, 20], [-96, 6]], [[-84, 20], [-82, 34]],
];

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

export function pathDistance(x, z) {
  let d = Infinity;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++)
    d = Math.min(d, distToSeg(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// Ground height: nearly flat where things happen, gentle hills further out.
export function groundHeight(x, z) {
  const r = Math.hypot(x - CENTER_X, z - CENTER_Z);
  const small = 0.25 * Math.sin(x * 0.09 + 1.1) * Math.cos(z * 0.07);
  const hills = 3.2 * Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.015 - 0.4)
    + 1.8 * Math.sin(x * 0.041 + z * 0.029) + 1.2 * Math.sin(z * 0.06 - x * 0.02);
  return small + (hills + 4) * smooth(115, 260, r) * 1.6;
}

function terrainMesh(size, segs, offsetInside) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  geo.translate(CENTER_X, 0, CENTER_Z);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = groundHeight(x, z);
    if (offsetInside) {
      const inside = Math.max(Math.abs(x - CENTER_X), Math.abs(z - CENTER_Z));
      y -= 0.6 * (1 - smooth(140, 152, inside));
    }
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const col = new Float32Array(pos.count * 3);
  const rand = rng(7);
  const grass = new THREE.Color(0x86a352), grass2 = new THREE.Color(0x9fb265), dirt = new THREE.Color(0x9a7b50), c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const n = 0.5 + 0.5 * Math.sin(x * 0.11 + Math.cos(z * 0.13) * 2);
    c.copy(grass).lerp(grass2, n);
    if (!offsetInside) {
      const d = pathDistance(x, z);
      if (d < 2.2) c.lerp(dirt, 1 - smooth(1.2, 2.2, d));
    }
    c.multiplyScalar(0.94 + rand() * 0.1);
    for (let j = 0; j < 3; j++) col.set([c.r, c.g, c.b], (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, MAT.world);
}

function sky() {
  const geo = new THREE.SphereGeometry(480, 24, 12);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const top = new THREE.Color(0x7fb2dc), mid = new THREE.Color(0xb9d3e3), hor = new THREE.Color(WORLD.FOG_COLOR), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 480;
    if (h < 0.08) c.copy(hor); else if (h < 0.35) c.copy(hor).lerp(mid, (h - 0.08) / 0.27); else c.copy(mid).lerp(top, (h - 0.35) / 0.65);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  // Sun disc and a few flat cartoon clouds.
  const b = new Builder(3);
  b.add(G.ball(14, 1), 0xfff6d8, { pos: [300, 160, -260] });
  const r = rng(11);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 300 + r() * 120, y = 110 + r() * 70;
    for (let k = 0; k < 4; k++)
      b.add(G.ball(10 + r() * 14, 1), 0xffffff, { pos: [Math.cos(a) * d + k * 16 - 24, y + r() * 6, Math.sin(a) * d + r() * 10], scale: [1.6, 0.6, 1] });
  }
  const clouds = new THREE.Mesh(b.geometry(), MAT.glow.clone());
  clouds.material.fog = false; clouds.material.depthWrite = false; clouds.renderOrder = -9;
  m.add(clouds);
  return m;
}

function trees(rand) {
  const b = new Builder(5);
  b.add(G.cyl(0.25, 0.35, 3, 6), 0x6b4a2e, { pos: [0, 1.5, 0] });
  b.add(G.ball(2.2, 0), 0x3f7a3a, { pos: [0, 4.4, 0], scale: [1, 1.15, 1] });
  b.add(G.ball(1.6, 0), 0x4c8a40, { pos: [0.9, 5.5, 0.3] });
  b.add(G.ball(1.5, 0), 0x457f3a, { pos: [-0.9, 5.2, -0.5] });
  const geo = b.geometry();
  const spots = [];
  // Forest clumps around the scene, kept away from paths and buildings.
  const clumps = [[-150, -40, 25], [-125, 70, 20], [60, -40, 30], [55, 80, 28], [-60, -130, 35], [-40, 140, 30], [-200, 20, 40], [130, 10, 50], [-120, -90, 25]];
  for (const [cx, cz, r] of clumps)
    for (let i = 0; i < r * 1.6; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      spots.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]);
    }
  for (let i = 0; i < 160; i++) { const a = rand() * Math.PI * 2, d = 180 + rand() * 160; spots.push([CENTER_X + Math.cos(a) * d, Math.sin(a) * d]); }
  const ok = spots.filter(([x, z]) => pathDistance(x, z) > 8 && !(x > -60 && x < 30 && z > -95 && z < 70));
  const mesh = new THREE.InstancedMesh(geo, MAT.world, ok.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  ok.forEach(([x, z], i) => {
    const k = 0.8 + rand() * 0.7;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 0.2, z), q, s.set(k, k * (0.9 + rand() * 0.3), k));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHSL(0.27 + rand() * 0.06, 0.4, 0.45 + rand() * 0.15).multiplyScalar(2));
  });
  return mesh;
}

function scatter(geo, count, rand, filter, scaleRange, colorFn) {
  const mesh = new THREE.InstancedMesh(geo, MAT.world, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 6; tries++) {
    const x = CENTER_X + (rand() - 0.5) * 280, z = CENTER_Z + (rand() - 0.5) * 280;
    if (!filter(x, z)) continue;
    const k = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(new THREE.Vector3(x, groundHeight(x, z), z), q, s.set(k, k, k));
    mesh.setMatrixAt(n, m);
    if (colorFn) mesh.setColorAt(n, colorFn(c));
    n++;
  }
  mesh.count = n;
  return mesh;
}

export function buildWorld(scene, avoid) {
  const group = new THREE.Group();
  const rand = rng(42);
  group.add(terrainMesh(300, 100, false));
  group.add(terrainMesh(1000, 40, true));
  group.add(trees(rand));

  const free = (x, z) => pathDistance(x, z) > 1.8 && !avoid(x, z);
  const tuft = paint(G.cone(0.18, 0.5, 3), 0x5d8a35, { pos: [0, 0.2, 0] });
  group.add(scatter(tuft, 1800, rand, free, [0.7, 1.6]));
  const flower = paint(G.ball(0.07, 0), 0xffffff, { pos: [0, 0.18, 0] });
  group.add(scatter(flower, 500, rand, free, [0.8, 1.4], (c) => c.set([0xfff2a8, 0xffffff, 0xd9b3ff, 0xffd27a][Math.floor(rand() * 4)])));
  const rock = paint(G.dodeca(0.4), 0x8d8a83, { scale: [1, 0.6, 1] });
  group.add(scatter(rock, 120, rand, free, [0.5, 1.8]));

  scene.add(group);
  scene.add(sky());

  scene.fog = new THREE.FogExp2(WORLD.FOG_COLOR, WORLD.FOG_DENSITY);
  scene.background = new THREE.Color(WORLD.FOG_COLOR);
  const hemi = new THREE.HemisphereLight(0xdfefff, 0x6d7f45, 1.6);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(60, 70, -40);
  scene.add(hemi, sun);
  return group;
}
