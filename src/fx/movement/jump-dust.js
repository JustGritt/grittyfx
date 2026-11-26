import { rand } from '../../core/index.js';

export const meta = {
  name: 'Jump dust',
  desc: 'Dust pushed out from under the feet as a character takes off: a flat flash where they push off, two tight puffs shooting out low to each side, launch streaks rising, a few hopping specks',
  tags: ['dust', 'jump', 'takeoff', 'ground', 'movement'],
  size: [44, 24],
  origin: [22, 19],
  duration: 0.4,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [48, 48] },
  ramps: { palette: 8 },
  options: { palette: 'dust', seed: 1 },
  stage: { at: 'ground', cast: 'kunoichi' }, // she takes off from it
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.45, pitch: 1.5 }, // the push-off
    { t: 0, kind: 'thump', gain: 0.25, pitch: 1.6 },
    { t: 0.12, kind: 'crack', gain: 0.08, pitch: 2.8 }, // grit landing
  ],
};

const TAU = Math.PI * 2;
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

// Each side's puffs as [how far out 0 to 1, lift, radius, tone, back]: a low one leading, one riding up behind it, a
// darker one left behind the feet.
const PUFFS = [[1, 0, 2.8, 4], [0.55, 2.5, 2.4, 4], [0.2, 1.5, 2.2, 3, 1]];

// The puffs shoot out low and fast, then slow, swell, lift a little and thin. From above: a ring of them.
function puffs(p, t, o, back) {
  const C = o.palette, s = o.seed, hot = t < 0.05 ? 1 : 0, top = o.view === 'top';
  const dirs = top ? Array.from({ length: 6 }, (_, i) => ((i + 0.4 * rand(i, s, 9)) * TAU) / 6) : [Math.PI, 0];
  dirs.forEach((a, side) => {
    PUFFS.forEach(([lead, lift, size, tone, b], j) => {
      if (top ? back || j === 2 : !!b !== back) return; // from above, the puff behind the feet is under them
      const k = side * 10 + j, life = 0.26 + 0.08 * lead + 0.05 * rand(k, s), u = t / life;
      if (u >= 1) return;
      const e = smooth(0.3, 1, u), d = (3 + 11 * lead + 1.5 * rand(k, s, 1)) * out(t, 0.04 + 0.03 * lead) + 6 * t;
      const r = (size + 0.6 * rand(k, s, 2)) * (0.45 + 0.55 * out(t, 0.05)) * (1 + 0.3 * e);
      const x = Math.cos(a) * d, y = top ? Math.sin(a) * d : -0.85 * r - lift * out(t, 0.08) - 4 * t;
      puff(p, C, x, y, r, 0.9 * (1 - e), tone + hot);
    });
  });
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
  puffs(p, t, o, true);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, top = o.view === 'top';
  if (top) {
    if (t < 0.12) p.glow(0, 0, 9, C[7], 0.35 * (1 - t / 0.12) ** 2);
    if (t < 1 / 30) p.circle(0.5, 0.5, 4, C[7]); // the push-off
    puffs(p, t, o, false);
    for (let i = 0; i < 5; i++) { // grit skidding out over the floor
      const a = ((i + rand(i, s, 3)) * TAU) / 5, life = 0.25 + 0.06 * rand(i, s, 5);
      if (t >= life) continue;
      const v = 60 + 30 * rand(i, s, 4), d = 4 + (v / 8) * out(t, 0.12), vt = v * Math.exp(-t / 0.12);
      const x = Math.cos(a) * d, y = Math.sin(a) * d, l = Math.min(3, vt * 0.03);
      p.line(x - Math.cos(a) * l, y - Math.sin(a) * l, x, y, C[i % 2 ? 5 : 6], Math.min(1, (life - t) / 0.08));
    }
    return;
  }
  if (t < 0.12) p.glowLine(-8, -0.5, 8, -0.5, 4, C[7], 0.35 * (1 - t / 0.12) ** 2);
  if (t < 1 / 30) p.ellipse(0.5, -0.5, 6, 1, C[7]); // the feet push off
  puffs(p, t, o, false);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const k = side * 10 + i, life = 0.3 + 0.06 * rand(k, s, 5);
      if (t >= life) continue;
      const [x, y, vx, vy] = hop(t, 25 + 20 * rand(k, s, 3), -70 - 40 * rand(k, s, 4));
      const gx = side * (3 + x), gy = y - 1, a = Math.min(1, (life - t) / 0.08);
      p.line(gx - side * vx * 0.02, gy - vy * 0.02, gx, gy, C[i ? 5 : 6], a);
    }
  }
}
