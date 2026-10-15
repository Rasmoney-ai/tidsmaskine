// The timeline drives everything: capsule pose, mist, year display, captions and sound cues
// are pure functions of trip time t (seconds). Same t => same picture.
import * as THREE from 'three';
import { COMFORT, TRIP_YEAR, HOME_YEAR, COUNTDOWN } from './config.js';

// Route through Jelling (x east, z south). Named points are stops.
const ROUTE = [
  ['start', -124, 20], [null, -112, 20], ['A', -94, 20], [null, -74, 20], [null, -60, 20],
  ['gate', -47, 20], [null, -35, 21], ['B', -24, 22], [null, -14, 19], [null, -8, 10],
  ['C', -5, -8], [null, -7, -19], [null, -14, -29], ['end', -26, -36],
];

// Trip script. Captions: [offset, title, body]. Sounds: [offset, name].
const SCRIPT = [
  { kind: 'hold', at: 'start', dur: 12, mist: 'lab', chapter: 'Afgang',
    captions: [
      [0, 'Tidsmaskinen · Rejse 1', 'Velkommen om bord! I dag rejser vi over 1000 år tilbage i tiden – til Jelling i Jylland, omkring år 968.'],
      [6, 'Regel nr. 1', 'Rør intet. Ændr intet. Den mindste ændring i fortiden kan ændre hele historien. Derfor er kapslen i stealth-tilstand: Ingen kan se os.'],
    ] },
  { kind: 'jump', at: 'start', dur: 16, dir: 'past',
    captions: [[0, 'Tidsspring', 'Hold godt fast … Vi rejser tilbage gennem århundrederne.']],
    sounds: [[0, 'whooshStart'], [15, 'chime']] },
  { kind: 'hold', at: 'start', dur: 6, mist: 'clear',
    captions: [[0, 'Jelling, ca. år 968', 'Det er en tidlig sommermorgen i vikingetiden. Kapslen svæver lydløst hen over græsset.']] },
  { kind: 'move', to: 'A' },
  { kind: 'hold', at: 'A', dur: 30, chapter: 'Landsbyen',
    captions: [
      [0, 'Vikingernes landsby', 'De fleste mennesker i vikingetiden var bønder. De boede i langhuse, hvor familien – og om vinteren også dyrene – boede under samme tag.'],
      [10, 'Kig efter', 'Røgen fra ildstedet slipper ud gennem et hul i taget. Kvinden ved væven væver uld til tøj. Børnene leger fangeleg.'],
      [20, 'Vidste du?', 'Vikingerne havde IKKE horn på hjelmene. Det er en myte, som blev opfundet mange hundrede år senere.'],
    ] },
  { kind: 'move', to: 'B',
    captions: [[2, 'Palisaden', 'Vi glider gennem en port i en kæmpe palisade af egetræ. Den gik hele vejen rundt om Jelling – hver side var ca. 360 meter lang.']] },
  { kind: 'hold', at: 'B', dur: 30, chapter: 'Gravhøjene',
    captions: [
      [0, 'Gravhøjene', 'Den store høj mod nord er Nordhøjen. Her blev Haralds far, kong Gorm den Gamle, begravet omkring år 958.'],
      [10, 'En ny høj', 'Haralds folk bygger en ny høj mod syd – Sydhøjen. Den bygges af tusindvis af græstørv, som bæres op én ad gangen.'],
      [20, 'Skibssætningen', 'De store sten danner omridset af et kæmpe skib. Skibssætningen var over 350 meter lang – den største i Norden.'],
    ] },
  { kind: 'move', to: 'C',
    captions: [[1, 'Trækirken', 'Mellem højene står en ny kirke af træ. Kong Harald er blevet kristen.']] },
  { kind: 'hold', at: 'C', dur: 38, chapter: 'Jellingstenen', id: 'C',
    captions: [
      [0, 'Jellingstenen', 'Kong Harald Blåtand – ham i den blå kappe – ser til, mens stenhuggeren hugger runer i den store sten.'],
      [10, 'Hvad står der?', '»Harald konge bød gøre disse kumler efter Gorm, sin fader, og Thyra, sin moder – den Harald, som vandt sig hele Danmark og Norge og gjorde danerne kristne.«'],
      [20, 'Danmarks dåbsattest', 'Stenen kaldes Danmarks dåbsattest. Dengang var den malet i stærke farver. Den står i Jelling endnu i dag.'],
      [30, '! Stealth-alarm !', 'En hund har fået øje på os! Hunde kan høre og lugte meget mere end mennesker. Kapslen trækker sig stille tilbage.'],
    ],
    sounds: [[30, 'alert']] },
  { kind: 'move', to: 'end', id: 'escape',
    captions: [[10, 'Tidslinjen', 'Puha. Hunden gøede – men ingen mennesker så os. Tidslinjen ser ud til at være i orden.']] },
  { kind: 'jump', at: 'end', dur: 16, dir: 'home',
    captions: [[0, 'Tidsspring', 'Vi vender hjem til vores egen tid.']],
    sounds: [[0, 'whooshStart'], [15, 'chime']] },
  { kind: 'hold', at: 'end', dur: 16, mist: 'lab', chapter: 'Hjemme',
    captions: [
      [0, 'Velkommen hjem – år 2026', 'Tidslinjen er intakt. Ingen sommerfugle kom til skade under denne rejse.'],
      [8, 'Snak om det', 'Hvad overraskede dig mest? Hvad tror du, der var sket, hvis Harald havde set kapslen?'],
    ] },
];

// Moments other modules hook into (relative to the hold 'C').
export const DOG_NOTICE = 27;   // dog turns toward the capsule
export const DOG_BARK = 30;     // first bark / stealth alarm

const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };

export class Timeline {
  constructor() {
    this.curve = new THREE.CatmullRomCurve3(
      ROUTE.map(([, x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    this._buildArcTable();
    this.stopS = {};
    for (const [name, x, z] of ROUTE) if (name) this.stopS[name] = this._nearestS(x, z);
    this._buildSegments();
    this._tmp = new THREE.Vector3();
  }

  _buildArcTable() {
    const N = 4000;
    this.arcU = new Float32Array(N + 1);
    this.arcS = new Float32Array(N + 1);
    let prev = this.curve.getPoint(0), s = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = this.curve.getPoint(u);
      s += p.distanceTo(prev); prev = p;
      this.arcU[i] = u; this.arcS[i] = s;
    }
    this.length = s;
  }

  _uAtS(s) {
    const S = this.arcS, n = S.length - 1;
    s = Math.min(Math.max(s, 0), S[n]);
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] < s) lo = m; else hi = m; }
    const f = (s - S[lo]) / Math.max(S[hi] - S[lo], 1e-6);
    return this.arcU[lo] + f * (this.arcU[hi] - this.arcU[lo]);
  }

  _nearestS(x, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.arcU.length; i += 2) {
      const p = this.curve.getPoint(this.arcU[i]);
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = this.arcS[i]; }
    }
    return best;
  }

  _yawAtS(s) {
    const tan = this.curve.getTangent(this._uAtS(s));
    return Math.atan2(-tan.x, -tan.z); // yaw so that local -z points along travel
  }

  // Highest curvature (rad/m) between two arc positions.
  _maxCurvature(s0, s1) {
    let k = 0, prev = this._yawAtS(s0);
    for (let s = s0 + 0.5; s <= s1; s += 0.5) {
      const y = this._yawAtS(s);
      let d = y - prev; d = Math.atan2(Math.sin(d), Math.cos(d));
      k = Math.max(k, Math.abs(d) / 0.5); prev = y;
    }
    return k;
  }

  _buildSegments() {
    const yawLimit = COMFORT.MAX_YAW_RATE * Math.PI / 180;
    let t = 0, s = this.stopS.start;
    this.segments = [];
    this.captions = [];
    this.sounds = [];
    this.chapters = [];
    this.marks = {};
    for (const spec of SCRIPT) {
      const seg = { ...spec, t0: t };
      if (spec.kind === 'move') {
        const s1 = this.stopS[spec.to];
        const v = Math.min(COMFORT.MAX_SPEED, yawLimit / Math.max(this._maxCurvature(s, s1), 1e-4));
        seg.s0 = s; seg.s1 = s1; seg.ramp = COMFORT.RAMP_TIME;
        seg.dur = (s1 - s) / v + seg.ramp;
        seg.vmax = (s1 - s) / (seg.dur - seg.ramp);
        s = s1;
      } else {
        seg.s0 = seg.s1 = s;
      }
      seg.t1 = t + seg.dur;
      for (const [o, title, body] of spec.captions || []) this.captions.push({ t: t + o, title, body });
      for (const [o, name] of spec.sounds || []) this.sounds.push({ t: t + o, name });
      if (spec.chapter) this.chapters.push({ t, name: spec.chapter });
      if (spec.id) this.marks[spec.id] = seg;
      this.segments.push(seg);
      t = seg.t1;
    }
    this.duration = t;
    this.dogNotice = this.marks.C.t0 + DOG_NOTICE;
    this.dogBark = this.marks.C.t0 + DOG_BARK;
  }

  segmentAt(t) {
    const segs = this.segments;
    if (t <= 0) return segs[0];
    for (const g of segs) if (t < g.t1) return g;
    return segs[segs.length - 1];
  }

  // Arc length travelled within a move, using a smooth cosine speed ramp.
  _moveS(g, t) {
    const T = g.dur, a = g.ramp, v = g.vmax, x = Math.min(Math.max(t - g.t0, 0), T);
    const ramp = (tt) => v * (tt / 2 - a / (2 * Math.PI) * Math.sin(Math.PI * tt / a));
    let d;
    if (x < a) d = ramp(x);
    else if (x > T - a) d = (g.s1 - g.s0) - ramp(T - x);
    else d = v * a / 2 + v * (x - a);
    return g.s0 + d;
  }

  speedAt(t) {
    const g = this.segmentAt(t);
    if (g.kind !== 'move') return 0;
    const x = t - g.t0, a = g.ramp, T = g.dur;
    if (x < 0 || x > T) return 0;
    if (x < a) return g.vmax * (1 - Math.cos(Math.PI * x / a)) / 2;
    if (x > T - a) return g.vmax * (1 - Math.cos(Math.PI * (T - x) / a)) / 2;
    return g.vmax;
  }

  // Full state at time t. comfort = comfort mode on/off.
  state(t, comfort = false, out = {}) {
    const g = this.segmentAt(t);
    const s = g.kind === 'move' ? this._moveS(g, t) : g.s0;
    const p = this.curve.getPoint(this._uAtS(s));
    out.x = p.x; out.z = p.z; out.yaw = this._yawAtS(s);
    out.segment = g;

    // Mist: 1 = outside hidden. mode: 0 calm/lab, 1 time tunnel.
    let mist = 0, tunnel = 0, lab = 0;
    const local = t - g.t0;
    if (t < 0) { mist = 1; lab = 1; }
    else if (g.kind === 'hold' && g.mist === 'lab') { mist = 1; lab = 1; }
    else if (g.kind === 'hold' && g.mist === 'clear') { mist = 1 - smooth(local / 4); }
    else if (g.kind === 'jump') {
      mist = 1;
      const p = local / g.dur;
      tunnel = smooth(p / 0.18) * (1 - smooth((p - 0.82) / 0.18));
      lab = g.dir === 'past' ? 1 - smooth(p / 0.18) : smooth((p - 0.82) / 0.18);
      if (g.dir === 'home') mist = smooth(local / 2.5); // world fades out first
    } else if (g.kind === 'move' && comfort) {
      const f = COMFORT.MIST_FADE;
      mist = smooth(local / f) * smooth((g.dur - local) / f);
    }
    out.mist = mist; out.tunnel = tunnel; out.lab = lab;

    // Year shown on the console.
    let year = TRIP_YEAR;
    if (g.kind === 'jump') {
      const k = smooth((local / g.dur - 0.1) / 0.8);
      year = g.dir === 'past' ? HOME_YEAR + (TRIP_YEAR - HOME_YEAR) * k : TRIP_YEAR + (HOME_YEAR - TRIP_YEAR) * k;
    } else if (t < this.segments[1].t0 || g === this.segments[this.segments.length - 1]) year = HOME_YEAR;
    out.year = Math.round(year);
    out.jumping = g.kind === 'jump';
    out.jumpProgress = g.kind === 'jump' ? local / g.dur : 0;

    out.alarm = t >= this.dogBark && t < this.marks.escape.t1;
    out.caption = this.captionAt(t);
    out.chapter = this.chapterIndex(t);
    return out;
  }

  captionAt(t) {
    if (t < 0) return { title: 'Gør klar', body: `Rejsen starter om ${Math.ceil(-t)} …`, key: 'cd' + Math.ceil(-t) };
    if (t >= this.duration) return { title: 'Rejsen er slut', body: 'Knib tommel- og pegefinger sammen (eller tryk R) for at rejse igen.', key: 'end' };
    let c = this.captions[0];
    for (const x of this.captions) if (x.t <= t) c = x;
    return { ...c, key: c.t };
  }

  chapterIndex(t) {
    let i = 0;
    this.chapters.forEach((c, k) => { if (c.t <= t) i = k; });
    return i;
  }

  // Comfort check, printed once at startup.
  report() {
    let maxV = 0, maxYaw = 0, prev = this.state(0).yaw;
    for (let t = 0.1; t < this.duration; t += 0.1) {
      const st = this.state(t);
      let d = st.yaw - prev; d = Math.atan2(Math.sin(d), Math.cos(d)); prev = st.yaw;
      maxYaw = Math.max(maxYaw, Math.abs(d) / 0.1 * 180 / Math.PI);
      maxV = Math.max(maxV, this.speedAt(t));
    }
    return { duration: this.duration, maxSpeed: maxV, maxYawRate: maxYaw, countdown: COUNTDOWN };
  }
}
