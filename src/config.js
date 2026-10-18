// All tunable constants live here.

export const COMFORT = {
  MAX_SPEED: 2.0,          // m/s, capsule glide speed
  MAX_YAW_RATE: 9.5,        // degrees per second
  RAMP_TIME: 6,            // seconds to accelerate / brake (soft cosine ramp)
  MIST_FADE: 1.6,          // seconds, comfort-mode mist fade in/out around moves
};

export const CAPSULE = {
  HOVER: 1.0,              // floor height above ground (m)
  DESKTOP_EYE: 1.6,        // standing eye height in desktop mode (m)
  WALK_RADIUS: 1.2,        // how far from the center you can walk on desktop (m)
  RADIUS: 1.85,            // octagon corner radius (m): about 3.7 m across
  SILL: 0.3,               // glass starts here
  WALL_TOP: 2.7,           // glass ends, ceiling starts
  DOME_TOP: 3.6,
};

// Where the student always starts: just behind the center, facing the terminal and the door (forward is -z).
export const START = { x: 0, z: 0.35 };

// Passthrough as the present (immersive-ar). Off for now until the capsule size fits a classroom;
// ?ar=1 turns it on for testing. Off: the headset starts in VR and the present is dark, calm mist.
export const PASSTHROUGH = false;

export const COUNTDOWN = 5;          // seconds before the trip starts
export const TRIP_YEAR = 968;
export const HOME_YEAR = 2026;

export const WORLD = {
  FOG_COLOR: 0xe2d9c4,
  FOG_DENSITY: 0.0058,
  MIST_LAB: 0x1b2125,       // the present without passthrough: dark, calm mist around the capsule
  MIST_STEALTH: 0xc9d6da,   // calm comfort-mode mist
};

// Performance budget per stop (a cautious guess for Quest 3) and the frame-rate safety net.
export const PERF = {
  BUDGET_TRIANGLES: 150000,
  BUDGET_CALLS: 80,
  MIN_FPS: 66,
};
