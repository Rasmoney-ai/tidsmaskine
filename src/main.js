import * as THREE from 'three';
import { CAPSULE, COUNTDOWN, SEAT_COUNT, WORLD } from './config.js';
import { Timeline, OUTSIDE_SPOT } from './timeline.js';
import { LocalClock } from './clock.js';
import { buildWorld } from './world.js';
import { buildJelling, occupied, drawJellingMap } from './jelling.js';
import { buildCapsule, placeRig } from './capsule.js';
import { buildHands } from './hands.js';
import { Audio } from './audio.js';
import { initUI } from './ui.js';
import { Perf } from './perf.js';
import { loadModels } from './models.js';
import { buildScanner } from './scanner.js';

const params = new URLSearchParams(location.search);
const state = {
  seat: Math.min(Math.max(parseInt(params.get('seat'), 10) || 1, 1), SEAT_COUNT),
  debug: params.get('debug') === '1',
  outside: false,
};

const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
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
const [models, data] = await Promise.all([
  loadModels((f) => { const el = document.getElementById('loading'); if (el) el.textContent = f < 1 ? `Indlæser modeller … ${Math.round(f * 100)} %` : ''; }),
  fetch('data/jelling.json').then((r) => r.json()),
]);
const world = buildWorld(scene, occupied, models);
const jelling = buildJelling(scene, timeline, models);
const capsule = buildCapsule({ mapDrawer: (ctx, r, x, z, yaw, clues) => drawJellingMap(ctx, r, x, z, yaw, timeline.stops, clues) });
scene.add(capsule.vehicle);
capsule.rig.add(camera);
placeRig(capsule.rig, state.seat);
const hands = buildHands(renderer, capsule.rig);
const scanner = buildScanner(scene, jelling.scannables);
// Desktop: the scanner sits in the lower right of the view (only outside). VR: it follows the hand/controller.
const TOOL_DESKTOP = { pos: new THREE.Vector3(0.2, -0.2, -0.42), rot: new THREE.Euler(0.12, -0.18, 0.05) };
const clock = new LocalClock(-COUNTDOWN);
const audio = new Audio();
const perf = new Perf(renderer, world);

// A dark sphere around the head for short fades (going out and in through the door).
const fader = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }));
fader.renderOrder = 100; fader.visible = false;
camera.add(fader);
let transition = null;   // { t, done, action }: fade out, run the action, fade in

const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();

// Desktop look-around (drag), walking (W A S D) and clicks.
const look = { yaw: 0, pitch: -0.12 };
const walk = { x: 0, z: 0 };
let drag = null, termMouse = false;
const terminal = capsule.terminal;
renderer.domElement.addEventListener('pointerdown', (e) => {
  const uv = terminalUV(mouseRay(e.clientX, e.clientY), true);
  if (uv) { termMouse = true; terminal.down(uv); return; }
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
});
addEventListener('pointerup', (e) => {
  if (termMouse) { termMouse = false; const uv = terminalUV(mouseRay(e.clientX, e.clientY), false); if (uv) app.press(terminal.up(uv)); return; }
  if (drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) clickAt(e.clientX, e.clientY);
  drag = null;
});
addEventListener('pointermove', (e) => {
  if (termMouse) { const uv = terminalUV(mouseRay(e.clientX, e.clientY), false); if (uv) terminal.move(uv); return; }
  if (!drag) {
    // Hand cursor over things that can be scanned.
    if (!state.outside) return;
    raycaster.setFromCamera(ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    renderer.domElement.style.cursor = scanner.hover(raycaster.ray.origin, raycaster.ray.direction) ? 'pointer' : '';
    return;
  }
  look.yaw += (e.clientX - drag.x) * 0.004; look.pitch += (e.clientY - drag.y) * 0.004;
  look.pitch = Math.max(-1.3, Math.min(1.3, look.pitch));
  drag.x = e.clientX; drag.y = e.clientY;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function mouseRay(x, y) { raycaster.setFromCamera(ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); return raycaster.ray.clone(); }
// Where a ray meets the terminal, as uv (0..1). strict: must hit the screen; otherwise its plane (for dragging).
const _plane = new THREE.Plane(), _p = new THREE.Vector3(), _n = new THREE.Vector3(), _inv = new THREE.Matrix4();
function terminalUV(ray, strict) {
  if (state.outside || timeline.clip.kind === 'jump') return null;
  const m = terminal.mesh;
  m.updateMatrixWorld();
  if (strict) {
    raycaster.set(ray.origin, ray.direction);
    const hit = raycaster.intersectObject(m, false)[0];
    return hit ? hit.uv : null;
  }
  _n.set(0, 0, 1).transformDirection(m.matrixWorld);
  _plane.setFromNormalAndCoplanarPoint(_n, _p.setFromMatrixPosition(m.matrixWorld));
  if (!ray.intersectPlane(_plane, _p)) return null;
  _p.applyMatrix4(_inv.copy(m.matrixWorld).invert());
  const g = m.geometry.parameters;
  return { x: Math.min(1, Math.max(0, _p.x / g.width + 0.5)), y: Math.min(1, Math.max(0, _p.y / g.height + 0.5)) };
}

// One ray decides what was pressed: panel buttons, the door, the way back, or a trace to scan.
function pressRay(origin, dir) {
  raycaster.set(origin, dir);
  const targets = state.outside ? [capsule.returnPanel] : [...capsule.panels.meshes, capsule.door.hit];
  const hit = raycaster.intersectObjects(targets, false)[0];
  if (hit) {
    if (hit.object === capsule.returnPanel) return app.press('enter');
    if (hit.object === capsule.door.hit) return app.press('door');
    const id = capsule.panels.buttonAt(hit.object, hit.uv);
    if (id) { app.press(id); audio.play('beep', 0.5); }
    return;
  }
  if (state.outside) scanner.scanRay(origin, dir);
}
function clickAt(x, y) {
  raycaster.setFromCamera(ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  pressRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
}
// XR: pinch (hand tracking) or trigger (controller) along the pointing ray.
const _m = new THREE.Matrix4();
function xrRay(source, frame, out = {}) {
  const pose = frame.getPose(source.targetRaySpace, renderer.xr.getReferenceSpace());
  if (!pose) return null;
  _m.fromArray(pose.transform.matrix).premultiply(capsule.rig.matrixWorld);
  out.origin = (out.origin || new THREE.Vector3()).setFromMatrixPosition(_m);
  out.dir = (out.dir || new THREE.Vector3()).set(0, 0, -1).transformDirection(_m);
  out.matrix = (out.matrix || new THREE.Matrix4()).copy(_m);
  return out;
}
const termSources = new Set(), consumed = new Set();
function xrSelectStart(e) {
  capsule.rig.updateMatrixWorld();
  const r = xrRay(e.inputSource, e.frame);
  const uv = r && terminalUV(new THREE.Ray(r.origin, r.dir), true);
  if (uv) { termSources.add(e.inputSource); terminal.down(uv); }
}
function xrSelectEnd(e) {
  if (!termSources.has(e.inputSource)) return;
  termSources.delete(e.inputSource); consumed.add(e.inputSource);
  const r = xrRay(e.inputSource, e.frame);
  const uv = r && terminalUV(new THREE.Ray(r.origin, r.dir), false);
  if (uv) app.press(terminal.up(uv));
}
function xrSelect(e) {
  if (termSources.has(e.inputSource) || consumed.has(e.inputSource)) { consumed.delete(e.inputSource); return; }
  capsule.rig.updateMatrixWorld(); const r = xrRay(e.inputSource, e.frame); if (r) pressRay(r.origin, r.dir);
}

function fadeThen(action) { if (!transition) transition = { t: 0, done: false, action }; }

const app = {
  timeline, clock, audio, state, look, renderer, perf, scene, scanner,
  keys: new Set(),
  restart(play = true) { timeline.reset(); scanner.scanned.clear(); scanner.collected.clear(); terminal.reset(); setOutside(false); clock.pause(); clock.seek(-COUNTDOWN); if (play) clock.play(); },
  setSeat(n) { state.seat = n; walk.x = walk.z = 0; capsule.placeTerminal(n); if (!state.outside) placeRig(capsule.rig, n); },
  // Buttons and actions: a zone id, 'door' (go out), 'enter' (back in), 'home', 'again'.
  press(id) {
    if (!id) return;
    if (id === 'again') return app.restart();
    if (id === 'home' && !terminal.filled()) return;   // travel home needs at least one logbook field
    if (id === 'labPrev' || id === 'labNext') return capsule.panels.labStep(id === 'labNext' ? 1 : -1);
    if (id === 'door') { if (!state.outside && timeline.doorOpen(Math.max(clock.t, 0))) fadeThen(() => setOutside(true)); return; }
    if (id === 'enter') { if (state.outside) fadeThen(() => setOutside(false)); return; }
    if (state.outside) return;
    const tau = Math.max(clock.t, 0);
    const changed = id === 'home' ? timeline.goHome(tau) : timeline.choose(id, tau);
    if (changed) clock.seek(0);
  },
  toggleDoor() { app.press(state.outside ? 'enter' : 'door'); },
  nextStop(dir) {
    const order = timeline.order, cur = order.indexOf(timeline.clipId);
    const i = cur < 0 ? (dir > 0 ? 0 : order.length - 1) : (cur + dir + order.length) % order.length;
    app.press(order[i]);
  },
  seekBy(dt) { if (timeline.clipId === 'intro') clock.seek(Math.max(-COUNTDOWN, Math.min(timeline.clip.dur - 0.01, clock.t + dt))); },
  xrSelect, xrSelectStart, xrSelectEnd,
};
capsule.placeTerminal(state.seat);
window.app = app;
initUI(app, renderer);

function setOutside(on) {
  state.outside = on;
  walk.x = walk.z = 0;
  look.yaw = 0;
  capsule.setOutside(on);
  placeRig(capsule.rig, state.seat, walk, on ? OUTSIDE_SPOT : null);
  if (!on) renderer.domElement.style.cursor = '';
}

// Sound cues (placeholder sound is off unless ?sound=1) ------------------------------------
let lastTau = clock.t, lastClip = timeline.clipId;
function sounds(tau, st) {
  const dt = tau - lastTau;
  if (clock.playing && lastClip === timeline.clipId && dt > 0 && dt < 0.5) {
    if (timeline.clipId === 'intro') {
      for (const k of [-3, -2, -1]) if (lastTau < k && tau >= k) audio.play('beep', 0.8);
      if (lastTau < 0 && tau >= 0) audio.play('go', 0.8);
    }
    for (const [o, name] of timeline.sounds()) if (o > lastTau && o <= tau) audio.play(name, 0.9);
  }
  lastTau = tau; lastClip = timeline.clipId;
  audio.setLevels({ hum: clock.playing ? 1 : 0.3, outside: 1 - st.mist, jump: st.jumping ? st.jumpProgress : 0 });
}

// What the scanned traces reveal on the map: sharper for traces pointing here, lines for traces pointing out.
const hereTotal = Object.values(data.items).filter((it) => it.trace === 'her').length;
let cluesKey = '', clues = { sharp: 0, links: [] };
function mapClues() {
  const ids = [...scanner.collected], key = ids.join();
  if (key !== cluesKey) {
    cluesKey = key;
    const items = ids.map((id) => data.items[id]).filter(Boolean);
    clues = {
      sharp: hereTotal ? items.filter((it) => it.trace === 'her').length / hereTotal : 1,
      links: items.filter((it) => it.trace === 'ud' && it.link).map((it) => it.link),
    };
  }
  return clues;
}

// The student's bid is saved in this browser when travelling home (no export yet).
let savedFor = null;
function saveBid() {
  const bid = { ...terminal.log, scanned: [...scanner.collected], savedAt: new Date().toISOString() };
  try {
    const all = JSON.parse(localStorage.getItem('tidsmaskinen.bud') || '[]');
    all.push(bid);
    localStorage.setItem('tidsmaskinen.bud', JSON.stringify(all.slice(-20)));
  } catch (e) { console.warn('Could not save the bid', e); }
}

// Zone choice and actions on the panel.
function buttons(st) {
  const id = timeline.clipId, c = timeline.clip;
  if (timeline.finished) return [{ id: 'again', label: 'Ny ekspedition', state: 'go', row: 1 }];
  const canChoose = c.kind === 'zone' || c.kind === 'hold';
  const zones = timeline.order.map((z) => ({
    id: z, label: timeline.stops[z].name, row: 0,
    state: z === id || (id === 'hop' && timeline.target === z) ? 'here' : !canChoose ? 'off' : timeline.visited.has(z) ? 'seen' : 'on',
  }));
  return [...zones,
    { id: 'door', label: 'Gå ud', row: 1, state: st.doorOpen ? 'go' : 'off' },
    { id: 'home', label: 'Rejs hjem', row: 1, state: canChoose && terminal.filled() ? 'on' : 'off' }];
}

// Desktop walking: inside the capsule, or around the spot outside the door.
function walkStep(step) {
  const k = app.keys, f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), r = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  if (f || r) {
    const sp = 1.4 * step, s = Math.sin(look.yaw), c = Math.cos(look.yaw);
    walk.x += (-s * f + c * r) * sp; walk.z += (-c * f - s * r) * sp;
  }
  const spot = state.outside ? OUTSIDE_SPOT : null;
  placeRig(capsule.rig, state.seat, walk, spot);
  const p = capsule.rig.position;
  if (state.outside) {
    // Stay within about 2.5 m of the spot and outside the capsule wall.
    const dx = p.x - OUTSIDE_SPOT.x, dz = p.z - OUTSIDE_SPOT.z, d = Math.hypot(dx, dz);
    if (d > 2.5) { walk.x -= dx * (1 - 2.5 / d); walk.z -= dz * (1 - 2.5 / d); placeRig(capsule.rig, state.seat, walk, spot); }
    const c = Math.hypot(p.x, p.z), minR = CAPSULE.RADIUS + 0.4;
    if (c < minR) { const m = minR / c; walk.x += p.x * (m - 1); walk.z += p.z * (m - 1); placeRig(capsule.rig, state.seat, walk, spot); }
  } else {
    const d = Math.hypot(p.x, p.z);
    if (d > CAPSULE.WALK_RADIUS) { const m = CAPSULE.WALK_RADIUS / d; walk.x -= p.x * (1 - m); walk.z -= p.z * (1 - m); placeRig(capsule.rig, state.seat, walk); }
  }
}

// Frame loop -------------------------------------------------------------
const st = {};
const fogBase = new THREE.Color(WORLD.FOG_COLOR), fogLab = new THREE.Color(WORLD.MIST_LAB), fogCalm = new THREE.Color(WORLD.MIST_STEALTH);
const fogTunnel = new THREE.Color(0x3a3a8a), fogTarget = new THREE.Color();
let lastNow = 0, doorK = 0;
const rays = [{}, {}];

renderer.setAnimationLoop((now, frame) => {
  const dt = Math.min((now - lastNow) / 1000, 0.1); lastNow = now;
  let tau = clock.t;
  if (clock.playing && tau >= timeline.clip.dur) { if (timeline.advance()) { clock.seek(0); tau = 0; } }
  timeline.state(tau, false, st);
  // Leaving the zone (the door closes) always brings the user back inside.
  if (state.outside && !st.doorOpen && !transition) setOutside(false);

  capsule.vehicle.position.set(st.x, CAPSULE.HOVER, st.z);
  capsule.vehicle.rotation.y = st.yaw;
  jelling.setZones(st.zones);
  jelling.update(st.w);

  const u = capsule.mist.material.uniforms;
  u.uOpacity.value = st.mist; u.uTunnel.value = st.tunnel; u.uLab.value = st.lab; u.uTime.value = st.w + tau;
  capsule.mist.visible = st.mist > 0.001;
  world.visible = jelling.group.visible = st.mist < 0.999;
  fogTarget.copy(fogCalm).lerp(fogLab, st.lab).lerp(fogTunnel, st.tunnel);
  scene.fog.color.copy(fogBase).lerp(fogTarget, st.mist);
  scene.fog.density = WORLD.FOG_DENSITY + (0.3 - WORLD.FOG_DENSITY) * st.mist * st.mist;

  doorK += ((st.doorOpen ? 1 : 0) - doorK) * Math.min(1, dt * 2.5);
  capsule.door.setOpen(doorK);
  const place = st.jumping ? 'TIDSREJSE' : st.lab ? 'LABORATORIET' : 'UKENDT';
  capsule.panels.draw({
    caption: st.caption, buttons: buttons(st), debug: state.debug ? perf.summary() : '', t: st.w + tau,
    status: { year: st.year, place, jumping: st.jumping, jumpProgress: st.jumpProgress },
    map: { x: st.x, z: st.z, yaw: st.yaw, clues: mapClues() },
    scanned: [...scanner.collected], data,
  });
  if (state.outside && state.debug) capsule.returnPanel.userData.draw(perf.summary());
  const zb = buttons(st);
  terminal.update({
    finished: timeline.finished, year: st.year, doorOpen: st.doorOpen,
    homeOn: (timeline.clip.kind === 'zone' || timeline.clip.kind === 'hold') && terminal.filled(),
    zoneButtons: zb.filter((b) => b.row === 0).map((b) => ({ id: b.id, name: b.label, state: b.state })),
    scanned: [...scanner.collected], data, map: { x: st.x, z: st.z, yaw: st.yaw, clues: mapClues() },
  });
  if (timeline.clipId === 'jumpHome' && savedFor !== timeline) { savedFor = timeline; saveBid(); }
  if (timeline.clipId === 'intro') savedFor = null;
  capsule.animateCore(st.w + tau, st.jumping ? Math.sin(Math.PI * st.jumpProgress) : 0);

  if (app.inspect) {
    if (camera.parent !== scene) scene.add(camera);
    const [x, y, z, tx, ty, tz] = app.inspect;
    camera.position.set(x, y, z); camera.lookAt(tx, ty, tz);
  } else if (!renderer.xr.isPresenting) {
    if (camera.parent !== capsule.rig) capsule.rig.add(camera);
    walkStep(dt);
    camera.position.set(0, CAPSULE.DESKTOP_EYE, 0);
    camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  }

  // Scanner beams from the hands/controllers in VR; the scanner is held in the right hand (or the only one).
  const active = [], tool = scanner.tool;
  if (renderer.xr.isPresenting && frame) {
    capsule.rig.updateMatrixWorld();
    const sources = [...renderer.xr.getSession().inputSources].sort((a, b) => (b.handedness === 'right') - (a.handedness === 'right'));
    let i = 0;
    for (const source of sources) if (i < 2 && xrRay(source, frame, rays[i])) active.push(rays[i++]);
    if (tool.parent !== scene) scene.add(tool);
    tool.visible = active.length > 0;
    if (tool.visible) { tool.matrixAutoUpdate = false; tool.matrix.copy(active[0].matrix); tool.matrixWorldNeedsUpdate = true; }
  } else {
    if (tool.parent !== camera) { camera.add(tool); tool.matrixAutoUpdate = true; tool.position.copy(TOOL_DESKTOP.pos); tool.rotation.copy(TOOL_DESKTOP.rot); }
    tool.visible = state.outside && !app.inspect;
  }
  scanner.update(st.w + tau, dt, active, renderer.xr.isPresenting, camera);
  // While a hand or controller holds on the terminal, its ray drags (marker, objects).
  if (renderer.xr.isPresenting && frame && termSources.size) {
    for (const source of termSources) { const r = xrRay(source, frame); const uv = r && terminalUV(new THREE.Ray(r.origin, r.dir), false); if (uv) terminal.move(uv); }
  }
  consumed.clear();

  // Door fade: out, act, in.
  if (transition) {
    transition.t += dt;
    const k = transition.t / 0.25;
    if (k >= 1 && !transition.done) { transition.done = true; transition.action(); }
    fader.material.opacity = k < 1 ? k : Math.max(0, 2 - k);
    fader.visible = true;
    if (k >= 2) { transition = null; fader.visible = false; }
  }

  hands.update();
  sounds(tau, st);
  app.onFrame && app.onFrame(tau, st);
  renderer.render(scene, camera);
  perf.frame(now, renderer.xr.isPresenting);
});
