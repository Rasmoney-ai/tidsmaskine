// Placeholder sound made with Web Audio: capsule hum, outdoor ambience, time-jump whoosh and small effects.
export class Audio {
  constructor() { this.ctx = null; }

  // Must be called from a user gesture.
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // Hum.
    this.hum = ctx.createGain(); this.hum.gain.value = 0; this.hum.connect(this.master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.connect(this.hum);
    for (const [f, type, g] of [[55, 'sawtooth', 0.35], [82.5, 'sine', 0.4], [110.4, 'sine', 0.2]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg).connect(lp); o.start();
    }
    // Wind / outdoors.
    this.wind = ctx.createGain(); this.wind.gain.value = 0; this.wind.connect(this.master);
    const n1 = this._noise(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.4;
    n1.connect(bp).connect(this.wind);
    // Whoosh for time jumps (filter and level follow the jump progress).
    this.whoosh = ctx.createGain(); this.whoosh.gain.value = 0; this.whoosh.connect(this.master);
    const n2 = this._noise(); this.whooshF = ctx.createBiquadFilter(); this.whooshF.type = 'bandpass'; this.whooshF.Q.value = 1.2; this.whooshF.frequency.value = 300;
    n2.connect(this.whooshF).connect(this.whoosh);
  }

  _noise() { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start(); return s; }

  // Continuous levels, called every frame.
  setLevels({ hum, outside, jump }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.hum.gain.setTargetAtTime(0.09 * hum, now, 0.2);
    this.wind.gain.setTargetAtTime(0.05 * outside, now, 0.3);
    const j = Math.sin(Math.PI * Math.min(Math.max(jump, 0), 1));
    this.whoosh.gain.setTargetAtTime(0.22 * j, now, 0.15);
    this.whooshF.frequency.setTargetAtTime(250 + 1800 * j, now, 0.2);
  }

  _out(gain, pan) {
    const g = this.ctx.createGain(); g.gain.value = gain;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(this.master); }
    else g.connect(this.master);
    return g;
  }

  _env(node, out, t0, a, dur, peak = 1) {
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g).connect(out);
  }

  _osc(type, f0, f1, t0, dur, out, a = 0.005, peak = 1) {
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    this._env(o, out, t0, a, dur, peak); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  _burst(freq, q, t0, dur, out, type = 'bandpass', peak = 1) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); this._env(f, out, t0, 0.004, dur, peak); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }

  // One-shot effects. gain 0..1, pan -1..1.
  play(name, gain = 1, pan = 0) {
    if (!this.ctx || gain < 0.01) return;
    const t = this.ctx.currentTime + 0.01, out = this._out(gain, pan);
    switch (name) {
      case 'chime': [880, 1318.5, 1760].forEach((f, i) => this._osc('sine', f, f, t + i * 0.12, 1.6, out, 0.01, 0.12)); break;
      case 'alert': [0, 0.35].forEach((o) => this._osc('square', 740, 740, t + o, 0.18, out, 0.01, 0.05)); break;
      case 'whooshStart': this._osc('sine', 120, 40, t, 2.5, out, 0.3, 0.2); break;
      case 'beep': this._osc('sine', 660, 660, t, 0.15, out, 0.005, 0.12); break;
      case 'go': this._osc('sine', 990, 990, t, 0.4, out, 0.005, 0.14); break;
      case 'clink':
        this._osc('sine', 2600, 2500, t, 0.12, out, 0.002, 0.25);
        this._osc('sine', 3900, 3800, t, 0.08, out, 0.002, 0.12);
        this._burst(4000, 2, t, 0.04, out, 'bandpass', 0.4); break;
      case 'chop':
        this._burst(700, 1, t, 0.12, out, 'lowpass', 0.9);
        this._osc('sine', 160, 80, t, 0.15, out, 0.003, 0.5); break;
      case 'bark':
        this._osc('sawtooth', 520, 300, t, 0.16, out, 0.01, 0.35);
        this._burst(900, 1.5, t, 0.14, out, 'bandpass', 0.5); break;
      case 'baa': {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 290;
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 7; const lg = this.ctx.createGain(); lg.gain.value = 18;
        lfo.connect(lg).connect(o.frequency);
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1;
        o.connect(f); this._env(f, out, t, 0.06, 0.7, 0.3); o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
        break;
      }
      case 'bird':
        for (let i = 0; i < 3; i++) this._osc('sine', 3200 + i * 300, 4400, t + i * 0.13, 0.08, out, 0.005, 0.12);
        break;
    }
  }
}
