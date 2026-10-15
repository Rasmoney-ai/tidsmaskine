// The time capsule cabin: always visible, fixed structure around the user, plus screens and the mist shell.
import * as THREE from 'three';
import { Builder, G, MAT, canvasTexture, wrapText } from './toon.js';
import { CAPSULE, SEAT_COUNT, seatPosition, WORLD } from './config.js';

MAT.cabin.side = THREE.DoubleSide;

const CREAM = 0xe9e4d6, BRASS = 0xa8894e, DARK = 0x2c3a42, TEAL = 0x2a7f86;

function cabinShell() {
  const { HALF_WIDTH: W, FRONT_Z: F, REAR_Z: R } = CAPSULE;
  const L = R - F, cz = (F + R) / 2;
  const b = new Builder(900);
  b.add(G.box(W * 2, 0.1, L), 0x3c4a52, { pos: [0, -0.05, cz] });
  // Lower walls and sills.
  for (const s of [-1, 1]) {
    b.add(G.box(0.12, 0.55, L), CREAM, { pos: [s * W, 0.275, cz] });
    b.add(G.box(0.2, 0.05, L), BRASS, { pos: [s * (W - 0.08), 0.57, cz] });
    b.add(G.box(0.14, 0.12, L), BRASS, { pos: [s * W, 2.06, cz] });
    for (let z = F + 0.05; z <= R + 0.01; z += 1.1) b.add(G.box(0.1, 1.5, 0.12), DARK, { pos: [s * W, 1.32, z] });
  }
  // Roof as a shallow arc.
  const Rr = 2.857, cy = -0.307, half = Math.asin(W / Rr);
  b.add(new THREE.CylinderGeometry(Rr, Rr, L, 14, 1, true, -half, half * 2), CREAM, { pos: [0, cy, cz], rot: [-Math.PI / 2, 0, 0] });
  for (let z = F + 0.05; z <= R + 0.01; z += 1.1)
    b.add(G.torus(Rr - 0.03, 0.045, 4, 14, half * 2), BRASS, { pos: [0, cy, z], rot: [0, 0, Math.PI / 2 - half] });
  // Front: dashboard, window pillars, frame.
  b.add(G.box(W * 2, 0.5, 0.15), CREAM, { pos: [0, 0.25, F] });
  b.add(G.box(W * 2 - 0.2, 0.08, 0.45), DARK, { pos: [0, 0.52, F + 0.22], rot: [0.18, 0, 0] });
  b.add(G.box(W * 2, 0.12, 0.14), BRASS, { pos: [0, 2.06, F] });
  b.add(G.box(W * 2, 0.05, 0.14), BRASS, { pos: [0, 0.53, F] });
  // Rear wall with the time core.
  b.add(G.box(W * 2, 2.5, 0.15), CREAM, { pos: [0, 1.25, R] });
  b.add(G.torus(0.62, 0.07, 6, 24), BRASS, { pos: [0, 1.4, R - 0.1] });
  // Seats with small tablet stands.
  for (let n = 1; n <= SEAT_COUNT; n++) {
    const p = seatPosition(n);
    b.add(G.box(0.5, 0.1, 0.48), TEAL, { pos: [p.x, CAPSULE.SEAT_HEIGHT - 0.05, p.z] });
    b.add(G.box(0.5, 0.72, 0.08), TEAL, { pos: [p.x, CAPSULE.SEAT_HEIGHT + 0.36, p.z + 0.27], rot: [0.12, 0, 0] });
    b.add(G.cyl(0.05, 0.08, CAPSULE.SEAT_HEIGHT - 0.1, 8), DARK, { pos: [p.x, (CAPSULE.SEAT_HEIGHT - 0.1) / 2, p.z] });
    b.add(G.cyl(0.018, 0.018, 0.88, 6), DARK, { pos: [p.x, 0.44, p.z - 0.6] });
    b.add(G.box(0.46, 0.3, 0.03), DARK, { pos: [p.x, 0.97, p.z - 0.6], rot: [-0.55, 0, 0] });
  }
  const shell = b.mesh(MAT.cabin);

  // Glowing details.
  const g = new Builder(901);
  g.add(G.box(0.24, 0.012, L - 0.4), 0x2f8f8a, { pos: [0, 0.006, cz] });
  g.add(G.box(0.06, 0.03, L - 0.3), 0xbff5ee, { pos: [0, 2.53, cz] });
  for (let i = 0; i < 9; i++) g.add(G.box(0.05, 0.02, 0.05), [0x56e39f, 0xffc857, 0x6ec6ff][i % 3], { pos: [-0.9 + i * 0.22, 0.58, F + 0.2] });
  g.add(G.ball(0.3, 1), 0x9feaff, { pos: [0, 1.4, R - 0.12], scale: [1, 1, 0.3] });
  return { shell, glow: g.mesh(MAT.glow) };
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
  mesh.position.set(0, 2.24, CAPSULE.FRONT_Z + 0.12);
  mesh.rotation.x = 0.18;
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
  const { shell, glow } = cabinShell();
  vehicle.add(shell, glow);
  // Rotating rings in the time core (decoration, slow).
  const core = new THREE.Group();
  core.position.set(0, 1.4, CAPSULE.REAR_Z - 0.15);
  const ringGeo = new Builder(902).add(G.torus(0.45, 0.025, 4, 24), 0x9feaff).geometry();
  const rings = [0, 1].map((i) => { const m = new THREE.Mesh(ringGeo, MAT.glow); m.scale.setScalar(1 - i * 0.25); core.add(m); return m; });
  vehicle.add(core);
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
      rings[0].rotation.y = t * (0.4 + speedUp * 2.5);
      rings[1].rotation.x = t * (0.3 + speedUp * 2.0);
    },
  };
}

export function placeRig(rig, seat) {
  const p = seatPosition(seat);
  rig.position.set(p.x, 0, p.z);
}
