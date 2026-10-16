import * as THREE from 'three';
import { CAPSULE, COUNTDOWN, SEAT_COUNT, WORLD } from './config.js';
import { Timeline } from './timeline.js';
import { LocalClock } from './clock.js';
import { buildWorld } from './world.js';
import { buildJelling, occupied, drawJellingMap } from './jelling.js';
import { buildCapsule, placeRig } from './capsule.js';
import { buildHands } from './hands.js';
import { Audio } from './audio.js';
import { initUI } from './ui.js';
import { buildLife } from './life.js';
import { Perf } from './perf.js';
import { loadModels } from './models.js';

const params = new URLSearchParams(location.search);
const state = {
  seat: Math.min(Math.max(parseInt(params.get('seat'), 10) || 1, 1), SEAT_COUNT),
  comfort: params.get('comfort') === '1',
  debug: params.get('debug') === '1',
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1000);

const timeline = new Timeline();
console.info('Trip check', timeline.report());

const world = buildWorld(scene, occupied);
const models = await loadModels();
const jelling = buildJelling(scene, timeline, models);
const life = buildLife(jelling.group, timeline);
const capsule = buildCapsule({ mapDrawer: (ctx, r, x, z, yaw) => drawJellingMap(ctx, r, x, z, yaw, timeline.stops) });
scene.add(capsule.vehicle);
capsule.rig.add(camera);
placeRig(capsule.rig, state.seat);
const hands = buildHands(renderer, capsule.rig);
const clock = new LocalClock(-COUNTDOWN);
const audio = new Audio();
const perf = new Perf(renderer, world);

// Desktop look-around (drag) and clicks on the tablet.
const look = { yaw: 0, pitch: -0.12 };
const walk = { x: 0, z: 0 };   // desktop walking offset from the start place
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; });
addEventListener('pointerup', (e) => {
  if (drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) clickAt(e.clientX, e.clientY);
  drag = null;
});
addEventListener('pointermove', (e) => {
  if (!drag) return;
  look.yaw += (e.clientX - drag.x) * 0.004; look.pitch += (e.clientY - drag.y) * 0.004;
  look.pitch = Math.max(-1.3, Math.min(1.3, look.pitch));
  drag.x = e.clientX; drag.y = e.clientY;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const raycaster = new THREE.Raycaster();
function pressRay(origin, dir) {
  raycaster.set(origin, dir);
  const hit = raycaster.intersectObjects(capsule.panels.meshes, false)[0];
  if (!hit) return false;
  const id = capsule.panels.buttonAt(hit.object, hit.uv);
  if (id) { app.press(id); audio.play('beep', 0.5); }
  return !!id;
}
function clickAt(x, y) {
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  pressRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
}
// XR: pinch (hand tracking) or trigger (controller) points a ray at the tablet.
function xrSelect(e) {
  const pose = e.frame.getPose(e.inputSource.targetRaySpace, renderer.xr.getReferenceSpace());
  if (!pose) return;
  const m = new THREE.Matrix4().fromArray(pose.transform.matrix).premultiply(capsule.rig.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(m);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(m);
  pressRay(origin, dir);
}

const app = {
  timeline, clock, audio, state, look, renderer, perf, scene,
  restart(play = true) { timeline.reset(); clock.pause(); clock.seek(-COUNTDOWN); if (play) clock.play(); },
  setSeat(n) { state.seat = n; walk.x = walk.z = 0; placeRig(capsule.rig, n); },
  keys: new Set(),
  setComfort(on) { state.comfort = on; },
  // Panel buttons: a stop id, 'home' or 'again'.
  press(id) {
    if (id === 'again') return app.restart();
    const tau = Math.max(clock.t, 0);
    const changed = id === 'home' ? timeline.goHome(tau) : timeline.choose(id, tau);
    if (changed) clock.seek(0);
  },
  nextStop(dir) {
    const order = timeline.order, cur = order.indexOf(timeline.clipId);
    const i = cur < 0 ? (dir > 0 ? 0 : order.length - 1) : cur + dir;
    if (i >= 0 && i < order.length) app.press(order[i]); else if (i >= order.length) app.press('home');
  },
  seekBy(dt) { clock.seek(Math.max(timeline.clipId === 'intro' ? -COUNTDOWN : 0, Math.min(timeline.clip.dur - 0.01, clock.t + dt))); },
  xrSelect,
};
window.app = app;
initUI(app, renderer);

// Sound cues -----------------------------------------------------------
let lastTau = clock.t, lastW = 0, lastClip = timeline.clipId;
function emitterGain(x, z, st) {
  const dx = x - st.x, dz = z - st.z, d = Math.hypot(dx, dz);
  const gain = (1.4 / (1 + d / 5)) * (1 - st.mist);
  const lx = dx * Math.cos(st.yaw) - dz * Math.sin(st.yaw);
  return { gain: Math.min(gain, 1), pan: Math.max(-0.9, Math.min(0.9, lx / (d + 1))) };
}

function sounds(tau, st) {
  const sameClip = lastClip === timeline.clipId;
  const dt = tau - lastTau, dw = st.w - lastW;
  if (clock.playing && sameClip && dt > 0 && dt < 0.5) {
    if (timeline.clipId === 'intro') {
      for (const k of [-3, -2, -1]) if (lastTau < k && tau >= k) audio.play('beep', 0.8);
      if (lastTau < 0 && tau >= 0) audio.play('go', 0.8);
    }
    for (const [o, name] of timeline.sounds()) if (o > lastTau && o <= tau) audio.play(name, 0.9);
  }
  if (clock.playing && dw > 0 && dw < 0.5) {
    for (const e of jelling.emitters) {
      if (!jelling.zones[e.zone].visible) continue;
      let fire = false;
      if (e.once !== undefined) fire = e.once > lastW && e.once <= st.w;
      else fire = Math.floor((st.w - e.offset) / e.period) > Math.floor((lastW - e.offset) / e.period) && (!e.until || st.w < e.until);
      if (!fire) continue;
      const x = e.follow ? e.follow.position.x : e.x, z = e.follow ? e.follow.position.z : e.z;
      const { gain, pan } = emitterGain(x, z, st);
      audio.play(e.name, e.name === 'bark' ? Math.max(gain, 0.5) : gain, pan);
    }
  }
  lastTau = tau; lastW = st.w; lastClip = timeline.clipId;
  audio.setLevels({ hum: clock.playing ? 1 : 0.3, outside: 1 - st.mist, jump: st.jumping ? st.jumpProgress : 0 });
}

// Panel buttons for the current state.
function buttons() {
  const id = timeline.clipId, c = timeline.clip;
  if (timeline.finished) return [{ id: 'again', label: 'Rejs igen', state: 'on' }];
  const travelling = c.kind === 'stop' || c.kind === 'hop';
  const list = timeline.order.map((s) => ({
    id: s, label: timeline.stops[s].name,
    state: s === id || (id === 'hop' && timeline.target === s) ? 'here' : !travelling && id !== 'intro' && id !== 'jumpPast' ? 'off' : timeline.visited.has(s) ? 'seen' : 'on',
  }));
  list.push({ id: 'home', label: 'Rejs hjem', state: travelling ? 'on' : 'off' });
  return list;
}

// Frame loop -------------------------------------------------------------
const st = {};
const fogBase = new THREE.Color(WORLD.FOG_COLOR), fogLab = new THREE.Color(WORLD.MIST_LAB), fogCalm = new THREE.Color(WORLD.MIST_STEALTH);
const fogTunnel = new THREE.Color(0x3a3a8a), fogTarget = new THREE.Color();

// Desktop walking with W A S D inside the capsule (in VR people walk for real).
let lastNow = 0, dt = 0;
function walkStep(step) {
  const k = app.keys, f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), r = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  if (f || r) {
    const sp = 1.4 * step, s = Math.sin(look.yaw), c = Math.cos(look.yaw);
    walk.x += (-s * f + c * r) * sp; walk.z += (-c * f - s * r) * sp;
  }
  const seat = capsule.rig.position;
  placeRig(capsule.rig, state.seat, walk);
  const d = Math.hypot(seat.x, seat.z);
  if (d > CAPSULE.WALK_RADIUS) { const m = CAPSULE.WALK_RADIUS / d; walk.x -= seat.x * (1 - m); walk.z -= seat.z * (1 - m); placeRig(capsule.rig, state.seat, walk); }
}

renderer.setAnimationLoop((now) => {
  dt = Math.min((now - lastNow) / 1000, 0.1); lastNow = now;
  let tau = clock.t;
  if (clock.playing && tau >= timeline.clip.dur) {
    if (timeline.finished) { clock.pause(); clock.seek(timeline.clip.dur); tau = timeline.clip.dur; }
    else if (timeline.advance(tau)) { clock.seek(0); tau = 0; }
  }
  timeline.state(tau, state.comfort, st);

  capsule.vehicle.position.set(st.x, CAPSULE.HOVER, st.z);
  capsule.vehicle.rotation.y = st.yaw;
  jelling.setZones(st.zones);
  jelling.update(st.w);
  life.update(st.w, st.zones);

  const u = capsule.mist.material.uniforms;
  u.uOpacity.value = st.mist; u.uTunnel.value = st.tunnel; u.uLab.value = st.lab; u.uTime.value = st.w + tau;
  capsule.mist.visible = st.mist > 0.001;
  world.visible = jelling.group.visible = st.mist < 0.999;
  fogTarget.copy(fogCalm).lerp(fogLab, st.lab).lerp(fogTunnel, st.tunnel);
  scene.fog.color.copy(fogBase).lerp(fogTarget, st.mist);
  scene.fog.density = WORLD.FOG_DENSITY + (0.3 - WORLD.FOG_DENSITY) * st.mist * st.mist;

  const place = st.jumping ? 'TIDSREJSE' : st.year === 2026 ? 'LABORATORIET' : 'JELLING';
  capsule.panels.draw({
    caption: st.caption, buttons: buttons(), debug: state.debug ? perf.summary() : '', t: st.w,
    status: { year: st.year, place, alarm: st.alarm, jumping: st.jumping, jumpProgress: st.jumpProgress },
    map: { x: st.x, z: st.z, yaw: st.yaw },
  });
  capsule.animateCore(st.w + tau, st.jumping ? Math.sin(Math.PI * st.jumpProgress) : 0);

  if (app.inspect) {
    // Developer view (app.inspect = [x, y, z, tx, ty, tz]): free camera in the world to look at models.
    if (camera.parent !== scene) scene.add(camera);
    const [x, y, z, tx, ty, tz] = app.inspect;
    camera.position.set(x, y, z); camera.lookAt(tx, ty, tz);
  } else if (!renderer.xr.isPresenting) {
    if (camera.parent !== capsule.rig) capsule.rig.add(camera);
    walkStep(dt);
    camera.position.set(0, CAPSULE.DESKTOP_EYE, 0);
    camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  }
  hands.update();
  sounds(tau, st);
  app.onFrame && app.onFrame(tau, st);
  renderer.render(scene, camera);
  perf.frame(now, renderer.xr.isPresenting);
});
