import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 1.2;
const N = 3; // stars, a third of a turn apart, one turn a loop
const RX = 11, RY = 3.5, CY = -4; // the orbit, a flattened ellipse over the head; the anchor is the top of the head

// Star bitmaps: '7' the brightest step of the star's own shade, '6' one below, and so on down to '3'.
const BIG = ['..7..', '..7..', '77665', '.654.', '.5.4.'];
const SMALL = ['.6.', '654', '5.4'];

export const meta = {
  name: 'Stunned',
  desc: 'A dazed status over the head: little stars orbiting in a flattened ring, twinkling, bright in front and dim behind',
  tags: ['status', 'stun', 'dizzy', 'daze', 'stars', 'debuff'],
  size: [36, 20],
  origin: [18, 15],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  // a little ting as each star swings past the front
  sound: Array.from({ length: N }, (_, j) => ({ t: (((0.25 - j / N) % 1) + 1) % 1 * DURATION, kind: 'chime', gain: 0.2, pitch: [2.5, 2.25, 2.8][j] })),
};

// Star j: where it is on the orbit and how near (z, -1 behind the head to 1 in front).
function star(j, ph) {
  const a = TAU * (ph + j / N);
  return { a, x: Math.cos(a) * RX, y: CY + Math.sin(a) * RY, z: Math.sin(a) };
}

// A bitmap centered on (x, y), its steps lowered by `shift`; `rim` edges it below and right, so it holds on a light
// background without blunting its points.
function sprite(p, C, rows, x, y, shift, rim) {
  const h = rows.length, w = rows[0].length, at = (i, k) => rows[i]?.[k] > '.';
  const x0 = x - (w >> 1), y0 = y - (h >> 1);
  if (rim) {
    for (let i = 0; i <= h; i++) for (let k = 0; k <= w; k++) if (!at(i, k) && (at(i - 1, k) || at(i, k - 1))) p.px(x0 + k, y0 + i, rim);
  }
  rows.forEach((row, i) => [...row].forEach((ch, k) => ch !== '.' && p.px(x0 + k, y0 + i, C[Math.max(1, +ch - shift)])));
}

function layer(p, t, o, front) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  for (let i = 0; i < 48; i++) { // the orbit itself, faint
    const b = (i / 48) * TAU, zb = Math.sin(b);
    if (zb > 0 === front) p.dot(Math.cos(b) * RX, CY + zb * RY, C[front ? 3 : 2], 0.35);
  }
  for (let j = 0; j < N; j++) {
    const { a, z } = star(j, ph);
    for (let i = 24; i >= 4; i--) { // the trail along the orbit, cooling and thinning out behind the star
      const b = a - i * 0.04, zb = Math.sin(b), u = i / 24;
      if (zb > 0 !== front) continue;
      p.dot(Math.cos(b) * RX, CY + zb * RY, C[(zb > 0 ? 5 : 4) - (u > 0.5 ? 1 : 0)], u < 0.5 ? 1 : 1.6 * (1 - u));
    }
    if (z > 0 !== front) continue;
    const { x, y } = star(j, ph), X = Math.round(x), Y = Math.round(y);
    const tw = (ph * 3 + rand(j, s)) % 1; // three twinkles a turn
    const shift = z > 0.3 ? 0 : z > -0.3 ? 1 : 2; // dimmer the farther it is
    p.glow(X + 0.5, Y + 0.5, 6, C[5], 0.12 + 0.12 * (z + 1));
    sprite(p, C, z > -0.3 ? BIG : SMALL, X, Y, shift, z > 0.3 && C[2]);
    if (tw < 0.18 && z > -0.3) { // a glint: a white heart and a cross of light
      const L = tw < 0.09 ? 4 : 3;
      p.px(X, Y, C[7]);
      p.line(X - L, Y, X - 3, Y, C[6]);
      p.line(X + 3, Y, X + L, Y, C[6]);
      p.light(X, Y, C[7], 0.6);
    }
  }
}

export function drawBack(p, t, o) {
  layer(p, t, o, false);
}

export function draw(p, t, o) {
  layer(p, t, o, true);
}
