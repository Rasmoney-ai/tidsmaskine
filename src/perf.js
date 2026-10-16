// Performance meter (?debug=1) and a safety net that lowers detail if the frame rate drops in VR.
import { PERF } from './config.js';

export class Perf {
  constructor(renderer, world) {
    this.renderer = renderer;
    this.world = world;
    this.level = 0;          // 0 full detail, 1 no decoration, 2 fewer trees
    this.fps = 0;
    this.frames = 0;
    this.windowStart = 0;
    this.slowWindows = 0;
    this.calls = 0;
    this.tris = 0;
  }

  frame(now, inVR) {
    const info = this.renderer.info.render;
    this.calls = info.calls; this.tris = info.triangles;
    this.frames++;
    if (!this.windowStart) this.windowStart = now;
    const span = now - this.windowStart;
    if (span < 2000) return;
    this.fps = Math.round((this.frames * 1000) / span);
    this.frames = 0; this.windowStart = now;
    // Only judge in VR: desktop browsers often cap or throttle differently.
    if (inVR && this.fps < PERF.MIN_FPS) this.slowWindows++; else this.slowWindows = 0;
    if (this.slowWindows >= 2 && this.level < 2) { this.setLevel(this.level + 1); this.slowWindows = 0; }
  }

  setLevel(level) {
    this.level = level;
    this.world.decor.visible = level < 1;
    for (const m of this.world.forest.instanced) {
      m.userData.full ??= m.count;
      m.count = level >= 2 ? Math.floor(m.userData.full * 0.5) : m.userData.full;
    }
    console.info('Detail level', level);
  }

  summary() {
    return `${this.fps} fps · ${this.calls} kald · ${Math.round(this.tris / 1000)}k trekanter · niveau ${this.level}`;
  }
}
