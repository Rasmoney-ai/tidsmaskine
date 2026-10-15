// The time capsule cabin: always visible, fixed structure around the user, plus screens and the mist shell.
import * as THREE from 'three';
import { Builder, G, MAT, canvasTexture, wrapText } from './toon.js';
import { CAPSULE, SEAT_COUNT, seatPosition, WORLD } from './config.js';

MAT.cabin.side = THREE.DoubleSide;

const BRASS = 0xb08d4f, BRONZE = 0x3b332b, IRON = 0x24211e, WALNUT = 0x3a2c22, LEATHER = 0x6a2e24, DOME = 0x77726a;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
// A box stretched between two points (for ribs and struts).
function beam(b, from, to, thick, color) {
  _a.set(...from); _b.set(...to);
  const len = _a.distanceTo(_b);
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.clone().sub(_a).normalize());
  _e.setFromQuaternion(_q);
  b.add(G.box(thick, len, thick), color, { pos: [(_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2], rot: [_e.x, _e.y, _e.z] });
}

// Octagon helpers: corner k sits at angle PI/8 + k*PI/4 from +z, so one flat side faces forward (-z).
const corner = (k, r) => { const a = Math.PI / 8 + k * Math.PI / 4; return [r * Math.sin(a), r * Math.cos(a)]; };
const sideMid = (k) => (k + 1) * Math.PI / 4; // angle of the side between corner k and k+1

function ring(b, r, y, h, thick, color) {
  const ap = r * Math.cos(Math.PI / 8), len = 2 * r * Math.sin(Math.PI / 8);
  for (let k = 0; k < 8; k++) {
    const a = sideMid(k);
    b.add(G.box(len + thick * 0.8, h, thick), color, { pos: [ap * Math.sin(a), y, ap * Math.cos(a)], rot: [0, a, 0] });
  }
}

function cabinShell() {
  const { RADIUS: R, SILL, WALL_TOP: TOP, DOME_TOP } = CAPSULE;
  const b = new Builder(900);
  // Floor: dark walnut with brass inlay rings.
  b.add(G.cyl(R, R, 0.1, 8), WALNUT, { pos: [0, -0.05, 0], rot: [0, Math.PI / 8, 0], vary: 0.04 });
  for (const r of [1.3, 2.6, R - 0.25]) b.add(G.torus(r, 0.018, 3, 8), BRASS, { pos: [0, 0.004, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  // Base wall (bronze) with a brass cap and rivets.
  ring(b, R, SILL / 2, SILL, 0.12, BRONZE);
  ring(b, R - 0.04, SILL + 0.02, 0.05, 0.2, BRASS);
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = corner(k, R - 0.07), [x1, z1] = corner(k + 1, R - 0.07);
    for (let i = 1; i < 10; i++) { const f = i / 10; b.add(G.ball(0.018, 0), BRASS, { pos: [x0 + (x1 - x0) * f, SILL * 0.55, z0 + (z1 - z0) * f] }); }
  }
  // Corner posts with brass collars.
  for (let k = 0; k < 8; k++) {
    const [x, z] = corner(k, R);
    b.add(G.cyl(0.07, 0.09, TOP, 6), IRON, { pos: [x, TOP / 2, z] });
    for (const y of [SILL + 0.04, TOP - 0.1, 1.45]) b.add(G.cyl(0.1, 0.1, 0.06, 8), BRASS, { pos: [x, y, z] });
  }
  // Top ring beam, dome panels, ribs and oculus.
  ring(b, R, TOP, 0.16, 0.16, BRASS);
  const rTop = 1.05, domeH = DOME_TOP - TOP;
  b.add(new THREE.CylinderGeometry(rTop, R, domeH, 8, 1, true), DOME, { pos: [0, TOP + domeH / 2, 0], rot: [0, Math.PI / 8, 0], vary: 0.05 });
  for (let k = 0; k < 8; k++) {
    const [x0, z0] = corner(k, R - 0.02), [x1, z1] = corner(k, rTop);
    beam(b, [x0, TOP, z0], [x1, DOME_TOP, z1], 0.07, BRASS);
  }
  for (const f of [0.35, 0.7]) { const r = R + (rTop - R) * f; b.add(G.torus(r * Math.cos(Math.PI / 8) / Math.cos(Math.PI / 8), 0.03, 3, 8), BRASS, { pos: [0, TOP + domeH * f - 0.03, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] }); }
  b.add(G.torus(rTop, 0.06, 4, 8), BRASS, { pos: [0, DOME_TOP, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  // Front console: low desk following the front three sides.
  const ap = R * Math.cos(Math.PI / 8);
  for (const k of [2, 3, 4]) {
    const a = sideMid(k), len = 2 * (R - 0.55) * Math.sin(Math.PI / 8), d = ap - 0.5;
    b.add(G.box(len + 0.05, 0.62, 0.42), BRONZE, { pos: [d * Math.sin(a), 0.31, d * Math.cos(a)], rot: [0, a, 0] });
    b.add(G.box(len + 0.1, 0.05, 0.5), BRASS, { pos: [d * Math.sin(a), 0.64, d * Math.cos(a)], rot: [0, a, 0] });
  }
  for (let i = 0; i < 5; i++) b.add(G.cyl(0.11, 0.11, 0.04, 12), BRASS, { pos: [-1.0 + i * 0.5, 0.68, -ap + 0.48] });
  // Leather seats and tablet stands.
  const SH = CAPSULE.SEAT_HEIGHT;
  for (let n = 1; n <= SEAT_COUNT; n++) {
    const p = seatPosition(n);
    b.add(G.box(0.54, 0.13, 0.5), LEATHER, { pos: [p.x, SH - 0.06, p.z], vary: 0.05 });
    b.add(G.box(0.54, 0.5, 0.12), LEATHER, { pos: [p.x, SH + 0.28, p.z + 0.27], rot: [0.12, 0, 0], vary: 0.05 });
    for (const s of [-1, 1]) {
      b.add(G.box(0.07, 0.24, 0.46), BRONZE, { pos: [p.x + s * 0.3, SH + 0.08, p.z + 0.02] });
      b.add(G.box(0.09, 0.03, 0.48), BRASS, { pos: [p.x + s * 0.3, SH + 0.21, p.z + 0.02] });
    }
    b.add(G.cyl(0.05, 0.05, SH - 0.12, 8), BRASS, { pos: [p.x, (SH - 0.12) / 2, p.z] });
    b.add(G.cyl(0.2, 0.22, 0.03, 8), BRONZE, { pos: [p.x, 0.015, p.z] });
    b.add(G.cyl(0.016, 0.016, 0.88, 6), BRASS, { pos: [p.x, 0.44, p.z - 0.6] });
    b.add(G.box(0.47, 0.31, 0.03), IRON, { pos: [p.x, 0.97, p.z - 0.6], rot: [-0.55, 0, 0] });
  }
  const shell = b.mesh(MAT.cabin);

  // Lights: warm lamps on the posts, gauge faces, a thin floor light line.
  const g = new Builder(901);
  for (let k = 0; k < 8; k++) { const [x, z] = corner(k, R - 0.14); g.add(G.ball(0.045, 1), 0xffc77a, { pos: [x, TOP - 0.28, z] }); }
  for (let i = 0; i < 5; i++) g.add(G.cyl(0.085, 0.085, 0.01, 12), [0xf3e6c4, 0x9fe3d6, 0xf3e6c4, 0xffc77a, 0xf3e6c4][i], { pos: [-1.0 + i * 0.5, 0.705, -ap + 0.48] });
  g.add(G.box(0.025, 0.006, 4.6), 0xcfe9e4, { pos: [0, 0.004, 0] });
  ring(g, R - 0.1, TOP - 0.1, 0.012, 0.012, 0xdff6f2);
  ring(g, R - 0.2, 0.006, 0.006, 0.02, 0x8fd3c8);
  const glow = g.mesh(MAT.glow);

  // Glass: very faint tint so the walls read as glass without hiding anything.
  const gl = new Builder(903);
  for (let k = 0; k < 8; k++) {
    const a = sideMid(k), len = 2 * R * Math.sin(Math.PI / 8), d = ap - 0.02;
    gl.add(new THREE.PlaneGeometry(len, TOP - SILL), 0xbfe6ef, { pos: [d * Math.sin(a), (TOP + SILL) / 2, d * Math.cos(a)], rot: [0, a, 0] });
  }
  gl.add(new THREE.CircleGeometry(rTop, 8), 0xbfe6ef, { pos: [0, DOME_TOP, 0], rot: [-Math.PI / 2, 0, Math.PI / 8] });
  const glass = new THREE.Mesh(gl.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.07, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  glass.renderOrder = 5;
  return { shell, glow, glass };
}

// Armillary sphere above the console: the "engine" of the time machine.
function armillary() {
  const group = new THREE.Group();
  group.position.set(0, 2.95, -0.2);
  const b = new Builder(904);
  b.add(G.cyl(0.012, 0.012, 0.6, 6), BRASS, { pos: [0, 0.62, 0.1], rot: [0.3, 0, 0] });
  b.add(G.torus(0.42, 0.016, 4, 32), BRASS, { rot: [Math.PI / 2, 0, 0] });
  group.add(b.mesh(MAT.cabin));
  const rings = [0.36, 0.3, 0.24].map((r, i) => {
    const m = new THREE.Mesh(new Builder(905 + i).add(G.torus(r, 0.012 + i * 0.002, 4, 32), i === 1 ? 0xd9b46a : BRASS).geometry(), MAT.cabin);
    group.add(m); return m;
  });
  const orb = new THREE.Mesh(new Builder(908).add(G.ball(0.07, 2), 0x9feaff).geometry(), MAT.glow);
  group.add(orb);
  return { group, rings, orb };
}

// Mist shell around the capsule: hides the outside during time jumps / comfort mode.
function mistShell() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 }, uTime: { value: 0 }, uTunnel: { value: 0 }, uLab: { value: 1 },
      uCalm: { value: new THREE.Color(WORLD.MIST_STEALTH) }, uLabColor: { value: new THREE.Color(WORLD.MIST_LAB) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uOpacity, uTime, uTunnel, uLab; uniform vec3 uCalm, uLabColor; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float a = atan(d.x, d.z);
        // Two static patterns cross-fade: light shimmers without moving (no vection).
        float p1 = 0.5 + 0.5 * sin(a * 5.0 + d.y * 8.0);
        float p2 = 0.5 + 0.5 * sin(a * -4.0 + d.y * 11.0 + 1.7);
        float k = 0.5 + 0.5 * sin(uTime * 0.9);
        float bands = mix(p1, p2, k);
        vec3 tun = mix(vec3(0.10, 0.14, 0.42), vec3(0.42, 0.28, 0.78), bands);
        tun = mix(tun, vec3(1.0, 0.8, 0.42), pow(mix(p2, p1, k), 8.0) * 0.9);
        tun += vec3(0.85, 0.92, 1.0) * pow(max(-d.z, 0.0), 5.0) * 0.9;
        vec3 calm = mix(uCalm, uLabColor, uLab);
        // Lab: soft floor/horizon so the cabin does not float in a white void.
        calm *= mix(0.86, 1.0, smoothstep(-0.4, 0.2, d.y));
        gl_FragColor = vec4(mix(calm, tun, uTunnel), uOpacity);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 16), mat);
  m.renderOrder = 10;
  m.position.y = 1.2;
  return m;
}

// Overhead sign: year, place, stealth status.
function sign() {
  const { canvas, ctx, tex } = canvasTexture(1024, 192);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  mesh.position.set(0, 2.3, -CAPSULE.RADIUS * Math.cos(Math.PI / 8) + 0.14);
  mesh.rotation.x = 0.12;
  let last = '';
  return {
    mesh,
    draw(year, place, alarm, t) {
      const pulse = alarm ? (Math.sin(t * Math.PI * 2 * 0.8) > 0 ? 1 : 0) : 0;
      const key = `${year}|${place}|${alarm}|${pulse}`;
      if (key === last) return; last = key;
      ctx.fillStyle = '#0f1b22'; ctx.fillRect(0, 0, 1024, 192);
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 1012, 180);
      ctx.fillStyle = '#7fe0d4'; ctx.font = 'bold 34px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText('ÅR', 40, 62);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px ui-monospace, Consolas, monospace';
      ctx.fillText(String(year).padStart(4, ' '), 100, 104);
      ctx.fillStyle = '#7fe0d4'; ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText('STED', 470, 62);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText(place, 470, 116);
      const col = alarm ? (pulse ? '#ffb020' : '#a35a00') : '#3ee08f';
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(835, 96, 22, 0, 7); ctx.fill();
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(alarm ? 'OBSERVERET!' : 'STEALTH', 868, 80);
      ctx.fillStyle = '#9fb3ba'; ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(alarm ? 'af 1 hund' : 'aktiv', 868, 118);
      tex.needsUpdate = true;
    },
  };
}

// Tablet text shared by all seats (same texture on every tablet).
function tablets() {
  const { ctx, tex } = canvasTexture(1024, 660);
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(0.42, 0.27);
  const group = new THREE.Group();
  for (let n = 1; n <= SEAT_COUNT; n++) {
    const p = seatPosition(n);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, 0.975, p.z - 0.585);
    m.rotation.x = -0.55;
    group.add(m);
  }
  let last = '';
  return {
    group,
    draw(caption, chapters, chapterIdx) {
      const key = caption.key + '|' + chapterIdx;
      if (key === last) return; last = key;
      ctx.fillStyle = '#f4efe3'; ctx.fillRect(0, 0, 1024, 660);
      ctx.fillStyle = '#16323a'; ctx.fillRect(0, 0, 1024, 70);
      ctx.font = 'bold 28px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      let x = 30;
      chapters.forEach((c, i) => {
        const label = (i < chapterIdx ? '✓ ' : '') + c.name;
        ctx.fillStyle = i === chapterIdx ? '#ffc857' : i < chapterIdx ? '#7fe0d4' : '#6c8a91';
        ctx.fillText(label, x, 36);
        x += ctx.measureText(label).width + 30;
      });
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = caption.title.startsWith('!') ? '#b5470b' : '#16323a';
      ctx.font = 'bold 62px system-ui, sans-serif';
      ctx.fillText(caption.title.replace(/!/g, '⚠').trim(), 44, 160);
      ctx.fillStyle = '#26363b'; ctx.font = '42px system-ui, sans-serif';
      wrapText(ctx, caption.body, 44, 236, 936, 56);
      ctx.fillStyle = '#8a8270'; ctx.font = 'italic 26px system-ui, sans-serif';
      ctx.fillText('Billeder fra tiden: kommer senere', 44, 630);
      tex.needsUpdate = true;
    },
  };
}

export function buildCapsule() {
  const vehicle = new THREE.Group();
  const { shell, glow, glass } = cabinShell();
  vehicle.add(shell, glow, glass);
  const arm = armillary();
  vehicle.add(arm.group);
  const mist = mistShell();
  vehicle.add(mist);
  const s = sign();
  vehicle.add(s.mesh);
  const tabs = tablets();
  vehicle.add(tabs.group);
  const rig = new THREE.Group();
  vehicle.add(rig);
  return {
    vehicle, rig, mist, sign: s, tablets: tabs,
    animateCore(t, speedUp) {
      const k = 1 + speedUp * 6;
      arm.rings[0].rotation.set(t * 0.21 * k, t * 0.13 * k, 0);
      arm.rings[1].rotation.set(0, t * 0.17 * k, t * 0.11 * k);
      arm.rings[2].rotation.set(t * 0.09 * k, 0, t * 0.23 * k);
      arm.orb.scale.setScalar(1 + speedUp * 0.8 + 0.06 * Math.sin(t * 2));
    },
  };
}

export function placeRig(rig, seat) {
  const p = seatPosition(seat);
  rig.position.set(p.x, 0, p.z);
}
