import { rand } from '../../core/index.js';

export const meta = {
  name: 'Smoke puff',
  desc: 'A spawn or vanish poof: a pop of light, a ring of smoke puffs that bursts out, rolls up and thins away',
  tags: ['smoke', 'poof', 'spawn', 'vanish', 'teleport'],
  size: [60, 56],
  origin: [30, 48],
  duration: 0.6,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'smoke', seed: 1 },
  stage: { at: 'caster', ground: 0, hide: [2 / 30] }, // at the feet of whoever vanishes in it
  sound: [
    { t: 0, kind: 'crack', gain: 0.5, pitch: 0.6 }, // the pop
    { t: 0, kind: 'thump', gain: 0.3, pitch: 1.4 },
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 0.9 }, // the puffs rolling out
  ],
};

const TAU = Math.PI * 2;
const CY = -14; // the cloud's center, above the ground at 0
const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// The puffs, from t alone: each bursts out lit by the pop, cools to smoke, rises, then swells and thins away.
function puffs(t, s) {
  const list = [], hot = t < 0.06 ? 2 : t < 0.13 ? 1 : 0;
  const add = (x, y, rmax, life, tone, back, delay = 0) => {
    const u = (t - delay) / life;
    if (u < 0 || u >= 1) return;
    const e = smooth(0.35, 1, u), r = rmax * (0.35 + 0.65 * out(t, 0.05)) * (1 + 0.3 * e);
    list.push({ x, y: Math.min(y - 26 * t * t, -r), r, tone: tone + hot, back, a: 0.92 * (1 - e) });
  };
  for (let i = 0; i < 9; i++) {
    const a = ((i + 0.6 * (rand(i, s) - 0.5)) * TAU) / 9, d = (12 + 4 * rand(i, s, 1)) * out(t, 0.06 + 0.03 * rand(i, s, 2)) + 6 * t;
    const up = -Math.sin(a); // the top of the cloud is lit and lingers, the bottom is in shadow and goes first
    add(Math.cos(a) * d, CY + Math.sin(a) * d * 0.75, 6 + 2.5 * rand(i, s, 3), 0.42 + 0.1 * up + 0.08 * rand(i, s, 4), up > 0.3 ? 4 : 3, true);
  }
  for (let i = 9; i < 14; i++) {
    const a = rand(i, s) * TAU, d = (3 + 6 * rand(i, s, 1)) * out(t, 0.07);
    add(Math.cos(a) * d, CY + 2 + Math.sin(a) * d * 0.75, 5 + 2 * rand(i, s, 3), 0.46 + 0.1 * rand(i, s, 4), 4, false);
  }
  for (const side of [-1, 1]) add(side * (6 + 14 * out(t - 0.05, 0.1)), 0, 4.5 + rand(side + 2, s), 0.45, 3, false, 0.05);
  return list.sort((p, q) => p.y - q.y); // lower puffs roll over the ones above
}

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, C, { x, y, r, a, tone }) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return C[Math.min(7, tone + 2)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.65, d));
}

export function drawBack(p, t, o) {
  for (const q of puffs(t, o.seed)) if (q.back) puff(p, o.palette, q);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;
  if (t < 0.3) {
    const k = (1 - t / 0.3) ** 2;
    p.glow(0, CY, 18, C[7], 0.75 * k);
    p.glowLine(-16, -0.5, 16, -0.5, 5, C[7], 0.3 * k); // the pop lights the floor
  }
  if (t < 1 / 30) p.circle(0.5, CY + 0.5, 7, C[7]);
  for (const q of puffs(t, s)) if (!q.back) puff(p, C, q);
  if (t < 0.2) {
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5 * rand(i, s, 7)) * TAU) / 8, head = 7 + 20 * out(t, 0.06), len = 10 * (1 - t / 0.2);
      const c = Math.cos(a), sn = Math.sin(a) * 0.75;
      p.line(c * (head - len), CY + sn * (head - len), c * head, CY + sn * head, u => C[u > 0.5 ? 7 : 6]);
    }
  }
}
