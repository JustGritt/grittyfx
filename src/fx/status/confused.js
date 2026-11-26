const TAU = Math.PI * 2;
const DURATION = 2.4;
const SWAPS = [[0.2, 0.5], [0.7, 1]]; // of the loop: the two marks whirl round and trade places, half a turn each time
const RX = 7, RY = 4, CY = -8; // the turn, an ellipse over the head, the top going right; the anchor is the top of the head

// The question mark: '7' the brightest step, lit from the top left, down to '5'.
const MARK = ['.776.', '76.76', '...65', '..65.', '..5..', '.....', '..5..'];

export const meta = {
  name: 'Confused',
  desc: 'A confused status over the head: two question marks bob and tilt this way and that, then whirl round each other in a little swirl and trade places',
  tags: ['status', 'debuff', 'confuse', 'confused', 'question', 'puzzled', 'dizzy', 'swirl'],
  size: [36, 22],
  origin: [18, 18],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  // a wobbling chime as they land, two bells a hair apart beating; the second higher, like a question
  sound: SWAPS.flatMap(([a, b], i) => [1, 1.006].map(k => ({ t: (a + 0.8 * (b - a)) * DURATION, kind: 'chime', gain: 0.16, pitch: (i ? 1.7 : 1.5) * k }))),
};

// Eased 0 to 1 with a little draw-back first and a little overshoot at the end.
function backInOut(x) {
  const c = 0.9;
  return x < 0.5 ? (2 * x) ** 2 * ((c + 1) * 2 * x - c) / 2 : ((2 * x - 2) ** 2 * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
}

// How far round the marks have turned at phase ph, in half turns: 0 to 2 over the loop.
function turned(ph) {
  let n = 0;
  for (const [a, b] of SWAPS) n += ph <= a ? 0 : ph >= b ? 1 : backInOut((ph - a) / (b - a));
  return n;
}

// How far into a swap ph is, 0 to 1, or -1 between swaps.
const swapping = ph => SWAPS.reduce((w, [a, b]) => (ph > a && ph < b ? (ph - a) / (b - a) : w), -1);

// Mark j (0 starts on the left, 1 on the right) at phase ph: its angle on the turn, where, z (-1 at the top of the
// turn, 1 at the bottom), its tilt.
function mark(j, ph) {
  const a = Math.PI * (turned(ph) + 1 - j), z = Math.sin(a), w = swapping(ph);
  const ponder = Math.sin(TAU * (ph * 2 + j * 0.5)); // tilts one way, then the other, the two out of step
  const tilt = w > 0.2 && w < 0.75 ? -Math.sign(z) : Math.abs(ponder) < 0.5 ? 0 : Math.sign(ponder); // leans into the whirl
  return { a, x: Math.cos(a) * RX, y: CY + z * RY + Math.sin(TAU * (ph * 2 + j * 0.5 + 0.25)), z, tilt };
}

// A bitmap centered on (x, y), its rows sheared by `tilt` (top and bottom a pixel apart), its steps raised by `lift`;
// `rim` edges it below and right, so it holds on a light background.
function sprite(p, C, rows, x, y, tilt, lift, rim) {
  const h = rows.length, w = rows[0].length, x0 = Math.round(x) - (w >> 1), y0 = Math.round(y) - (h >> 1);
  const dx = i => tilt * Math.round((h / 2 - 0.5 - i) / (h / 2)), at = (i, k) => rows[i]?.[k - dx(i)] > '.';
  if (rim) {
    for (let i = 0; i <= h; i++) for (let k = -1; k <= w + 1; k++) if (!at(i, k) && (at(i - 1, k) || at(i, k - 1))) p.px(x0 + k, y0 + i, rim);
  }
  rows.forEach((row, i) => [...row].forEach((ch, k) => ch !== '.' && p.px(x0 + k + dx(i), y0 + i, C[Math.min(7, Math.max(1, +ch + lift))])));
}

export function draw(p, t, o) {
  const C = o.palette, ph = t / DURATION, w = swapping(ph);
  for (let j = 0; j < 2; j++) {
    const m = mark(j, ph);
    // a streak along the turn behind each, as long as it is fast: the two together are the swirl
    const span = Math.min(2.2, m.a - mark(j, (ph - 0.05 + 1) % 1).a);
    for (let s = 0.45; s < span; s += 0.05) {
      const b = m.a - s, u = s / span;
      p.dot(Math.cos(b) * RX, m.y - m.z * RY + Math.sin(b) * RY, C[u < 0.5 ? 5 : 4], 1.6 * (1 - u));
    }
  }
  for (let j = 0; j < 2; j++) {
    const m = mark(j, ph), land = w > 0.72 && w < 0.88; // a flash as they land
    p.glow(Math.round(m.x) + 0.5, Math.round(m.y) + 0.5, land ? 8 : 6, C[5], land ? 0.45 : 0.25);
    sprite(p, C, MARK, m.x, m.y, m.tilt, land ? 1 : 0, C[2]);
  }
}
