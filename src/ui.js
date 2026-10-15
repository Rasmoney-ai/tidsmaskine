// Start page (seat choice, comfort, enter VR / screen) and desktop keyboard controls.
import { SEAT_COUNT } from './config.js';

export function initUI(app, renderer) {
  const $ = (id) => document.getElementById(id);
  const start = $('start'), hud = $('hud'), seats = $('seats'), vrBtn = $('enter-vr'), deskBtn = $('enter-desktop'), comfort = $('comfort');
  comfort.checked = app.state.comfort;
  comfort.onchange = () => app.setComfort(comfort.checked);

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
    session.addEventListener('select', () => { if (app.clock.t >= app.timeline.duration) app.restart(); });
    session.addEventListener('end', () => { app.clock.pause(); start.hidden = false; });
    app.restart();
  };

  deskBtn.onclick = () => {
    app.audio.start();
    start.hidden = true; hud.hidden = false;
    app.restart();
  };
  $('back').onclick = () => { app.clock.pause(); start.hidden = false; hud.hidden = true; };

  addEventListener('keydown', (e) => {
    if (start.hidden === false) return;
    switch (e.code) {
      case 'Space': app.clock.toggle(); break;
      case 'ArrowRight': app.seekBy(10); break;
      case 'ArrowLeft': app.seekBy(-10); break;
      case 'KeyN': app.jumpChapter(1); break;
      case 'KeyP': app.jumpChapter(-1); break;
      case 'KeyR': app.restart(); break;
      case 'KeyC': comfort.checked = !comfort.checked; app.setComfort(comfort.checked); break;
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
    const m = Math.floor(Math.max(t, 0) / 60), s = Math.floor(Math.max(t, 0) % 60);
    const total = app.timeline.duration;
    status.textContent = `${app.clock.playing ? '▶' : '❚❚'} ${m}:${String(s).padStart(2, '0')} / ${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`
      + ` · ${app.timeline.chapters[st.chapter].name} · sæde ${app.state.seat}${app.state.comfort ? ' · komfort' : ''}`;
  };
}
