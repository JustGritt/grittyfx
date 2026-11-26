import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 1.2;
// Speed lines: height over the feet, cycles a loop, phase, in front of the body. They leave the body's back edge and
// stream away behind it, stretching, slowing and cooling. Each in its own lane.
const LINES = [
  [-29, 2, 0.1, false], [-25, 3, 0.55, false], [-21, 2, 0.8, true], [-17, 3, 0.3, false], [-13, 2, 0.45, false], [-9, 3, 0.05, true],
];
const RUN = 24; // how far back a line streams
// Wind gusts at the feet: when each sets off in the loop, its height and size. Each sweeps back along the floor and
// curls up at its end.
const GUSTS = [[0, -1, 1], [0.5, -1, 0.75]];
const GLINTS = 5;

export const meta = {
  name: 'Haste',
  desc: 'A speed buff on its caster: speed lines streaming back off the body, a wind gust curling behind the feet, a light shimmer',
  tags: ['buff', 'status', 'haste', 'speed', 'quick', 'swift', 'wind', 'dash'],
  size: [60, 46],
  origin: [38, 42],
  duration: DURATION,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  // a rising whoosh with each gust: a low one, a higher one on its tail
  sound: GUSTS.flatMap(([u]) => [
    { t: u * DURATION, kind: 'whoosh', gain: 0.22, pitch: 0.7 },
    { t: (u * DURATION + 0.12) % DURATION, kind: 'whoosh', gain: 0.16, pitch: 1.2 },
  ]),
};

const ease = u => 1 - (1 - u) ** 2;

function line(p, C, [y0, k, off], j, ph, s) {
  const u = ((ph * k + off) % 1) / 0.75; // each line streams for three quarters of its cycle
  if (u >= 1) return;
  const x0 = -3 - 2 * rand(j, s), y = y0 + Math.round(rand(j, Math.floor(ph * k + off) % k, s) * 2 - 1);
  const front = x0 - RUN * ease(u), len = 3 + 9 * Math.sin(Math.PI * Math.min(1, u * 1.3)), back = front - len;
  const cool = Math.floor(u * 3); // hot as it leaves, cooling as it goes
  p.line(front, y, back, y, v => C[(v < 0.25 ? 7 : v < 0.6 ? 6 : 5) - cool], v => Math.min(1, 3 * (1 - v)) * (u < 0.8 ? 1 : (1 - u) / 0.2));
  p.glowLine(back, y, front, y, 2, C[5], (v, d) => 0.25 * (1 - u) * v * (1 - d) ** 2);
}

// A gust: a wisp that sweeps back along the floor from the feet and curls up over itself at its end, the classic
// wind stroke, drawn from its tail to its head as it unrolls.
function gust(p, C, [t0, y0, sc], ph) {
  const u = ((ph - t0 + 1) % 1) * 2; // a gust takes half the loop
  if (u >= 1) return;
  const run = 20 * sc, R = 6 * sc, x1 = 2 - run;
  const at = q => { // the path, 0 to 1: a straight run back, rising a little, then a curl
    if (q < 0.5) return [2 - (q / 0.5) * run, y0 - q * 2];
    const v = (q - 0.5) / 0.5, a = Math.PI / 2 + v * 1.7 * Math.PI, r = R * (1 - 0.5 * v);
    return [x1 + Math.cos(a) * r, y0 - 1 - R + Math.sin(a) * r + (R - r)];
  };
  const head = ease(Math.min(1, u * 1.25)), tail = Math.max(0, head - 0.55) + 0.55 * Math.max(0, u - 0.6) / 0.4; // caught up by the end
  if (tail >= head) return;
  for (let q = tail; q <= head; q += 0.005) {
    const [x, y] = at(q), v = (q - tail) / (head - tail);
    p.px(x, y, C[v > 0.8 ? 7 : v > 0.4 ? 6 : 5]);
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION, breathe = 0.5 + 0.5 * Math.sin(TAU * ph * 2);
  p.glow(0, -15, 20, C[5], 0.16 + 0.08 * breathe); // a light shimmer round the body
  p.glowLine(-14, 0, 6, 0, 4, C[5], (v, d) => 0.2 * v * (1 - d) ** 2); // the floor, lit behind the feet
  LINES.forEach((l, j) => !l[3] && line(p, C, l, j, ph, s));
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  LINES.forEach((l, j) => l[3] && line(p, C, l, j, ph, s));
  for (const g of GUSTS) gust(p, C, g, ph);
  for (let j = 0; j < GLINTS; j++) { // glints flashing round the body's edge
    const u = (ph * 2 + j / GLINTS) % 1, n = Math.floor(ph * 2 + j / GLINTS) % 2;
    if (u > 0.25) continue;
    const a = TAU * rand(j, n, s), x = Math.round(Math.cos(a) * 9), y = Math.round(-15 + Math.sin(a) * 15);
    p.px(x, y, C[7]);
    if (u < 0.12) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[5]);
    p.light(x, y, C[6], 0.5);
  }
}
