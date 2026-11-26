import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 1.6, BEATS = 2; // a huff each beat
const BEAT = DURATION / BEATS;
const MX = 6, MY = -6; // the anger mark, over the back corner of the head; the anchor is the top of the head
const EARS = [[-8, 3, -1], [7, 3, 1]]; // where the steam blows out: x, y, which way

// The anger mark's top-left vein, as a quadrant bitmap (a digit is a ramp step, lowered by how hot the mark is),
// mirrored into the other three around a cross of gap: swollen where it bends round the middle, its tips flicking out.
const REST = ['..5.', '...6', '4.76', '.677'];
const POP = ['..5..', '...6.', '...76', '4..77', '.6777'];

export const meta = {
  name: 'Enraged',
  desc: 'A berserk status over the head: a throbbing anger mark, steam huffing out both sides, a red heat shimmer round the body',
  tags: ['status', 'debuff', 'enraged', 'rage', 'berserk', 'anger', 'fury', 'steam'],
  size: [52, 44],
  origin: [26, 16],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8, steam: 6 },
  options: { palette: 'fire', steam: 'smoke', seed: 1 },
  // a short huff as each jet blows out (a whoosh peaks a third of the way in, so it starts that much early)
  sound: [0, 1].map(i => ({ t: ((i + 1) * BEAT - 0.07) % DURATION, kind: 'whoosh', gain: 0.35, pitch: 1.7 })),
};

// The throb, from the beat's phase: 2 the pop, 1 the veins spread, 0 at rest. Pop, spread, pop again, settle.
function throb(b) {
  return b < 0.06 ? 2 : b < 0.12 ? 1 : b < 0.18 ? 2 : b < 0.3 ? 1 : 0;
}

// The mark at size k: the quadrant mirrored four ways, spread apart by `open`, shifted down the ramp by `cool`.
function mark(p, C, k) {
  const q = k === 2 ? POP : REST, n = q.length, open = k === 1 ? 1 : 0, cool = k ? 2 : 3;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    q.forEach((row, i) => [...row].forEach((ch, j) => {
      if (ch === '.') return;
      p.px(MX + sx * (n - j + open), MY + sy * (n - i + open), C[+ch - cool]);
    }));
  }
  p.glow(MX + 0.5, MY + 0.5, 6 + 2 * k, C[3], 0.25 + 0.15 * k);
}

// One puff of a jet, tau seconds after it blew out: thrown out fast, dragged to a stop, swelling, rising and thinning.
function puff(p, S, x0, y0, side, tau, j, s) {
  const life = 0.45 + 0.12 * rand(j, s, 1); // gone before the next huff
  if (tau < 0 || tau > life) return;
  const u = tau / life, a = 0.3 + 0.2 * rand(j, s, 2), v = 62 + 24 * rand(j, s, 3), k = 7;
  const dist = (v / k) * (1 - Math.exp(-k * tau));
  const x = x0 + side * Math.cos(a) * dist, y = y0 - Math.sin(a) * dist - 14 * tau * tau;
  const r = 1 + 2.8 * (1 - Math.exp(-6 * tau)), alpha = (1 - u) ** 1.2;
  p.disc(x, y, r, (dx, dy) => S[Math.hypot(dx + r * 0.25, dy + r * 0.3) > r * 0.95 ? 3 : Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.7 ? 5 : 4], (dx, dy, d) => alpha * (1 - d ** 4 * 0.5));
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION, k = throb((ph * BEATS) % 1);
  // the body, flushed: heat shimmering up round it in wavy bands of red light, brighter on each throb
  for (let y = -2; y < 24; y++) {
    for (let x = -14; x <= 13; x++) {
      const d = Math.hypot((x + 2.5) / 13, (y - 11) / 14);
      if (d >= 1) continue;
      const band = 0.5 + 0.5 * Math.sin(TAU * (y / 6 + ph * 4) + 1.6 * Math.sin(TAU * (x / 12 + ph * 2)));
      p.light(x, y, C[3], (0.16 + 0.06 * k) * (1 - d) ** 0.8 * (0.35 + 0.65 * band ** 3));
    }
  }
}

export function draw(p, t, o) {
  const C = o.palette, S = o.steam, s = o.seed, ph = t / DURATION, b = (ph * BEATS) % 1, n = Math.floor(ph * BEATS);
  const tau = b * BEAT;
  for (const [x0, y0, side] of EARS) {
    if (tau < 0.1) { // the jet itself, a hiss of steam out of the ear
      const len = 3 + 4 * (tau / 0.1);
      p.line(x0, y0, x0 + side * len, y0 - len * 0.45, v => S[v > 0.4 ? 5 : 4]);
      p.glow(x0, y0, 5, C[4], 0.5 * (1 - tau / 0.1)); // hot
    }
    for (let j = 0; j < 4; j++) puff(p, S, x0 + side, y0, side, tau - j * 0.06, j * 2 + (side > 0) + n * 8, s);
  }
  mark(p, C, throb(b));
}
