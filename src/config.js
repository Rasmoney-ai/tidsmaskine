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
  SEAT_HEIGHT: 0.46,       // chair seat height (m)
  DESKTOP_EYE: 1.2,        // eye height in desktop mode (m)
  RADIUS: 3.7,             // octagon corner radius (m)
  SILL: 0.45,              // glass starts here
  WALL_TOP: 2.45,          // glass ends, dome starts
  DOME_TOP: 3.55,
};

export const SEAT_COUNT = CAPSULE.ROWS * 2;

// Seat n (1-10): odd = left, even = right, seats 1-2 in front.
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
  FOG_COLOR: 0xcfdbe0,
  FOG_DENSITY: 0.0052,
  MIST_LAB: 0xe8f4f2,       // bright "time lab" color around the capsule at home
  MIST_STEALTH: 0xc9d6da,   // calm comfort-mode mist
};
