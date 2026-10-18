// All tunable constants live here.

export const COMFORT = {
  MAX_SPEED: 2.0,          // m/s, capsule glide speed
  MAX_YAW_RATE: 9.5,        // degrees per second
  RAMP_TIME: 6,            // seconds to accelerate / brake (soft cosine ramp)
  MIST_FADE: 1.6,          // seconds, comfort-mode mist fade in/out around moves
};

export const CAPSULE = {
  HOVER: 1.0,              // floor height above ground (m)
  ROWS: 5,
  ROW_PITCH: 1.0,          // distance between rows (m)
  FRONT_ROW_Z: -2.0,       // z of row 1 (forward is -z)
  SEAT_X: 0.8,             // half distance between the two seats in a row
  DESKTOP_EYE: 1.6,        // standing eye height in desktop mode (m)
  WALK_RADIUS: 2.7,        // how far from the center you can walk on desktop (m)
  RADIUS: 3.7,             // octagon corner radius (m)
  SILL: 0.3,               // glass starts here
  WALL_TOP: 2.7,           // glass ends, ceiling starts
  DOME_TOP: 3.6,
};

export const SEAT_COUNT = CAPSULE.ROWS * 2;

// Start place n (1-10) on the floor: odd = left, even = right, 1-2 in front. Later: one per student.
export function seatPosition(n) {
  const i = Math.min(Math.max(n, 1), SEAT_COUNT) - 1;
  const row = Math.floor(i / 2);
  const side = i % 2 === 0 ? -1 : 1;
  return { x: side * CAPSULE.SEAT_X, z: CAPSULE.FRONT_ROW_Z + row * CAPSULE.ROW_PITCH };
}

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
