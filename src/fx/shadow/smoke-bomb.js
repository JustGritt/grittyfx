import { rand } from '../../core/index.js';

export const meta = {
  name: 'Smoke bomb',
  desc: 'A ninja vanish: a pellet dashed down at the feet, a pop of light, smoke rolling out along the floor and billowing into a column that hides whoever stood there, then thins away',
  tags: ['vanish', 'smoke', 'bomb', 'ninja', 'escape', 'poof', 'shadow'],
  size: [80, 80],
  origin: [40, 72],
  duration: 1.3,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 8 },
  options: { palette: 'fire', smoke: 'smoke', seed: 1 },
  act: { windup: 0.3, hits: [{ t: 3 / 30, freeze: 0.02, shake: 1 }] },
  stage: { at: 'caster' }, // at her feet; she throws it down from her seal
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 2.4 }, // the throw
    { t: 3 / 30, kind: 'crack', gain: 0.6, pitch: 0.7 }, // the pop
    { t: 3 / 30, kind: 'thump', gain: 0.35, pitch: 1.3 },
    { t: 0.05, kind: 'whoosh', gain: 0.6, pitch: 0.45 }, // the smoke billowing up
  ],
};

const TAU = Math.PI * 2;
const POP = 3 / 30; // the pellet hits the floor
const out = (t, k) => 1 - Math.exp(-Math.max(0, t) / k); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// The puffs at time u after the pop: each shoots from the pop to its place, swells, rises and thins.
function puffs(u, s) {
  const list = [];
  const add = (x1, y1, rmax, life, tone, back, k) => {
    const v = u / life;
    if (v >= 1) return;
    const m = out(u, k), e = smooth(0.35, 1, v), r = rmax * (0.3 + 0.7 * out(u, k * 1.5)) * (1 + 0.3 * e);
    list.push({ x: x1 * m, y: Math.min(-3 + (y1 + 3) * m - 16 * u * u, -r * 0.7), r, tone, back, a: 0.95 * (1 - e) });
  };
  for (let i = 0; i < 10; i++) { // a band rolling out along the floor both ways, thinner and sooner gone further out
    const side = i % 2 ? 1 : -1, j = i >> 1, w = rand(i, s);
    add(side * (9 + 5 * j + 2 * w), -2 - j * 0.6 - 2 * w, 6.5 - 0.9 * j + rand(i, s, 2), 0.75 - 0.08 * j + 0.1 * rand(i, s, 3), 3, j % 2 === 1, 0.08 + 0.02 * j);
  }
  for (let i = 0; i < 13; i++) { // the cloud: an egg as wide as a body, front puffs dense over it, back ones wider
    const h = (i + rand(i, s, 9)) / 13, back = i % 3 === 1, half = 13 * Math.sin(Math.PI * (0.25 + 0.65 * h));
    const x = (rand(i, s, 4) * 2 - 1) * half * (back ? 1 : 0.7), y = -6 - 30 * h;
    add(x, y, 8 + 2.5 * rand(i, s, 6) - 2 * h, 0.8 + 0.3 * h + 0.1 * rand(i, s, 7), h > 0.55 ? 4 : 3, back, 0.06 + 0.05 * h);
  }
  return list.sort((p, q) => p.y - q.y); // lower puffs roll over the ones above
}

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, S, { x, y, r, a, tone }) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.5) return S[tone + 2];
    return S[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.88 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.6, d));
}

export function drawBack(p, t, o) {
  if (t >= POP) for (const q of puffs(t - POP, o.seed)) if (q.back) puff(p, o.smoke, q);
}

export function draw(p, t, o) {
  const C = o.palette, S = o.smoke, s = o.seed;

  if (t < POP) { // the pellet, dashed down from the hands, its fuse spitting
    const x = 6 - 40 * t, y = -22 + 150 * t + 750 * t * t;
    p.circle(x, y, 1.5, S[1]);
    p.px(x, y - 1, S[3]);
    p.px(x + 1, y - 2, C[7]);
    p.glow(x + 1, y - 2, 4, C[6], 0.5);
    return;
  }

  const u = t - POP;
  if (u < 0.35) { // the pop lights the air and the floor
    const k = (1 - u / 0.35) ** 2;
    p.glow(0, -10, 17, C[6], 0.8 * k);
    p.glowLine(-20, -0.5, 20, -0.5, 5, C[6], 0.35 * k);
  }
  if (u < 1 / 30) p.circle(0.5, -3.5, 5, C[7]);

  for (const q of puffs(u, s)) if (!q.back) puff(p, S, q);

  if (u < 0.2) { // sparks thrown out of the pop
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i + 0.5 * rand(i, s, 8)) * (Math.PI / 7), head = 6 + 22 * out(u, 0.07), len = 7 * (1 - u / 0.2);
      const c = Math.cos(a), n = Math.sin(a);
      p.line(c * (head - len), -2 + n * (head - len), c * head, -2 + n * head, w => C[w > 0.5 ? 7 : 5]);
    }
  }
}
