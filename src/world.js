// Landscape: terrain, sky, light, fog, trees and grass. Low detail far away, fog hides the horizon.
import * as THREE from 'three';
import { MAT, Builder, G, rng, paint } from './toon.js';
import { WORLD } from './config.js';
import { SUN_DIR, staticShadows } from './shadows.js';
import { instanced } from './models.js';

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

// Strip fields near the village: [x0, z0, x1, z1].
export const FIELDS = [[-152, 31, -112, 64], [-146, -46, -114, -14], [-104, 50, -84, 74]];
export const POND = { x: 40, z: 4, r: 12 };

export function fieldStripe(x, z) {
  for (let i = 0; i < FIELDS.length; i++) {
    const [x0, z0, x1, z1] = FIELDS[i];
    if (x > x0 && x < x1 && z > z0 && z < z1) return Math.floor((x - x0) / 5.5) + i * 3;
  }
  return -1;
}

const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// Ground height: nearly flat where things happen, gentle hills further out.
export function groundHeight(x, z) {
  const r = Math.hypot(x - CENTER_X, z - CENTER_Z);
  const small = 0.25 * Math.sin(x * 0.09 + 1.1) * Math.cos(z * 0.07);
  const hills = 3.2 * Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.015 - 0.4)
    + 1.8 * Math.sin(x * 0.041 + z * 0.029) + 1.2 * Math.sin(z * 0.06 - x * 0.02);
  const pd = Math.hypot(x - POND.x, z - POND.z);
  return small + (hills + 4) * smooth(115, 260, r) * 1.6 - 0.9 * smooth(POND.r + 3, POND.r - 3, pd);
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
  const grass = new THREE.Color(0x6f8f43), grass2 = new THREE.Color(0x8c9a4e), straw = new THREE.Color(0xa99a5c), heath = new THREE.Color(0x7d6a6a);
  const dirt = new THREE.Color(0x8a6c48), mud = new THREE.Color(0x6a5a40), sand = new THREE.Color(0xb3a27a);
  const STRIPES = [0xc9a75a, 0x7a6243, 0x8fa24e, 0xb89a50, 0x6f5a3e, 0xbfa35e, 0x93a352, 0xc4a65c, 0x7d6545].map((h) => new THREE.Color(h));
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const big = 0.5 + 0.5 * Math.sin(x * 0.031 + Math.cos(z * 0.027) * 1.7) * Math.sin(z * 0.023 + 0.8);
    const fine = 0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.07) * Math.cos(z * 0.11 - x * 0.05);
    c.copy(grass).lerp(grass2, big * 0.8 + fine * 0.3);
    c.lerp(straw, smooth(0.62, 0.95, big) * 0.6);
    const far = Math.hypot(x - CENTER_X, z - CENTER_Z);
    c.lerp(heath, smooth(140, 260, far) * smooth(0.4, 0.8, fine) * 0.5);
    const st = fieldStripe(x, z);
    if (st >= 0) c.copy(STRIPES[st % STRIPES.length]);
    const pd = Math.hypot(x - POND.x, z - POND.z);
    if (pd < POND.r + 3) c.lerp(pd < POND.r + 0.8 ? sand : mud, 1 - smooth(POND.r, POND.r + 3, pd));
    if (!offsetInside) {
      const d = pathDistance(x, z);
      if (d < 2.4) c.lerp(d < 1.0 ? mud : dirt, 1 - smooth(1.2, 2.4, d));
    }
    c.multiplyScalar(0.94 + rand() * 0.1);
    for (let j = 0; j < 3; j++) col.set([c.r, c.g, c.b], (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, MAT.world);
}

function sky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(0x5e8fc4) }, uMid: { value: new THREE.Color(0xa9c6dc) },
      uHor: { value: new THREE.Color(WORLD.FOG_COLOR) }, uSun: { value: new THREE.Color(0xfff1cf) },
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uMid, uHor, uSun, uSunDir; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.25, h));
        c = mix(c, uTop, smoothstep(0.25, 0.9, h));
        c = mix(c, uHor * 0.92, smoothstep(0.0, -0.2, h));
        float s = max(dot(normalize(vDir), uSunDir), 0.0);
        c += uSun * (pow(s, 600.0) * 3.0 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 16), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  // Cel-shaded cumulus clouds (lit by the sun, no fog).
  const b = new Builder(3);
  const r = rng(11);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = 330 + r() * 110, y = 120 + r() * 90;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d, n = 4 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const s = 9 + r() * 13;
      b.add(G.ball(s, 1), 0xffffff, { pos: [cx + (k - n / 2) * 13 + r() * 6, y + r() * 9, cz + r() * 14], scale: [1.4, 0.75, 1.1] });
    }
    b.add(G.ball(26, 1), 0xf3f1ea, { pos: [cx, y - 6, cz], scale: [2.6, 0.3, 1.4] });
  }
  // Unlit clouds with a soft vertical gradient: bright tops, cool grey bellies.
  const cg = b.geometry(), cp = cg.attributes.position, cc = cg.attributes.color;
  const top = new THREE.Color(0xfffaf0), belly = new THREE.Color(0xc9d2dc), cc2 = new THREE.Color();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < cp.count; i++) { minY = Math.min(minY, cp.getY(i)); maxY = Math.max(maxY, cp.getY(i)); }
  for (let i = 0; i < cp.count; i += 3) {
    const y = (cp.getY(i) + cp.getY(i + 1) + cp.getY(i + 2)) / 3;
    const ny = (cp.getNormal ? 0 : 0) + (cg.attributes.normal.getY(i) + 1) / 2;
    cc2.copy(belly).lerp(top, Math.min(1, ny * 1.2));
    for (let j = 0; j < 3; j++) cc.setXYZ(i + j, cc2.r, cc2.g, cc2.b);
  }
  const clouds = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false }));
  clouds.renderOrder = -9;
  m.add(clouds);
  // Distant hill layers fading into the haze (aerial perspective, pre-blended colors).
  const hor = new THREE.Color(WORLD.FOG_COLOR);
  [[330, 0x6f8a5a, 0.55, 26], [420, 0x7f9a78, 0.72, 40]].forEach(([rad, col, haze, hgt], li) => {
    const pts = [], segs = 64, rr = rng(30 + li);
    const pos = [];
    for (let i = 0; i <= segs; i++) {
      const a = i / segs * Math.PI * 2;
      const h = hgt * (0.35 + 0.65 * Math.abs(Math.sin(a * (3 + li) + rr() * 0.6)) * (0.6 + rr() * 0.4));
      pts.push([Math.cos(a) * rad, h, Math.sin(a) * rad]);
    }
    for (let i = 0; i < segs; i++) {
      const [x0, h0, z0] = pts[i], [x1, h1, z1] = pts[i + 1];
      pos.push(x0, -20, z0, x1, -20, z1, x1, h1, z1, x0, -20, z0, x1, h1, z1, x0, h0, z0);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const c = new THREE.Color(col).lerp(hor, haze);
    const hm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, fog: false, side: THREE.DoubleSide, depthWrite: false }));
    hm.renderOrder = -8 + li * -0.5;
    m.add(hm);
  });
  return m;
}

function trees(rand, M = {}) {
  const b = new Builder(5);
  b.add(G.cyl(0.25, 0.35, 3, 6), 0x6b4a2e, { pos: [0, 1.5, 0] });
  b.add(G.ball(2.2, 0), 0x3f7a3a, { pos: [0, 4.4, 0], scale: [1, 1.15, 1] });
  b.add(G.ball(1.6, 0), 0x4c8a40, { pos: [0.9, 5.5, 0.3] });
  b.add(G.ball(1.5, 0), 0x457f3a, { pos: [-0.9, 5.2, -0.5] });
  const geo = b.geometry();
  const bb = new Builder(6);
  bb.add(G.cyl(0.13, 0.18, 6, 6), 0xe8e4da, { pos: [0, 3, 0] });
  for (let i = 0; i < 4; i++) bb.add(G.box(0.2, 0.06, 0.2), 0x2b2b2b, { pos: [0, 0.8 + i * 1.3, 0.12], rot: [0, i, 0] });
  bb.add(G.ball(1.5, 0), 0x8fae4a, { pos: [0, 5.6, 0], scale: [0.9, 1.6, 0.9] });
  bb.add(G.ball(1.1, 0), 0x9dba55, { pos: [0.5, 6.6, 0.2], scale: [1, 1.4, 1] });
  const birchGeo = bb.geometry();
  const spots = [];
  // Forest clumps around the scene, kept away from paths and buildings.
  const clumps = [[-150, -40, 25], [-125, 70, 20], [60, -40, 30], [55, 80, 28], [-60, -130, 35], [-40, 140, 30], [-200, 20, 40], [130, 10, 50], [-120, -90, 25]];
  for (const [cx, cz, r] of clumps)
    for (let i = 0; i < r * 1.6; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      spots.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]);
    }
  for (let i = 0; i < 100; i++) { const a = rand() * Math.PI * 2, d = 180 + rand() * 160; spots.push([CENTER_X + Math.cos(a) * d, Math.sin(a) * d]); }
  const ok = spots.filter(([x, z]) => pathDistance(x, z) > 8 && fieldStripe(x, z) < 0 && Math.hypot(x - POND.x, z - POND.z) > POND.r + 4 && !(x > -60 && x < 30 && z > -95 && z < 70));
  if (M.e1a_eg && M.e2a_birk && M.e3_fjerntrae) {
    const keys = ['e1a_eg', 'e1b_eg', 'e1c_eg', 'e2a_birk', 'e2b_birk'].filter((k) => M[k]);
    const lists = Object.fromEntries(keys.concat('e3_fjerntrae').map((k) => [k, []]));
    const shadows = [];
    ok.forEach(([x, z], i) => {
      const far = Math.hypot(x - CENTER_X, z - CENTER_Z) > 170;
      const key = far ? 'e3_fjerntrae' : i % 4 === 1 ? keys.filter((k) => k.includes('birk'))[i % 2] || keys[0] : keys.filter((k) => k.includes('eg'))[i % 3] || keys[0];
      const k = (far ? 1.6 : 0.85) + rand() * 0.45;
      lists[key].push({ x, z, y: groundHeight(x, z) - 0.1, yaw: rand() * 6.28, s: k });
      if (!far) shadows.push([x, groundHeight(x, z), z, 6 * k, 6 * k, 0, 4 * k]);
    });
    const g = new THREE.Group();
    g.instanced = Object.entries(lists).filter(([, l]) => l.length).map(([key, l]) => instanced(M[key], l));
    g.add(...g.instanced, staticShadows(shadows));
    return g;
  }
  const birches = ok.filter((_, i) => i % 4 === 1), oaks = ok.filter((_, i) => i % 4 !== 1);
  const mesh = new THREE.InstancedMesh(geo, MAT.world, oaks.length);
  const birch = new THREE.InstancedMesh(birchGeo, MAT.world, birches.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  const shadows = [];
  birches.forEach(([x, z], i) => {
    const k = 0.8 + rand() * 0.5;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 0.2, z), q, s.set(k, k, k));
    birch.setMatrixAt(i, m);
    shadows.push([x, groundHeight(x, z), z, 3.5 * k, 3.5 * k, 0, 5 * k]);
  });
  oaks.forEach(([x, z], i) => {
    const k = 0.8 + rand() * 0.7;
    shadows.push([x, groundHeight(x, z), z, 5.5 * k, 5.5 * k, 0, 4 * k]);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(new THREE.Vector3(x, groundHeight(x, z) - 0.2, z), q, s.set(k, k * (0.9 + rand() * 0.3), k));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setRGB(0.85 + rand() * 0.25, 0.9 + rand() * 0.2, 0.8 + rand() * 0.2));
  });
  const g = new THREE.Group();
  g.add(mesh, birch, staticShadows(shadows));
  g.instanced = [mesh, birch];
  return g;
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

export function buildWorld(scene, avoid, M = {}) {
  const group = new THREE.Group();
  const rand = rng(42);
  group.add(terrainMesh(300, 100, false));
  group.add(terrainMesh(1000, 40, true));
  const forest = trees(rand, M);
  group.add(forest);
  // Small decoration that the automatic quality control may hide first.
  const decor = new THREE.Group();
  group.add(decor);

  const free = (x, z) => pathDistance(x, z) > 1.8 && !avoid(x, z);
  const free2 = (x, z) => free(x, z) && fieldStripe(x, z) < 0 && Math.hypot(x - POND.x, z - POND.z) > POND.r + 1;
  // No grass blades: the meadow is colored ground faces. A few flowers add life.
  const flower = paint(G.ball(0.07, 0), 0xffffff, { pos: [0, 0.12, 0] });
  decor.add(scatter(flower, 400, rand, free2, [0.8, 1.5], (c) => c.set([0xfff2a8, 0xffffff, 0xc9a3f0, 0xffd27a, 0xe8584a][Math.floor(rand() * 5)])));
  // Bushes.
  const bush = new Builder(10);
  bush.add(G.ball(0.9, 0), 0x4f6e32, { pos: [0, 0.6, 0] }).add(G.ball(0.7, 0), 0x5a7a38, { pos: [0.7, 0.5, 0.2] }).add(G.ball(0.6, 0), 0x47652d, { pos: [-0.6, 0.45, -0.2] });
  const pick = (keys) => keys.filter((k) => M[k]);
  const scatterModels = (keys, count, filter, range) => {
    // Spread `count` copies over the given model variants.
    const lists = keys.map(() => []);
    for (let tries = 0, n = 0; n < count && tries < count * 6; tries++) {
      const x = CENTER_X + (rand() - 0.5) * 280, z = CENTER_Z + (rand() - 0.5) * 280;
      if (!filter(x, z)) continue;
      lists[n % keys.length].push({ x, z, y: groundHeight(x, z), yaw: rand() * 6.28, s: range[0] + rand() * (range[1] - range[0]) });
      n++;
    }
    return keys.map((k, i) => instanced(M[k], lists[i]));
  };
  if (pick(['e4a_busk', 'e4b_busk']).length) decor.add(...scatterModels(pick(['e4a_busk', 'e4b_busk']), 220, (x, z) => free2(x, z) && Math.hypot(x - CENTER_X, z) > 70, [0.8, 1.5]));
  else decor.add(scatter(bush.geometry(), 220, rand, (x, z) => free2(x, z) && Math.hypot(x - CENTER_X, z) > 70, [0.7, 1.6]));
  // Pond with reeds.
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 1.2, 28).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4f7f95 }));
  water.position.set(POND.x, -0.32, POND.z);
  group.add(water);
  const glint = new Builder(11);
  for (let i = 0; i < 6; i++) glint.add(G.box(3 + i * 0.7, 0.01, 0.12), 0xcfe3e8, { pos: [POND.x - 2 + i * 0.6, -0.3, POND.z - 4 + i * 1.4], rot: [0, 0.6, 0] });
  group.add(glint.mesh());
  const reed = new Builder(12);
  for (let i = 0; i < 5; i++) reed.add(G.cone(0.03, 1.4 + i * 0.12, 3), 0x7a8a46, { pos: [Math.cos(i * 1.3) * 0.15, 0.7, Math.sin(i * 1.3) * 0.15], rot: [Math.cos(i) * 0.15, 0, Math.sin(i) * 0.15] });
  reed.add(G.cyl(0.04, 0.04, 0.25, 5), 0x5a3e26, { pos: [0, 1.5, 0] });
  const reeds = M.e6_siv ? new THREE.InstancedMesh(instanced(M.e6_siv, []).geometry, MAT.world, 90) : new THREE.InstancedMesh(reed.geometry(), MAT.world, 90);
  const rm = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, d = POND.r - 0.5 + rand() * 2.2;
    const x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d, k = 0.7 + rand() * 0.6;
    rm.makeScale(k, k, k).setPosition(x, Math.max(groundHeight(x, z), -0.35), z);
    reeds.setMatrixAt(i, rm);
  }
  group.add(reeds);
  const rock = paint(G.dodeca(0.4), 0x8d8a83, { scale: [1, 0.6, 1] });
  if (pick(['e5a_sten', 'e5b_sten', 'e5c_sten']).length) decor.add(...scatterModels(pick(['e5a_sten', 'e5b_sten', 'e5c_sten']), 120, free, [0.6, 1.4]));
  else decor.add(scatter(rock, 120, rand, free, [0.5, 1.8]));

  scene.add(group);
  scene.add(sky());

  scene.fog = new THREE.FogExp2(WORLD.FOG_COLOR, WORLD.FOG_DENSITY);
  scene.background = new THREE.Color(WORLD.FOG_COLOR);
  const hemi = new THREE.HemisphereLight(0xc4d8ec, 0x6e6048, 1.15);
  const sun = new THREE.DirectionalLight(0xffe4bd, 3.2);
  sun.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(hemi, sun);
  group.decor = decor;
  group.forest = forest;
  return group;
}
