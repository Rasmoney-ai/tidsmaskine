// Shared cel-shaded materials and a helper that merges low-poly parts into one vertex-colored mesh.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

function gradient(steps) {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round(95 + (160 * i) / (steps - 1));
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const GRADIENT = gradient(4);

// World objects: affected by fog. Cabin objects: never fogged (cabin stays clear in mist).
export const MAT = {
  world: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT }),
  cabin: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT, fog: false }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
};

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1410, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (sh) => {
  sh.uniforms.uThick = { value: 0.012 };
  sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.012;');
};

// Ink outline around a mesh (one extra draw call). Uses smooth normals so the hull has no cracks.
export function outline(mesh, mat = OUTLINE) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', mesh.geometry.attributes.position.clone());
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  const o = new THREE.Mesh(merged, mat);
  mesh.add(o);
  return o;
}

export function thickOutline(thick) {
  const m = OUTLINE.clone();
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thick.toFixed(3)};`); };
  m.customProgramCacheKey = () => 'outline' + thick;
  return m;
}

// Deterministic random numbers.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// Prepare a geometry: flat normals, vertex colors, no uvs.
export function paint(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], vary = 0, rand = null } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...(Array.isArray(scale) ? scale : [scale, scale, scale])));
  g.applyMatrix4(_m);
  g.computeVertexNormals();
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  _c.set(color);
  const r = rand || Math.random;
  for (let i = 0; i < n; i += 3) {
    const k = vary ? 1 + (r() * 2 - 1) * vary : 1;
    for (let j = 0; j < 3; j++) arr.set([_c.r * k, _c.g * k, _c.b * k], (i + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export class Builder {
  constructor(seed = 1) { this.parts = []; this.rand = rng(seed); }
  add(geo, color, opts = {}) { this.parts.push(paint(geo, color, { rand: this.rand, ...opts })); return this; }
  addGeo(g) { this.parts.push(g); return this; }
  geometry() { return mergeGeometries(this.parts); }
  mesh(mat = MAT.world) { return new THREE.Mesh(this.geometry(), mat); }
}

export const G = {
  box: (w = 1, h = 1, d = 1) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg),
  cone: (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg),
  ball: (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail),
  dodeca: (r) => new THREE.DodecahedronGeometry(r, 0),
  torus: (r, t, rs = 6, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
};

// Canvas texture helper.
export function canvasTexture(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

// Word-wrap text on a canvas. Returns y after the last line.
export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lineH; }
    else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}
