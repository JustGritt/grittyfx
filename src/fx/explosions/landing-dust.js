import { rand } from '../../core/index.js';

export const meta = {
  name: 'Landing dust',
  desc: 'Dust kicked out to both sides when a character lands: a flash on the ground, low plumes that curl up and settle, hopping grit',
  tags: ['dust', 'landing', 'jump', 'ground', 'movement'],
  size: [72, 28],
  origin: [36, 22],
  duration: 0.5,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'dust', seed: 1 },
};

const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const G = 900;

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, C, x, y, r, a, tone) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return C[Math.min(7, tone + 2)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.65, d));
}

// Each side's plume as [how far out 0 to 1, lift, radius, tone, back]: low puffs rolling out along the ground, the
// leading one biggest, one riding on top of them like a breaking wave, two darker ones thrown up behind.
const PLUME = [[0.35, 3, 3, 3, 1], [0.7, 5, 3.4, 3, 1], [0.1, 0, 2.6, 4], [0.45, 0, 3.6, 4], [0.85, 0.5, 4.2, 4], [0.65, 4, 3.4, 4]];

// The plumes burst out, the lifted puffs sink back as everything slows, swells and settles.
function plume(p, t, o, back) {
  const C = o.palette, s = o.seed, hot = t < 0.05 ? 1 : 0, settle = 1 - 0.7 * smooth(0.12, 0.45, t);
  for (const side of [-1, 1]) {
    PLUME.forEach(([lead, lift, size, tone, b], j) => {
      const k = side * 10 + j, life = 0.3 + 0.12 * lead + 0.08 * rand(k, s), u = t / life;
      if (!!b !== back || u >= 1) return;
      const e = smooth(0.3, 1, u), d = (3 + 21 * lead + 2 * rand(k, s, 1)) * out(t, 0.05 + 0.04 * lead) + 8 * t;
      const r = (size + 0.8 * rand(k, s, 2)) * (0.4 + 0.6 * out(t, 0.06)) * (1 + 0.25 * e);
      puff(p, C, side * d, -0.85 * r - (lift + 3 * lead) * out(t, 0.1) * settle, r, 0.9 * (1 - e), tone + hot);
    });
  }
}

// Grit: hops out, bounces once and lies still. Returns its position and velocity at time t.
function hop(t, vx, vy) {
  let x = 0;
  for (let k = 0; k < 2; k++, vx *= 0.6, vy *= 0.35) {
    const T = (-2 * vy) / G;
    if (t < T) return [x + vx * t, vy * t + (G * t * t) / 2, vx, vy + G * t];
    x += vx * T;
    t -= T;
  }
  return [x, 0, 0, 0];
}

export function drawBack(p, t, o) {
  plume(p, t, o, true);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;
  if (t < 0.15) p.glowLine(-12, -0.5, 12, -0.5, 5, C[7], 0.4 * (1 - t / 0.15) ** 2);
  plume(p, t, o, false);
  if (t < 1 / 30) p.ellipse(0.5, -1, 9, 1.5, C[7]); // the feet hit the ground
  for (const side of [-1, 1]) {
    if (t < 0.16) {
      for (const [y, tilt] of [[-1.5, 0], [-4, -0.25]]) {
        const head = 6 + 24 * out(t, 0.06), tail = Math.max(4, head - 9 * (1 - t / 0.16));
        p.line(side * tail, y + tilt * tail, side * head, y + tilt * head, v => C[v > 0.5 ? 7 : 5]);
      }
    }
    for (let i = 0; i < 3; i++) {
      const k = side * 10 + i, life = 0.4 + 0.06 * rand(k, s, 5);
      if (t >= life) continue;
      const [x, y, vx, vy] = hop(t, 30 + 25 * rand(k, s, 3), -100 - 40 * rand(k, s, 4));
      const gx = side * (2 + x), gy = y - 1, c = C[i ? 5 : 6], a = Math.min(1, (life - t) / 0.1);
      p.line(gx - side * vx * 0.02, gy - vy * 0.02, gx, gy, c, a);
    }
  }
}
