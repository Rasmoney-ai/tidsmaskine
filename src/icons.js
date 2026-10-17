// Simple line symbols drawn on canvas: scanned objects, analysis types, periods, tabs and zones.
// Principle: few words, symbols instead of text.

const LINE = '#dff0f2', FILL = 'rgba(223,240,242,0.12)', AMBER = '#ffb36b';

function setup(ctx, x, y, color = LINE) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = FILL; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
}
const helpers = (ctx, r) => ({
  poly(pts, fill = true) { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r))); ctx.closePath(); if (fill) ctx.fill(); ctx.stroke(); },
  line(pts) { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r))); ctx.stroke(); },
  ring(cx, cy, rr, fill = false, a0 = 0, a1 = Math.PI * 2) { ctx.beginPath(); ctx.arc(cx * r, cy * r, rr * r, a0, a1); if (fill) ctx.fill(); ctx.stroke(); },
});

// Scanned objects.
export function drawItemIcon(ctx, id, x, y, r) {
  setup(ctx, x, y);
  const { poly, line, ring } = helpers(ctx, r);
  switch (id) {
    case 'soelvmoent':
      ctx.fillStyle = '#c9ccd0'; ring(0, 0, 1, true); ctx.strokeStyle = '#8d9196'; ring(0, 0, 0.86);
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.25 + k * r * 0.25); ctx.bezierCurveTo(-r * 0.15, -r * 0.38 + k * r * 0.25, r * 0.1, -r * 0.1 + k * r * 0.25, r * 0.45, -r * 0.3 + k * r * 0.25); ctx.stroke(); }
      break;
    case 'vaevevaegt': ring(0, 0, 0.8, true); ctx.fillStyle = '#0d1013'; ring(0, 0, 0.32, true); break;
    case 'hvaessesten': poly([[-1, -0.18], [1, -0.28], [1, 0.12], [-1, 0.22]]); ring(0.8, -0.05, 0.06); break;
    case 'kam': poly([[-1, -0.35], [1, -0.35], [1, 0], [-1, 0]]); for (let i = 0; i < 11; i++) line([[-0.9 + i * 0.18, 0], [-0.9 + i * 0.18, 0.45]]); break;
    case 'toervblok': poly([[-0.9, -0.3], [0.9, -0.3], [0.9, 0.5], [-0.9, 0.5]]); line([[-0.9, -0.1], [0.9, -0.1]]); break;
    case 'thorshammer': poly([[-0.7, -0.15], [0.7, -0.15], [0.7, 0.15], [0.2, 0.15], [0.2, 0.9], [-0.2, 0.9], [-0.2, 0.15], [-0.7, 0.15]]); ring(0, -0.38, 0.2); break;
    case 'spade': poly([[-0.35, 0.2], [0.35, 0.2], [0.35, 0.95], [-0.35, 0.95]]); line([[0, 0.2], [0, -0.95]]); line([[-0.25, -0.95], [0.25, -0.95]]); break;
    case 'store_sten': poly([[-0.75, 1], [0.75, 1], [0.45, -1], [-0.4, -1]]); for (let k = 0; k < 4; k++) line([[-0.4, -0.55 + k * 0.4], [0.4, -0.55 + k * 0.4]]); break;
    case 'lille_sten': poly([[-0.5, 1], [0.5, 1], [0.35, -0.6], [-0.3, -0.7]]); line([[0, -0.4], [0, 0.8]]); break;
    case 'kors': poly([[-0.15, -0.6], [0.15, -0.6], [0.15, -0.2], [0.55, -0.2], [0.55, 0.1], [0.15, 0.1], [0.15, 0.95], [-0.15, 0.95], [-0.15, 0.1], [-0.55, 0.1], [-0.55, -0.2], [-0.15, -0.2]]); ring(0, -0.78, 0.17); break;
    case 'mejsel': poly([[-0.12, -1], [0.12, -1], [0.12, 0.6], [0, 1], [-0.12, 0.6]]); break;
    case 'egestolpe': poly([[-0.3, 1], [0.3, 1], [0.3, -0.6], [0, -1], [-0.3, -0.6]]); for (let k = 0; k < 3; k++) ring(0, 0.9, 0.1 + k * 0.08, false, Math.PI, 0); break;
    case 'oekse': line([[-0.1, 1], [0.15, -0.9]]); poly([[0.05, -0.9], [0.75, -1], [0.85, -0.2], [0.1, -0.45]]); break;
    default: ctx.strokeRect(-r, -r, 2 * r, 2 * r);
  }
  ctx.restore();
}

// Analysis types: symbols instead of headings.
const ANALYSIS = {
  Materiale: 'material', Oprindelse: 'origin', Alder: 'rings', 'Årringe': 'rings', Spor: 'trace',
  Pollen: 'pollen', Billeder: 'images', Farver: 'colors', Tegn: 'signs',
};
export function drawAnalysisIcon(ctx, type, x, y, r) {
  setup(ctx, x, y, AMBER);
  const { poly, line, ring } = helpers(ctx, r);
  ctx.fillStyle = 'rgba(255,179,107,0.15)';
  switch (ANALYSIS[type] || 'material') {
    case 'material':   // a cut crystal: what it is made of
      poly([[0, -1], [0.85, -0.35], [0.55, 0.9], [-0.55, 0.9], [-0.85, -0.35]]); line([[0, -1], [0, 0.9]]); line([[-0.85, -0.35], [0.85, -0.35]]); break;
    case 'origin':     // compass needle: where it comes from
      ring(0, 0, 0.95); poly([[0, -0.8], [0.22, 0], [0, 0.8], [-0.22, 0]]); break;
    case 'rings':      // tree rings: age
      for (let k = 1; k <= 4; k++) ring(0.05 * k, 0, 0.24 * k); break;
    case 'trace':      // magnifying glass: traces of use
      ring(-0.2, -0.2, 0.55); line([[0.2, 0.2], [0.85, 0.85]]); break;
    case 'pollen':     // flower
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ring(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.3); }
      ctx.fillStyle = AMBER; ring(0, 0, 0.18, true); break;
    case 'images':     // picture frame with a figure
      poly([[-0.9, -0.75], [0.9, -0.75], [0.9, 0.75], [-0.9, 0.75]], false); line([[-0.6, 0.5], [-0.15, -0.1], [0.2, 0.3], [0.45, 0], [0.7, 0.5]]); ring(0.45, -0.4, 0.14); break;
    case 'colors':     // three drops of paint
      for (const [cx, col] of [[-0.55, '#c23b2e'], [0, '#1b1b1b'], [0.55, '#1f3f8a']]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx * r, -0.7 * r); ctx.quadraticCurveTo((cx + 0.38) * r, 0.1 * r, cx * r, 0.55 * r); ctx.quadraticCurveTo((cx - 0.38) * r, 0.1 * r, cx * r, -0.7 * r); ctx.fill(); ctx.stroke();
      }
      break;
    case 'signs':      // rune-like strokes
      line([[-0.6, -0.9], [-0.6, 0.9]]); line([[-0.6, -0.5], [-0.15, -0.9]]); line([[0.4, -0.9], [0.4, 0.9]]); line([[0.1, -0.3], [0.7, 0.2]]); line([[0.7, -0.3], [0.1, 0.2]]); break;
  }
  ctx.restore();
}

// Periods on the time line (left = oldest): stone tool, bronze axe, Viking ship, castle, church tower, factory, today.
export const PERIODS = 7;
export function drawPeriodIcon(ctx, i, x, y, r) {
  setup(ctx, x, y);
  const { poly, line, ring } = helpers(ctx, r);
  switch (i) {
    case 0: poly([[0, -1], [0.55, -0.1], [0.4, 0.8], [-0.4, 0.8], [-0.55, -0.1]]); line([[-0.2, -0.3], [0.1, 0.1]]); line([[0.15, -0.4], [-0.1, 0.3]]); break;
    case 1: poly([[-0.25, -1], [0.25, -1], [0.3, 0.2], [0.75, 0.9], [-0.75, 0.9], [-0.3, 0.2]]); ring(0, -0.65, 0.12); break;
    case 2: poly([[-1, -0.1], [1, -0.1], [0.75, 0.5], [-0.75, 0.5]]); line([[-1, -0.1], [-1.05, -0.5]]); line([[1, -0.1], [1.05, -0.5]]); line([[0, -0.1], [0, -1]]); poly([[0, -0.95], [0.6, -0.5], [0, -0.3]]); break;
    case 3: poly([[-0.9, 1], [-0.9, -0.5], [-0.6, -0.5], [-0.6, -0.3], [-0.3, -0.3], [-0.3, -0.5], [0.3, -0.5], [0.3, -0.3], [0.6, -0.3], [0.6, -0.5], [0.9, -0.5], [0.9, 1]]); poly([[-0.25, 1], [-0.25, 0.4], [0.25, 0.4], [0.25, 1]], false); break;
    case 4: poly([[-0.8, 1], [-0.8, 0.1], [0, -0.3], [0.8, 0.1], [0.8, 1]]); poly([[-0.25, -0.3], [-0.25, -0.7], [0, -1.05], [0.25, -0.7], [0.25, -0.3]]); line([[0, 0.3], [0, 0.8]]); line([[-0.2, 0.5], [0.2, 0.5]]); break;
    case 5: poly([[-0.9, 1], [-0.9, 0.1], [-0.4, -0.2], [-0.4, 0.1], [0.1, -0.2], [0.1, 0.1], [0.6, -0.2], [0.6, 1]]); poly([[0.62, 1], [0.62, -0.9], [0.85, -0.9], [0.85, 1]]); ring(0.85, -1.1, 0.12); break;
    case 6: poly([[-0.45, -1], [0.45, -1], [0.45, 1], [-0.45, 1]]); poly([[-0.33, -0.8], [0.33, -0.8], [0.33, 0.65], [-0.33, 0.65]], false); ring(0, 0.82, 0.07); break;
  }
  ctx.restore();
}

// Tabs of the main terminal.
export function drawTabIcon(ctx, tab, x, y, r, color = LINE) {
  setup(ctx, x, y, color);
  const { poly, line, ring } = helpers(ctx, r);
  switch (tab) {
    case 'zones':   // four places around a center
      for (const [cx, cy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) ring(cx, cy, 0.28); break;
    case 'map':     // folded map with a pin
      poly([[-1, -0.7], [-0.35, -0.9], [0.35, -0.7], [1, -0.9], [1, 0.7], [0.35, 0.9], [-0.35, 0.7], [-1, 0.9]]); line([[-0.35, -0.9], [-0.35, 0.7]]); line([[0.35, -0.7], [0.35, 0.9]]); break;
    case 'lab':     // flask
      poly([[-0.2, -1], [0.2, -1], [0.2, -0.3], [0.8, 0.9], [-0.8, 0.9], [-0.2, -0.3]]); line([[-0.5, 0.35], [0.5, 0.35]]); break;
    case 'log':     // open book
      poly([[0, -0.6], [-1, -0.85], [-1, 0.75], [0, 0.95], [1, 0.75], [1, -0.85]]); line([[0, -0.6], [0, 0.95]]); break;
  }
  ctx.restore();
}

// Zone pictograms: house, mounds, standing stone, palisade.
export function drawZoneIcon(ctx, zone, x, y, r, color = LINE) {
  setup(ctx, x, y, color);
  const { poly, line, ring } = helpers(ctx, r);
  switch (zone) {
    case 'A': poly([[-1, 0.7], [-1, 0], [0, -0.75], [1, 0], [1, 0.7]]); poly([[-0.2, 0.7], [-0.2, 0.25], [0.2, 0.25], [0.2, 0.7]], false); break;
    case 'B': ring(-0.35, 0.8, 0.75, true, Math.PI, 0); ring(0.55, 0.8, 0.45, true, Math.PI, 0); line([[-1.15, 0.8], [1.05, 0.8]]); break;
    case 'C': poly([[-0.45, 0.9], [0.45, 0.9], [0.3, -0.9], [-0.25, -0.9]]); for (let k = 0; k < 3; k++) line([[-0.2, -0.5 + k * 0.4], [0.2, -0.5 + k * 0.4]]); break;
    case 'D': for (let k = 0; k < 5; k++) { const px = -0.8 + k * 0.4; poly([[px - 0.14, 0.9], [px + 0.14, 0.9], [px + 0.14, -0.55], [px, -0.85], [px - 0.14, -0.55]]); } break;
  }
  ctx.restore();
}

// Other symbols used on the terminal: door (portal), home, arrows, "not matching", question mark.
export function drawSymbol(ctx, name, x, y, r, color = LINE) {
  setup(ctx, x, y, color);
  const { poly, line, ring } = helpers(ctx, r);
  switch (name) {
    case 'door': ring(0, 0, 0.9); ring(0, 0, 0.6); line([[0.15, -0.3], [0.45, 0], [0.15, 0.3]]); line([[-0.3, 0], [0.45, 0]]); break;
    case 'home': poly([[-0.8, 0.85], [-0.8, -0.05], [0, -0.8], [0.8, -0.05], [0.8, 0.85]]); ring(0, 0.2, 0.22); break;
    case 'prev': poly([[0.5, -0.8], [-0.6, 0], [0.5, 0.8]]); break;
    case 'next': poly([[-0.5, -0.8], [0.6, 0], [-0.5, 0.8]]); break;
    case 'notmatch': line([[-0.8, -0.3], [0.8, -0.3]]); line([[-0.8, 0.3], [0.8, 0.3]]); line([[0.4, -0.85], [-0.4, 0.85]]); break;
    case 'clear': ring(0, 0, 0.8); line([[-0.4, -0.4], [0.4, 0.4]]); line([[0.4, -0.4], [-0.4, 0.4]]); break;
    case 'pin':
      ctx.fillStyle = AMBER; ctx.strokeStyle = '#0d1013';
      ctx.beginPath(); ctx.moveTo(0, r); ctx.bezierCurveTo(-0.7 * r, 0, -0.7 * r, -1.1 * r, 0, -1.1 * r); ctx.bezierCurveTo(0.7 * r, -1.1 * r, 0.7 * r, 0, 0, r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0d1013'; ring(0, -0.5, 0.22, true); break;
  }
  ctx.restore();
}

export function drawQuestion(ctx, x, y, size, alpha = 0.35) {
  ctx.save();
  ctx.fillStyle = `rgba(223,240,242,${alpha})`; ctx.font = `300 ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y);
  ctx.restore();
}

// A plain map of northern Europe without any names: land shapes only (longitude, latitude).
const LAND = [
  // Continent with Jutland
  [[-1.5, 43.5], [-1.2, 46], [-2.2, 47.2], [-4.6, 48.4], [-1.6, 48.7], [0.2, 49.6], [1.6, 50.2], [3, 51.2], [4.4, 51.9], [4.8, 53.2], [7, 53.5], [8.6, 53.9], [8.6, 55.0], [8.1, 55.5], [8.2, 56.6], [8.6, 57.1], [10.6, 57.7], [10.4, 57.1], [10.3, 56.3], [10.9, 56.4], [10.0, 55.6], [9.6, 55.0], [10.0, 54.6], [11.0, 54.0], [12.5, 54.4], [14.3, 53.9], [16.5, 54.6], [18.5, 54.8], [19.9, 54.4], [21.2, 55.2], [21.0, 56.5], [21.6, 57.4], [23.0, 57.0], [24.2, 57.3], [24.0, 58.5], [23.5, 59.2], [28, 59.5], [30, 59.9], [32, 60.5], [37, 60.5], [37, 42], [-2, 42]],
  // Zealand, Funen, Bornholm, Gotland
  [[11.0, 55.4], [11.4, 55.2], [12.2, 55.0], [12.6, 55.6], [12.5, 56.0], [12.0, 56.1], [11.2, 55.9], [10.9, 55.7]],
  [[9.7, 55.5], [10.4, 55.5], [10.8, 55.2], [10.5, 55.0], [9.9, 55.1]],
  [[14.7, 55.0], [15.15, 55.15], [14.9, 55.3], [14.7, 55.25]],
  [[18.2, 57.0], [18.9, 57.5], [18.6, 57.9], [18.1, 57.4]],
  // Scandinavia
  [[5.0, 59.0], [5.6, 58.1], [7.0, 58.0], [8.5, 58.2], [10.5, 59.1], [11.2, 59.0], [11.5, 58.0], [12.4, 56.5], [12.8, 55.6], [14.2, 55.4], [14.4, 56.0], [16.3, 56.6], [16.6, 57.8], [18.4, 59.3], [17.2, 60.7], [17.5, 62.4], [21.0, 64.0], [22.5, 65.8], [25.4, 65.0], [21.6, 63.0], [21.3, 61.5], [23.0, 59.9], [28, 60.4], [30, 61], [31, 63], [30, 65], [35, 66.5], [41, 67], [41, 72], [25, 72], [20, 70], [15, 68.5], [12.5, 66], [10, 64], [5, 62], [4.8, 60.5]],
  // Britain, Ireland
  [[-5.7, 50.1], [1.4, 51.2], [1.7, 52.6], [0.3, 53.4], [-0.5, 54.5], [-1.6, 55.6], [-2.5, 56.2], [-1.8, 57.6], [-3.0, 58.6], [-5.0, 58.6], [-6.2, 57.5], [-5.6, 56.3], [-4.9, 55.0], [-3.0, 54.2], [-3.4, 53.4], [-4.6, 52.8], [-4.2, 51.6], [-5.2, 51.7], [-5.0, 50.6]],
  [[-6.0, 52.2], [-6.2, 53.9], [-5.6, 54.6], [-7.4, 55.3], [-8.6, 54.9], [-10.0, 53.5], [-9.6, 52.0], [-8.5, 51.6], [-6.4, 52.0]],
];
export const REGION = { lon0: -12, lon1: 34, lat0: 44, lat1: 68 };
// Map projection for the region map: lon/lat <-> canvas inside rect.
export function regionProjection(rect) {
  const k = Math.cos((57 * Math.PI) / 180), w = (REGION.lon1 - REGION.lon0) * k, h = REGION.lat1 - REGION.lat0;
  const s = Math.min(rect.w / w, rect.h / h);
  const ox = rect.x + (rect.w - w * s) / 2, oy = rect.y + (rect.h - h * s) / 2;
  return {
    toXY: (lon, lat) => [ox + (lon - REGION.lon0) * k * s, oy + (REGION.lat1 - lat) * s],
    toLonLat: (x, y) => [REGION.lon0 + (x - ox) / (k * s), REGION.lat1 - (y - oy) / s],
  };
}
export function drawRegionMap(ctx, rect) {
  const P = regionProjection(rect);
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.fillStyle = '#0f2027'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);    // sea
  ctx.fillStyle = '#2b3a33'; ctx.strokeStyle = 'rgba(223,240,242,0.35)'; ctx.lineWidth = 1.5;
  for (const shape of LAND) {
    ctx.beginPath();
    shape.forEach(([lon, lat], i) => { const [x, y] = P.toXY(lon, lat); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(223,240,242,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}
