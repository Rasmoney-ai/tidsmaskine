// Start page (enter VR / screen) and desktop keyboard controls.
import { PASSTHROUGH } from './config.js';

export function initUI(app, renderer) {
  const $ = (id) => document.getElementById(id);
  const start = $('start'), hud = $('hud'), vrBtn = $('enter-vr'), deskBtn = $('enter-desktop');

  // XR support: VR; passthrough (immersive-ar) only when PASSTHROUGH or ?ar=1 asks for it and the headset has it.
  let mode = null;
  const wantAR = PASSTHROUGH || new URLSearchParams(location.search).get('ar') === '1';
  if (navigator.xr) {
    Promise.all(['immersive-ar', 'immersive-vr'].map((m) => navigator.xr.isSessionSupported(m).catch(() => false))).then(([ar, vr]) => {
      mode = ar && wantAR ? 'immersive-ar' : vr ? 'immersive-vr' : null;
      vrBtn.disabled = !mode;
      if (!mode) vrBtn.textContent = 'VR findes ikke på denne enhed';
    });
  } else { vrBtn.disabled = true; vrBtn.textContent = 'VR findes ikke i denne browser'; }

  vrBtn.onclick = async () => {
    app.audio.start();
    const session = await navigator.xr.requestSession(mode, {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'],
    });
    await renderer.xr.setSession(session);
    start.hidden = true; hud.hidden = true;
    // Re-centering with the Meta button: local-floor origin moves with the user; the cabin follows the rig.
    renderer.xr.getReferenceSpace()?.addEventListener('reset', () => console.info('Reference space reset'));
    session.addEventListener('select', (e) => app.xrSelect(e));
    session.addEventListener('selectstart', (e) => app.xrSelectStart(e));
    session.addEventListener('selectend', (e) => app.xrSelectEnd(e));
    session.addEventListener('end', () => { app.clock.pause(); start.hidden = false; });
    app.restart();
  };

  deskBtn.onclick = () => {
    app.audio.start();
    start.hidden = true; hud.hidden = false;
    app.restart();
  };
  $('back').onclick = () => { app.clock.pause(); start.hidden = false; hud.hidden = true; };

  addEventListener('keyup', (e) => app.keys.delete(e.code));
  addEventListener('blur', () => app.keys.clear());
  addEventListener('keydown', (e) => {
    if (start.hidden === false) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { app.keys.add(e.code); e.preventDefault(); return; }
    switch (e.code) {
      case 'Space': app.clock.toggle(); break;
      case 'ArrowRight': app.seekBy(10); break;
      case 'ArrowLeft': app.seekBy(-10); break;
      case 'KeyN': app.nextStop(1); break;
      case 'KeyP': app.nextStop(-1); break;
      case 'KeyJ': app.press('home'); break;
      case 'KeyE': app.toggleDoor(); break;
      case 'KeyR': app.restart(); break;
      case 'KeyH': hud.classList.toggle('small'); break;
      default: return;
    }
    e.preventDefault();
  });

  const status = $('status');
  app.onFrame = (t, st) => {
    if (hud.hidden) return;
    const tl = app.timeline, c = tl.clip;
    const name = c.name || { intro: 'Afgang', jumpPast: 'Tidsspring', landing: 'Landingsplads', hop: 'Tågespring', jumpHome: 'Tidsspring hjem', home: 'Hjemme' }[tl.clipId];
    status.textContent = `${app.clock.playing ? '▶' : '❚❚'} ${name} ${Math.max(t, 0).toFixed(0)} s${app.state.outside ? ' · udenfor' : ''}`
      + (app.state.debug ? ` · ${app.perf.summary()}` : '');
  };
}
