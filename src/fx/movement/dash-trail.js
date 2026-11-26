import { rand } from '../../core/index.js';

export const meta = {
  name: 'Dash trail',
  desc: 'A burst of speed: streaks shooting out behind the body and peeling away, dust kicked back from the feet, a flash on the first frame',
  tags: ['dash', 'speed', 'trail', 'dust', 'movement'],
  size: [56, 34],
  origin: [44, 18],
  duration: 0.34,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'dust', seed: 1 },
  stage: { at: 'ground', ground: 14, cast: 'knight', looks: { raise: ['dash', 'crouch'] } }, // on the knight's body, the trail behind him
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.7, pitch: 1.3 }, // the burst
    { t: 0.02, kind: 'crack', gain: 0.1, pitch: 2.4 }, // grit kicked back
  ],
};

const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const FEET = 14; // the anchor is mid-body; the feet are this far below it
// Each streak's height on the body and how long it runs: the longest at the chest, short ones at the head and feet.
const STREAKS = [[-11, 0.4], [-7, 0.8], [-3.5, 0.6], [0, 1], [4, 0.7], [7.5, 0.9], [11, 0.45]];

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, C, x, y, r, a, tone) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return C[Math.min(7, tone + 2)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.65, d));
}

// The kick: puffs thrown back from the feet, rolling, swelling and thinning. From above they are under the body.
function kick(p, t, o) {
  const C = o.palette, s = o.seed, top = o.view === 'top', feet = top ? 0 : FEET;
  // [how far back, size, lift]: a big one at the heels, one riding up behind it, a small one thrown furthest
  [[4, 3.4, 0], [10, 2.5, 3], [16, 2, 1]].forEach(([far, size, up], i) => {
    const life = 0.24 + 0.08 * rand(i, s, 1), u = t / life;
    if (u >= 1) return;
    const e = smooth(0.3, 1, u), d = (far + 2 * rand(i, s, 2)) * out(t, 0.05 + 0.02 * i) + 6 * t;
    const r = size * (0.5 + 0.5 * out(t, 0.05)) * (1 + 0.3 * e), lift = top ? (i - 1) * 2.5 : r * 0.85 + up * out(t, 0.1);
    puff(p, C, -d, feet - lift, r, 0.85 * (1 - e), t < 0.05 ? 6 : 5);
  });
}

export function drawBack(p, t, o) {
  kick(p, t, o);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;
  if (t < 0.12) p.glowLine(-14, 0, 0, 0, 10, C[6], 0.4 * (1 - t / 0.12) ** 2);
  // streaks: each shoots out behind the body (already part way on the first frame), then its front peels away toward
  // its tail as it cools and goes; some are broken
  STREAKS.forEach(([lane, w], i) => {
    const life = 0.2 + 0.1 * rand(i, s, 4), u = t / life;
    if (u >= 1) return;
    const y = Math.round(lane + rand(i, s, 7) - 0.5), len = 8 + 20 * w * (0.7 + 0.3 * rand(i, s, 5)), drift = 14 * t;
    const back = -3 - 6 * rand(i, s, 6) - drift, tail = back - len * out(t + 0.01 + 0.025 * rand(i, s, 3), 0.035), head = back - len * smooth(0.25, 1, u);
    if (head - tail < 1) return;
    const hot = 1 - u, gap = rand(i, s, 8) < 0.4 ? 0.45 + 0.2 * rand(i, s, 9) : 2;
    p.line(tail, y, head, y, v => (Math.abs(v - gap) < 0.08 ? 0 : C[Math.round(3 + 4 * hot * v)]));
  });
}
