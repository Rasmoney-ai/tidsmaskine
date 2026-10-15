// Replaceable time source. Later: audio-track clock or shared server clock with the same interface.
export class LocalClock {
  constructor(start = 0) {
    this.base = start;
    this.startedAt = 0;
    this.playing = false;
  }
  now() { return performance.now() / 1000; }
  get t() { return this.playing ? this.base + (this.now() - this.startedAt) : this.base; }
  play() { if (!this.playing) { this.startedAt = this.now(); this.playing = true; } }
  pause() { if (this.playing) { this.base = this.t; this.playing = false; } }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(t) { this.base = t; this.startedAt = this.now(); }
}
