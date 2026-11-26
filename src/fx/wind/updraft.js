import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 1.6;
const RX = 14, SL = 0.3; // the ring's x radius at the feet; the slant flattens every circle round the body to ry = r * SL
const STREAKS = 7, LEAVES = 3;
const HELIX = 0.85; // the share of a streak's path that winds up round the body; the rest is its curl

export const meta = {
  name: 'Updraft',
  desc: 'A wind buff on its caster: a breathing ring of air at the feet, streaks spiralling up round the body and curling off, a few leaves riding up',
  tags: ['wind', 'air', 'updraft', 'buff', 'aura', 'levitate'],
  size: [48, 64],
  origin: [24, 54],
  duration: DURATION,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8, leaf: 5 },
  options: { palette: 'wind', leaf: 'leaf', seed: 1 },
  // soft low whooshes, spaced through the loop
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 0.55 },
    { t: 0.53, kind: 'whoosh', gain: 0.24, pitch: 0.68 },
    { t: 1.07, kind: 'whoosh', gain: 0.27, pitch: 0.6 },
  ],
};

// Streak j's path on its cycle c, as points [x, y, depth, q]: a helix from the ring up round the body, ending in front
// at the right or left side, then a curl rolling up and outward. depth > 0 is in front of the body; q runs 0 to 1.
function path(j, c, s) {
  const side = (j + c) % 2, end = (side ? 0.9 : 0.22) * Math.PI + (rand(j, c, s) - 0.5) * 0.35;
  const turns = 1.7 + 0.6 * rand(j, c, s + 1), H = 30 + 8 * rand(j, c, s + 2), a0 = end - TAU * turns;
  const R = RX * (0.85 + 0.15 * rand(j, c, s + 3)), pts = [], N = 120, M = 18;
  for (let i = 0; i <= N; i++) {
    const q = i / N, a = a0 + TAU * turns * q, r = R * (1 + 0.1 * q); // flat round the feet, steeper up high
    pts.push([Math.cos(a) * r, -H * q ** 1.2 + Math.sin(a) * r * SL, Math.sin(a), q * HELIX]);
  }
  const [ex, ey, ed] = pts[N], [bx, by] = pts[N - 1], dir = side ? -1 : 1, dphi = (1.6 * Math.PI) / M;
  let phi = Math.atan2(ey - by, ex - bx), x = ex, y = ey;
  for (let i = 1; i <= M; i++) {
    const r = 5.5 * (1 - 0.6 * (i / M));
    phi += dir * dphi;
    x += Math.cos(phi) * r * dphi;
    y += Math.sin(phi) * r * dphi;
    pts.push([x, y, ed, HELIX + (1 - HELIX) * (i / M)]);
  }
  return pts;
}

function at(pts, q) {
  const n = pts.length - 1;
  let i = 1;
  while (i < n && pts[i][3] < q) i++;
  const [x0, y0, d0, q0] = pts[i - 1], [x1, y1, d1, q1] = pts[i], v = (q - q0) / (q1 - q0 || 1);
  return [x0 + (x1 - x0) * v, y0 + (y1 - y0) * v, d0 + (d1 - d0) * v];
}

// A streak: its head races up the path, speeding up, its tail following; the head stops at the end of the curl, which
// lingers whole while it dissolves and the tail creeps into it.
const RUN = 0.8, LAG = 0.07, ease = x => Math.max(0, Math.min(1, x)) ** 1.35;
function streak(p, C, j, ph, s, front) {
  const k = 2, v = ph * k + j / STREAKS + 0.15 * rand(j, s, 3), u = v % 1, c = Math.floor(v) % k;
  const t0 = ease((RUN - LAG) / RUN), late = Math.max(0, (u - RUN) / (1 - RUN));
  const head = ease(u / RUN), tail = u < RUN ? ease((u - LAG) / RUN) : t0 + (1 - t0) * 0.6 * late;
  if (head - tail < 0.004) return;
  const pts = path(j, c, s);
  for (let q = tail; q <= head; q += 0.003) {
    const [x, y, d] = at(pts, q);
    if (d > 0 !== front) continue;
    const w = (q - tail) / (head - tail), high = q > 0.55 && q < HELIX ? 1 : 0; // w: 0 at the tail, 1 at the head
    p.dot(x, y, C[(w > 0.88 ? 7 : w > 0.5 ? 6 : w > 0.2 ? 5 : 4) - (front ? 0 : 2) - high], Math.min(1, w / 0.2) * (1 - late));
    if (front && q < 0.4 && w > 0.4 && w < 0.85) p.px(x, y + 1, C[4]); // low down, a ribbon two pixels thick
  }
  const [hx, hy, hd] = at(pts, head);
  if (hd > 0 === front) p.light(hx, hy, C[6], 0.25);
}

// The ring at the feet: a faint ellipse breathing, three strokes chasing round it.
function ring(p, C, ph, front) {
  const sc = 1 + 0.1 * Math.sin(TAU * ph * 2), rx = RX * sc, ry = RX * SL * sc, N = 48;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 !== front) continue;
    if (i % 3) p.line(Math.cos(a0) * rx, Math.sin(a0) * ry, Math.cos(a1) * rx, Math.sin(a1) * ry, C[front ? 3 : 2], 0.5);
  }
  for (let i = 0; i < 3; i++) {
    const head = TAU * (ph * 2 + i / 3), span = 2;
    if (!front) p.glow(Math.cos(head) * rx, Math.sin(head) * ry, 4, C[5], 0.25); // a faint light rides each stroke
    for (let a = head - span; a <= head; a += 0.04) {
      if (Math.sin(a) > 0 !== front) continue;
      const w = (a - head + span) / span;
      p.dot(Math.cos(a) * rx, Math.sin(a) * ry, C[(front ? 5 : 3) + (w > 0.75 ? 2 : w > 0.4 ? 1 : 0)], Math.min(1, w * 3));
    }
  }
}

// A leaf lifted off the floor, riding the spiral up, tumbling, and flung off small at the top.
function leaf(p, L, j, ph, s, front) {
  const u = (ph + j / LEAVES + 0.1 * rand(j, s, 5)) % 1;
  const lift = Math.max(0, (u - 0.08) / 0.92), a = TAU * (rand(j, s, 6) + 1.4 * lift ** 1.3);
  const h = lift ** 1.5, r = RX * (1.05 + 0.35 * h), x = Math.cos(a) * r, y = -42 * h + Math.sin(a) * r * SL;
  if (Math.sin(a) > 0 !== front || u > 0.96) return;
  // lying flat on the floor, then tumbling end over end and flipping as fast as it rises, shrinking as it is flung off
  const psi = TAU * (1.5 + 0.5 * rand(j, s, 7)) * h, broad = Math.abs(Math.sin(TAU * 1.5 * h)) > 0.4;
  const len = u > 0.9 ? 1 : u > 0.82 ? 2 : u > 0.7 ? 3 : 4, ux = Math.cos(psi) / 2, uy = Math.sin(psi) / 2;
  p.line(x - ux * len, y - uy * len, x + ux * len, y + uy * len, L[front ? 3 : 2]);
  if (broad && len > 2) p.line(x - ux * (len - 2) - 2 * uy, y - uy * (len - 2) + 2 * ux, x + ux * (len - 2) - 2 * uy, y + uy * (len - 2) + 2 * ux, L[front ? 2 : 1]);
  if (front && len > 1) p.px(x + ux * len, y + uy * len, L[4]);
}

function layer(p, t, o, front) {
  const C = o.palette, L = o.leaf, s = o.seed, ph = t / DURATION;
  ring(p, C, ph, front);
  for (let j = 0; j < STREAKS; j++) streak(p, C, j, ph, s, front);
  for (let j = 0; j < LEAVES; j++) leaf(p, L, j, ph, s, front);
}

export function drawBack(p, t, o) {
  const C = o.palette, breathe = 0.5 + 0.5 * Math.sin((TAU * t * 2) / DURATION);
  p.glow(0, -20, 20, C[4], 0.12 + 0.05 * breathe); // air barely shines
  layer(p, t, o, false);
}

export function draw(p, t, o) {
  layer(p, t, o, true);
}
