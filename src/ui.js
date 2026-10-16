// Start page (start place, enter VR / screen) and desktop keyboard controls.
import { SEAT_COUNT } from './config.js';

export function initUI(app, renderer) {
  const $ = (id) => document.getElementById(id);
  const start = $('start'), hud = $('hud'), seats = $('seats'), vrBtn = $('enter-vr'), deskBtn = $('enter-desktop');

  for (let n = 1; n <= SEAT_COUNT; n++) {
    const b = document.createElement('button');
    b.textContent = n; b.className = 'seat';
    b.onclick = () => select(n);
    seats.appendChild(b);
  }
  function select(n) {
    app.setSeat(n);
    [...seats.children].forEach((b, i) => b.classList.toggle('on', i + 1 === n));
    const u = new URL(location.href); u.searchParams.set('seat', n); history.replaceState(null, '', u);
  }
  select(app.state.seat);

  // VR support.
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      vrBtn.disabled = !ok;
      if (!ok) vrBtn.textContent = 'VR findes ikke på denne enhed';
    });
  } else { vrBtn.disabled = true; vrBtn.textContent = 'VR findes ikke i denne browser'; }

  vrBtn.onclick = async () => {
    app.audio.start();
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'],
    });
    await renderer.xr.setSession(session);
    start.hidden = true; hud.hidden = true;
    // Re-centering with the Meta button: local-floor origin moves with the user; the cabin follows the rig.
    renderer.xr.getReferenceSpace()?.addEventListener('reset', () => console.info('Reference space reset'));
    session.addEventListener('select', (e) => app.xrSelect(e));
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
      default: {
        const n = e.code.startsWith('Digit') ? parseInt(e.code.slice(5), 10) : NaN;
        if (n >= 0) select(n === 0 ? 10 : n);
        return;
      }
    }
    e.preventDefault();
  });

  const status = $('status');
  app.onFrame = (t, st) => {
    if (hud.hidden) return;
    const tl = app.timeline, c = tl.clip;
    const name = c.name || { intro: 'Afgang', jumpPast: 'Tidsspring', landing: 'Landingsplads', hop: 'Tågespring', jumpHome: 'Tidsspring hjem', home: 'Hjemme' }[tl.clipId];
    status.textContent = `${app.clock.playing ? '▶' : '❚❚'} ${name} ${Math.max(t, 0).toFixed(0)} s${app.state.outside ? ' · udenfor' : ''} · plads ${app.state.seat}`
      + (app.state.debug ? ` · ${app.perf.summary()}` : '');
  };
}
