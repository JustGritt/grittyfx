import { rand } from '../../core/index.js';

export const meta = {
  name: 'Substitution',
  desc: 'A body swapped for a log: a pop of smoke, and a log left standing where they stood tips over, lands with a knock and a puff of dust, lies there, then goes in a second poof',
  tags: ['vanish', 'substitution', 'decoy', 'log', 'smoke', 'ninja', 'shadow', 'poof'],
  size: [72, 56],
  origin: [28, 48],
  duration: 1.8,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, wood: 6, dust: 6 },
  options: { palette: 'smoke', wood: ['#2a160c', '#4a2a16', '#6e4024', '#94603a', '#b8854f', '#d8ae74'], dust: 'dust', seed: 1 },
  act: { windup: 0.3 },
  stage: { at: 'caster' }, // where she stood
  sound: [
    { t: 0, kind: 'crack', gain: 0.5, pitch: 0.6 }, // the pop
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 0.9 },
    { t: 0.65, kind: 'thump', gain: 0.6, pitch: 0.9 }, // the log lands
    { t: 0.65, kind: 'crack', gain: 0.3, pitch: 1.4 },
    { t: 0.77, kind: 'crack', gain: 0.15, pitch: 1.8 }, // and knocks again on the rebound
    { t: 1.15, kind: 'whoosh', gain: 0.35, pitch: 1.3 }, // the log goes
    { t: 1.15, kind: 'crack', gain: 0.2, pitch: 0.9 },
  ],
};

const TAU = Math.PI * 2;
const CY = -14; // the puff's center, a body's middle
const T0 = 0.35, LAND = 0.65; // the log starts to tip, and lands
const GONE = 1.15; // it goes in a second poof
const L = 24, Wd = 8; // the log's length and thickness
const PIVOT = 4; // it tips over its front foot
const out = (t, k) => 1 - Math.exp(-Math.max(0, t) / k);
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// The log's lean at t, radians clockwise from upright: it tips slowly then falls faster, bounces once, lies flat.
function lean(t) {
  if (t < T0) return 0;
  if (t < LAND) return (Math.PI / 2) * ((t - T0) / (LAND - T0)) ** 2;
  const u = t - LAND;
  return Math.PI / 2 - (u < 0.12 ? 0.14 * Math.sin((Math.PI * u) / 0.12) : 0);
}

// The puffs from t alone: they burst out of (cx, cy), k times a body's size, roll up and thin.
function puffs(t, s, cx = 0, cy = CY, k = 1) {
  const list = [];
  if (t < 0) return list;
  for (let i = 0; i < 14; i++) { // 11 round the rim, 3 filling the middle
    const a = ((i + 0.6 * (rand(i, s) - 0.5)) * TAU) / 11, life = 0.45 + 0.15 * rand(i, s, 4), u = t / life;
    if (u >= 1) continue;
    const d = k * (i < 11 ? 8 + 4 * rand(i, s, 1) : 3 * rand(i, s, 1)) * out(t, 0.06), e = smooth(0.35, 1, u), r = k * (5.5 + 2.5 * rand(i, s, 3)) * (0.4 + 0.6 * out(t, 0.05)) * (1 + 0.3 * e);
    list.push({ x: cx + Math.cos(a) * d * 1.3, y: Math.min(cy + Math.sin(a) * d * 0.9 - 20 * t * t, -r * 0.6), r, a: 0.95 * (1 - e), tone: -Math.sin(a) > 0.3 ? 4 : 3, back: i % 3 === 0 });
  }
  return list.sort((p, q) => p.y - q.y);
}

function puff(p, S, { x, y, r, a, tone }) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.55) return S[tone + 2];
    return S[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.88 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.6, d));
}

// The log, turned `th` over its front foot: bark lit on its left (its top once it lies), grooves, a knot, cut ends.
function log(p, W, th, s) {
  const c = Math.cos(th), n = Math.sin(th);
  p.shade(-6, -L - 2, L + 14, L + 4, (x, y) => {
    const px = x + 0.5 - PIVOT, py = y + 0.5, dx = px * c + py * n, dy = -px * n + py * c; // into the log's own frame
    const u = (dx + Wd) / Wd, v = -dy / L, col = Math.floor(u * 4), cap = Math.hypot((u - 0.5) * 2, (dy + L) / 2.5);
    if (dy < -L) return cap > 1 ? 0 : W[cap > 0.75 ? 3 : cap > 0.3 ? 5 : 4]; // the end grain, seen a little from above
    if (dx < -Wd && dx > -Wd - 2.5 && Math.abs(dy + 0.42 * L) < 1.6) return W[dx < -Wd - 1.5 ? 5 : 3]; // a branch stub, cut; up once it lies
    if (dx < -Wd || dx > 0 || dy > 0) return 0;
    if (dy > -1 && (u < 0.13 || u > 0.87)) return 0; // the foot's corners worn round
    if (v > 0.95) return W[u < 0.25 || u > 0.8 ? 3 : 5]; // the cut end: pale wood, a darker rim
    if (v < 0.04) return W[1];
    if (u < 0.13 || u > 0.87) return W[1]; // the bark's silhouette
    if (Math.hypot((u - 0.55) * Wd, (v - 0.62) * L) < 1.2) return W[0]; // a knot
    if (Math.hypot((u - 0.55) * Wd, (v - 0.62) * L) < 2) return W[4];
    if (col % 2 && rand(Math.floor(v * L / 3), col, s) > 0.35) return W[2]; // grooves in the bark
    return W[u < 0.4 ? 4 : u > 0.7 ? 2 : 3];
  });
}

// The pop at the start, then the second, smaller poof over the lying log.
const both = (t, s) => [...puffs(t, s), ...puffs(t - GONE, s + 7, PIVOT + L / 2, -5, 0.65)];

export function drawBack(p, t, o) {
  for (const q of both(t, o.seed)) if (q.back) puff(p, o.palette, q);
}

export function draw(p, t, o) {
  const S = o.palette, D = o.dust, s = o.seed;

  if (t < 0.3) { // the pop
    const k = (1 - t / 0.3) ** 2;
    p.glow(0, CY, 18, S[7], 0.6 * k);
    p.glowLine(-14, -0.5, 14, -0.5, 5, S[7], 0.25 * k);
  }

  if (t < GONE + 0.07) log(p, o.wood, lean(t), s); // gone once the second poof covers it

  if (t >= LAND && t < LAND + 0.4) { // dust knocked up along the log where it lands
    const u = t - LAND, e = u / 0.4;
    for (let i = 0; i < 7; i++) {
      const x0 = PIVOT + 2 + (i / 6) * (L - 4), r = (2 + 1.5 * rand(i, s, 5)) * (0.6 + 0.8 * out(u, 0.1));
      const x = x0 + (rand(i, s, 6) - 0.5) * 3, y = -1 - 4 * out(u, 0.15) - 2 * rand(i, s, 7);
      p.disc(x, y, r, (dx, dy) => D[dx + dy < -1 ? 5 : 4], (dx, dy, d) => 0.75 * (1 - e) ** 1.5 * smooth(1, 0.5, d));
    }
  }

  if (t < 1 / 30) p.circle(0.5, CY + 0.5, 6, S[7]);
  for (const q of both(t, s)) if (!q.back) puff(p, S, q);
  if (t >= GONE && t < GONE + 1 / 30) p.circle(PIVOT + L / 2 + 0.5, -4.5, 4, S[7]);
}
