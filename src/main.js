import * as THREE from 'three';
import { CAPSULE, COUNTDOWN, SEAT_COUNT, WORLD } from './config.js';
import { Timeline } from './timeline.js';
import { LocalClock } from './clock.js';
import { buildWorld } from './world.js';
import { buildJelling, occupied } from './jelling.js';
import { buildCapsule, placeRig } from './capsule.js';
import { buildHands } from './hands.js';
import { Audio } from './audio.js';
import { initUI } from './ui.js';

const params = new URLSearchParams(location.search);
const state = {
  seat: Math.min(Math.max(parseInt(params.get('seat'), 10) || 1, 1), SEAT_COUNT),
  comfort: params.get('comfort') === '1',
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1000);

const timeline = new Timeline();
console.info('Trip check', timeline.report());

const world = buildWorld(scene, occupied);
const jelling = buildJelling(scene, timeline);
const capsule = buildCapsule();
scene.add(capsule.vehicle);
capsule.rig.add(camera);
placeRig(capsule.rig, state.seat);
const hands = buildHands(renderer, capsule.rig);
const clock = new LocalClock(-COUNTDOWN);
const audio = new Audio();

// Desktop look-around.
const look = { yaw: 0, pitch: -0.12 };
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  look.yaw += (e.clientX - drag.x) * 0.004; look.pitch += (e.clientY - drag.y) * 0.004;
  look.pitch = Math.max(-1.3, Math.min(1.3, look.pitch));
  drag = { x: e.clientX, y: e.clientY };
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const app = {
  timeline, clock, audio, state,
  restart(play = true) { clock.pause(); clock.seek(-COUNTDOWN); if (play) clock.play(); },
  setSeat(n) { state.seat = n; placeRig(capsule.rig, n); },
  setComfort(on) { state.comfort = on; },
  jumpChapter(dir) {
    const t = clock.t, ch = timeline.chapters;
    let i = timeline.chapterIndex(Math.max(t, 0));
    if (dir < 0 && t - ch[i].t < 2) i -= 1; else if (dir > 0) i += 1;
    i = Math.max(0, Math.min(ch.length - 1, i));
    clock.seek(ch[i].t + (dir > 0 || i > 0 ? 0.01 : 0));
  },
  seekBy(dt) { clock.seek(Math.max(-COUNTDOWN, Math.min(timeline.duration, clock.t + dt))); },
};
app.look = look;
app.renderer = renderer;
window.app = app;
initUI(app, renderer);

// Sound cues -----------------------------------------------------------
let lastT = clock.t;
const tmp = {};
function emitterGain(x, z, st, vx, vz, yaw) {
  const dx = x - vx, dz = z - vz, d = Math.hypot(dx, dz);
  const gain = (1.4 / (1 + d / 5)) * (1 - st.mist);
  const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  return { gain: Math.min(gain, 1), pan: Math.max(-0.9, Math.min(0.9, lx / (d + 1))) };
}

function sounds(t, st) {
  const dt = t - lastT;
  if (clock.playing && dt > 0 && dt < 0.5) {
    for (const k of [-3, -2, -1]) if (lastT < k && t >= k) audio.play('beep', 0.8);
    if (lastT < 0 && t >= 0) audio.play('go', 0.8);
    for (const s of timeline.sounds) if (s.t > lastT && s.t <= t) audio.play(s.name, 0.9);
    for (const e of jelling.emitters) {
      let fire = false;
      if (e.once !== undefined) fire = e.once > lastT && e.once <= t;
      else fire = Math.floor((t - e.offset) / e.period) > Math.floor((lastT - e.offset) / e.period) && (!e.until || t < e.until);
      if (!fire) continue;
      const x = e.follow ? e.follow.position.x : e.x, z = e.follow ? e.follow.position.z : e.z;
      const { gain, pan } = emitterGain(x, z, st, st.x, st.z, st.yaw);
      audio.play(e.name, e.name === 'bark' ? Math.max(gain, 0.5) : gain, pan);
    }
  }
  lastT = t;
  audio.setLevels({ hum: clock.playing ? 1 : 0.3, outside: 1 - st.mist, jump: st.jumping ? st.jumpProgress : 0 });
}

// Frame loop -------------------------------------------------------------
const st = {};
const fogBase = new THREE.Color(WORLD.FOG_COLOR), fogLab = new THREE.Color(WORLD.MIST_LAB), fogCalm = new THREE.Color(WORLD.MIST_STEALTH);
const fogTunnel = new THREE.Color(0x3a3a8a);

renderer.setAnimationLoop(() => {
  let t = clock.t;
  if (t >= timeline.duration && clock.playing) { clock.pause(); clock.seek(timeline.duration); t = timeline.duration; }
  timeline.state(t, state.comfort, st);

  capsule.vehicle.position.set(st.x, CAPSULE.HOVER, st.z);
  capsule.vehicle.rotation.y = st.yaw;
  jelling.update(Math.max(t, 0));

  const u = capsule.mist.material.uniforms;
  u.uOpacity.value = st.mist; u.uTunnel.value = st.tunnel; u.uLab.value = st.lab; u.uTime.value = t;
  capsule.mist.visible = st.mist > 0.001;
  world.visible = jelling.group.visible = st.mist < 0.999;
  const target = tmp.c || (tmp.c = new THREE.Color());
  target.copy(fogCalm).lerp(fogLab, st.lab).lerp(fogTunnel, st.tunnel);
  scene.fog.color.copy(fogBase).lerp(target, st.mist);
  scene.fog.density = WORLD.FOG_DENSITY + (0.3 - WORLD.FOG_DENSITY) * st.mist * st.mist;

  const place = st.jumping ? 'TIDSREJSE' : st.year === 2026 ? 'LABORATORIET' : 'JELLING';
  capsule.sign.draw(st.year, place, st.alarm, t);
  capsule.tablets.draw(st.caption, timeline.chapters, st.chapter);
  capsule.animateCore(t, st.jumping ? Math.sin(Math.PI * st.jumpProgress) : 0);

  if (!renderer.xr.isPresenting) {
    camera.position.set(0, CAPSULE.DESKTOP_EYE, 0);
    camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  }
  hands.update();
  sounds(t, st);
  app.onFrame && app.onFrame(t, st);
  renderer.render(scene, camera);
});
