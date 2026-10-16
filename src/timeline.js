// The journey is a sequence of clips: lab intro, time jump, stops, short hops between stops, jump home.
// Everything visible is a pure function of the state (clip, tau): same state => same picture.
// The user (later the teacher) can pick the next stop; otherwise stops follow in order.
import { COMFORT, TRIP_YEAR, HOME_YEAR, COUNTDOWN } from './config.js';

// Stops. glide: slow straight glide [from, to] in world x/z. base: world-time offset for ambient animation.
export const STOPS = {
  A: {
    name: 'Landsbyen', base: 1000, dur: 40, glide: [[-116, 20], [-96, 20]], glideStart: 3, glideDur: 22, zones: ['village'],
    captions: [
      [0, 'Vikingernes landsby', 'Jelling, ca. år 968. De fleste mennesker i vikingetiden var bønder. De boede i langhuse, hvor familien – og om vinteren også dyrene – boede under samme tag.'],
      [12, 'Kig efter', 'Røgen fra ildstedet slipper ud gennem et hul i taget. Kvinden ved væven væver uld til tøj. Børnene leger fangeleg.'],
      [24, 'Vidste du?', 'Vikingerne havde IKKE horn på hjelmene. Det er en myte, som blev opfundet mange hundrede år senere.'],
    ],
  },
  B: {
    name: 'Gravhøjene', base: 2000, dur: 40, glide: [[-41, 21], [-25, 22]], glideStart: 3, glideDur: 20, zones: ['mounds', 'stone'],
    captions: [
      [0, 'Gravhøjene', 'Vi er inden for den store palisade af egetræ. Den store høj mod nord er Nordhøjen. Her blev Haralds far, kong Gorm den Gamle, begravet omkring år 958.'],
      [12, 'En ny høj', 'Haralds folk bygger en ny høj mod syd – Sydhøjen. Den bygges af tusindvis af græstørv, som bæres op én ad gangen.'],
      [24, 'Skibssætningen', 'De store sten danner omridset af et kæmpe skib. Skibssætningen var over 350 meter lang – den største i Norden.'],
    ],
  },
  C: {
    name: 'Jellingstenen', base: 3000, dur: 46, glide: [[-7, 9], [-5, -8]], glideStart: 3, glideDur: 20, zones: ['stone', 'mounds'],
    captions: [
      [0, 'Jellingstenen', 'Kong Harald Blåtand – ham i den blå kappe – ser til, mens stenhuggeren hugger runer i den store sten. Bag dem står Haralds nye kirke af træ.'],
      [12, 'Hvad står der?', '»Harald konge bød gøre disse kumler efter Gorm, sin fader, og Thyra, sin moder – den Harald, som vandt sig hele Danmark og Norge og gjorde danerne kristne.«'],
      [23, 'Danmarks dåbsattest', 'Stenen kaldes Danmarks dåbsattest. Dengang var den malet i stærke farver. Den står i Jelling endnu i dag.'],
      [33, '! Stealth-alarm !', 'En hund har fået øje på os! Hunde kan høre og lugte meget mere end mennesker. Kapslen trækker sig stille tilbage.'],
    ],
    sounds: [[33, 'alert']],
  },
};
export const STOP_ORDER = ['A', 'B', 'C'];

// Moments inside stop C that the dog scene hooks into.
const DOG_NOTICE = 30, DOG_BARK = 33;

const CLIPS = {
  intro: { kind: 'lab', dur: 12, captions: [
    [0, 'Tidsmaskinen · Rejse 1', 'Velkommen om bord! I dag rejser vi over 1000 år tilbage i tiden – til Jelling i Jylland, omkring år 968.'],
    [6, 'Regel nr. 1', 'Rør intet. Ændr intet. Den mindste ændring i fortiden kan ændre hele historien. Derfor er kapslen i stealth-tilstand: Ingen kan se os.'],
  ] },
  jumpPast: { kind: 'jump', dir: 'past', dur: 14, captions: [[0, 'Tidsspring', 'Hold godt fast … Vi rejser tilbage gennem århundrederne.']], sounds: [[0, 'whooshStart'], [13, 'chime']] },
  hop: { kind: 'hop', dur: 3.5, captions: [[0, 'Tidshop', 'Kapslen skjuler sig i tågen og flytter sig til næste sted …']] },
  jumpHome: { kind: 'jump', dir: 'home', dur: 14, captions: [[0, 'Tidsspring', 'Vi vender hjem til vores egen tid.']], sounds: [[0, 'whooshStart'], [13, 'chime']] },
  home: { kind: 'lab', dur: 16, captions: [
    [0, 'Velkommen hjem – år 2026', 'Tidslinjen er intakt. Ingen sommerfugle kom til skade under denne rejse.'],
    [8, 'Snak om det', 'Hvad overraskede dig mest? Hvad tror du, der var sket, hvis Harald havde set kapslen?'],
  ] },
};
for (const id of STOP_ORDER) CLIPS[id] = { kind: 'stop', ...STOPS[id] };

const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };
const ARRIVE = 3;   // seconds of mist clearing when arriving at a stop
const LEAVE = 1.4;  // seconds of mist rising at the start of a hop

export class Timeline {
  constructor() {
    this.clips = CLIPS;
    this.stops = STOPS;
    this.order = STOP_ORDER;
    this.dogNotice = STOPS.C.base + DOG_NOTICE;
    this.dogBark = STOPS.C.base + DOG_BARK;
    this.reset();
  }

  // Journey state: which clip we are in, plus what a hop came from / goes to.
  reset() {
    this.clipId = 'intro';
    this.visited = new Set();
    this.from = null;      // { stop, tau } when hopping or jumping home
    this.target = null;    // stop id a hop leads to
  }

  get clip() { return CLIPS[this.clipId]; }
  get finished() { return this.clipId === 'home'; }

  // Next stop in order that has not been visited yet.
  nextUnvisited() { return STOP_ORDER.find((s) => !this.visited.has(s) && s !== this.clipId) || null; }

  // Called by the player when the current clip has run out. Returns false at the very end.
  advance(tau) {
    const id = this.clipId;
    if (id === 'intro') return this._enter('jumpPast');
    if (id === 'jumpPast') return this._enterStop(this.target || 'A');
    if (id === 'hop') return this._enterStop(this.target);
    if (CLIPS[id].kind === 'stop') {
      const next = this.nextUnvisited();
      return next ? this.choose(next, tau) : this.goHome(tau);
    }
    if (id === 'jumpHome') return this._enter('home');
    return false;
  }

  // The user picked a stop on the panel.
  choose(stop, tau = 0) {
    if (stop === this.clipId) return false;
    if (this.clipId === 'intro' || this.clipId === 'jumpPast') { this.target = stop; return false; }
    if (this.clipId === 'home' || this.clipId === 'jumpHome') return false;
    this.from = CLIPS[this.clipId].kind === 'stop' ? { stop: this.clipId, tau, mist0: this._stopMist(this.clipId, tau) } : this.from;
    this.target = stop;
    return this._enter('hop');
  }

  goHome(tau = 0) {
    if (CLIPS[this.clipId].kind === 'stop') this.from = { stop: this.clipId, tau, mist0: this._stopMist(this.clipId, tau) };
    else if (this.clipId !== 'hop') return false;
    return this._enter('jumpHome');
  }

  _stopMist(id, tau) {
    const c = CLIPS[id];
    let m = 1 - smooth(tau / ARRIVE);
    if (id === 'C' && tau > c.dur - 4) m = Math.max(m, smooth((tau - (c.dur - 4)) / 3.5));
    return m;
  }

  _enterStop(id) { this.visited.add(id); this.target = null; return this._enter(id); }
  _enter(id) { this.clipId = id; return true; }

  // Where the capsule is during stop `id` at local time tau.
  stopPose(id, tau, comfort, out) {
    const s = STOPS[id], [[x0, z0], [x1, z1]] = s.glide;
    let f = 1;
    if (!comfort) {
      const T = s.glideDur, a = COMFORT.RAMP_TIME, x = Math.min(Math.max(tau - s.glideStart, 0), T);
      // Cosine speed ramp: fraction of the glide distance covered after x seconds.
      const v = 1 / (T - a);
      const ramp = (tt) => v * (tt / 2 - a / (2 * Math.PI) * Math.sin(Math.PI * tt / a));
      f = x < a ? ramp(x) : x > T - a ? 1 - ramp(T - x) : v * a / 2 + v * (x - a);
    }
    out.x = x0 + (x1 - x0) * f; out.z = z0 + (z1 - z0) * f;
    out.yaw = Math.atan2(-(x1 - x0), -(z1 - z0));
    return out;
  }

  glideSpeed(id) {
    const s = STOPS[id], [[x0, z0], [x1, z1]] = s.glide;
    return Math.hypot(x1 - x0, z1 - z0) / (s.glideDur - COMFORT.RAMP_TIME);
  }

  // World time for ambient animation (people, smoke, birds): continuous inside a stop.
  worldTime(tau) {
    const c = this.clip;
    if (c.kind === 'stop') return c.base + Math.max(tau, 0);
    if (this.from) return STOPS[this.from.stop].base + this.from.tau + (this.clipId === 'hop' || this.clipId === 'jumpHome' ? tau : 0);
    const first = STOPS[this.target || 'A'];
    return first.base;
  }

  // Capsule position for ambient code that needs it (the dog looks at the capsule).
  poseAtWorld(w, out = {}) {
    for (const id of STOP_ORDER) {
      const s = STOPS[id];
      if (w >= s.base && w < s.base + 900) return this.stopPose(id, w - s.base, false, out);
    }
    return this.stopPose('A', 0, false, out);
  }

  // Full state for the current clip at local time tau.
  state(tau, comfort = false, out = {}) {
    const c = this.clip, id = this.clipId;
    out.clipId = id; out.kind = c.kind; out.tau = tau;
    out.w = this.worldTime(tau);
    // Capsule pose.
    if (c.kind === 'stop') this.stopPose(id, tau, comfort, out);
    else if (this.from && (id === 'hop' || id === 'jumpHome')) this.stopPose(this.from.stop, this.from.tau, comfort, out);
    else this.stopPose(this.target || 'A', 0, comfort, out);
    out.stop = c.kind === 'stop' ? id : null;
    out.zones = c.kind === 'stop' ? c.zones : this.from ? STOPS[this.from.stop].zones : STOPS[this.target || 'A'].zones;

    // Mist: 1 = outside hidden. tunnel: time-jump colors. lab: bright home lab.
    let mist = 0, tunnel = 0, lab = 0;
    if (c.kind === 'lab') { mist = 1; lab = 1; }
    else if (c.kind === 'stop') mist = this._stopMist(id, tau);
    else if (c.kind === 'hop') { const m0 = this.from ? this.from.mist0 : 1; mist = m0 + (1 - m0) * smooth(tau / LEAVE); tunnel = 0.25 * smooth((tau - LEAVE) / 1); }
    else if (c.kind === 'jump') {
      const p = tau / c.dur;
      const m0 = this.from ? this.from.mist0 : 1;
      mist = c.dir === 'home' ? m0 + (1 - m0) * smooth(tau / 2) : 1;
      tunnel = smooth(p / 0.18) * (1 - smooth((p - 0.82) / 0.18));
      lab = c.dir === 'past' ? 1 - smooth(p / 0.18) : smooth((p - 0.82) / 0.18);
    }
    out.mist = mist; out.tunnel = tunnel; out.lab = lab;

    let year = TRIP_YEAR;
    if (c.kind === 'jump') {
      const k = smooth((tau / c.dur - 0.1) / 0.8);
      year = c.dir === 'past' ? HOME_YEAR + (TRIP_YEAR - HOME_YEAR) * k : TRIP_YEAR + (HOME_YEAR - TRIP_YEAR) * k;
    } else if (c.kind === 'lab') year = HOME_YEAR;
    out.year = Math.round(year);
    out.jumping = c.kind === 'jump';
    out.jumpProgress = c.kind === 'jump' ? tau / c.dur : 0;
    out.alarm = out.w >= this.dogBark && out.w < STOPS.C.base + STOPS.C.dur + 20;
    out.caption = this.captionAt(tau);
    return out;
  }

  captionAt(tau) {
    const c = this.clip;
    if (this.clipId === 'intro' && tau < 0) return { title: 'Gør klar', body: `Rejsen starter om ${Math.ceil(-tau)} …`, key: 'cd' + Math.ceil(-tau) };
    if (this.clipId === 'home' && tau >= c.dur) return { title: 'Rejsen er slut', body: 'Tryk på »Rejs igen« for at starte forfra.', key: 'end' };
    let cap = null;
    for (const x of c.captions || []) if (x[0] <= tau) cap = x;
    if (c.kind === 'stop' && tau >= c.dur - 7 && this.clipId !== 'C') {
      const next = this.nextUnvisited();
      const where = next ? `Om lidt fortsætter vi til ${STOPS[next].name.toLowerCase()}.` : 'Om lidt rejser vi hjem.';
      return { title: 'Hvor nu?', body: `Vælg et sted på panelet. ${where}`, key: this.clipId + 'next' + next };
    }
    if (!cap) return { title: '', body: '', key: this.clipId + 'none' };
    return { title: cap[1], body: cap[2], key: this.clipId + cap[0] };
  }

  sounds() { return this.clip.sounds || []; }

  // Points along all glides (used to keep stones out of the capsule's way).
  routePoints() {
    const pts = [];
    for (const id of STOP_ORDER) {
      const [[x0, z0], [x1, z1]] = STOPS[id].glide;
      for (let i = 0; i <= 20; i++) pts.push({ x: x0 + (x1 - x0) * i / 20, z: z0 + (z1 - z0) * i / 20 });
    }
    return pts;
  }

  // Comfort check, printed once at startup.
  report() {
    const speeds = Object.fromEntries(STOP_ORDER.map((id) => [id, +this.glideSpeed(id).toFixed(2)]));
    return { glideSpeed: speeds, maxAllowed: COMFORT.MAX_SPEED, countdown: COUNTDOWN };
  }
}
