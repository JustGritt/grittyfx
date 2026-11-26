import { rand } from '../../core/index.js';

const HITS = [10 / 30, 17 / 30, 24 / 30]; // the funnel grinds on what stands in it

export const meta = {
  name: 'Tornado',
  desc: 'A twist on the floor shoots up into a spinning funnel round the target, bands of air and dust and leaves wound up it; it grinds three times, then unwinds upward and flings what it carried',
  tags: ['wind', 'air', 'tornado', 'whirlwind', 'magic', 'spell'],
  size: [72, 84],
  origin: [36, 74],
  duration: 1.7,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [72, 72] },
  ramps: { palette: 8, dust: 6, leaf: 4 },
  options: { palette: 'wind', dust: 'dust', leaf: 'leaf', seed: 1 },
  act: { hits: HITS.map(t => ({ t, freeze: 0.04, shake: 1.5 })) },
  stage: { at: 'target', ground: 0 }, // on the floor under the goblin, which stands inside it
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.45, pitch: 0.9 }, // the twist
    { t: 0, kind: 'crack', gain: 0.55, pitch: 0.3 }, // the rumble under the roar
    { t: 0.1, kind: 'whoosh', gain: 0.6, pitch: 0.55 }, // the roar: whooshes overlapping
    { t: 0.3, kind: 'whoosh', gain: 0.55, pitch: 0.5 },
    { t: 0.48, kind: 'whoosh', gain: 0.55, pitch: 0.6 },
    { t: 0.66, kind: 'whoosh', gain: 0.5, pitch: 0.5 },
    { t: 0.85, kind: 'whoosh', gain: 0.45, pitch: 0.55 },
    ...HITS.map(t => ({ t, kind: 'crack', gain: 0.45, pitch: 1.1 })),
    { t: 0.5, kind: 'crack', gain: 0.35, pitch: 0.32 },
    { t: 0.98, kind: 'whoosh', gain: 0.5, pitch: 0.8 }, // it unwinds
  ],
};

const TAU = Math.PI * 2;
const H = 56, R0 = 3, R1 = 18; // the funnel's height, its radius at the floor and at the top
const RY = 0.3; // a circle round the funnel seen from the side: an ellipse this flat
const W = TAU * 2.3; // spin, radians per second
const RISE = 55; // px/s the bands climb
const BANDS = 16, DUSTS = 16, LEAVES = 5, PUFFS = 12;
const UNWIND = 0.9, GONE = 1.12; // the foot leaves the floor; the last band leaves the top
const F = 1 / 30;

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = (e0, e1, x) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};
const out = (t, k) => 1 - Math.exp(-Math.max(0, t) / k); // fast out, slow settle
const radius = h => R0 + (R1 - R0) * clamp01(h / H) ** 0.85;
const topOf = t => H * (1 - (1 - clamp01((t - 0.08) / 0.2)) ** 3); // it shoots up out of the twist
const footOf = t => H * clamp01((t - UNWIND) / (GONE - UNWIND)) ** 2; // then unwinds upward from its foot
const sway = (h, t) => 2.5 * (h / H) * Math.sin(TAU * 1.3 * t + h * 0.08);
const pulse = t => HITS.reduce((m, h) => (t >= h ? Math.max(m, Math.exp(-(t - h) / 0.06)) : m), 0);
const onHit = t => HITS.some(h => t >= h && t < h + F);

// A small hook at the end of a stroke: it carries on from (x, y) along (dx, dy) and turns toward (tx, ty).
function curl(p, x, y, dx, dy, tx, ty, c, n = 2) {
  const l = Math.hypot(dx, dy) || 1;
  let ux = dx / l, uy = dy / l;
  const sgn = ux * ty - uy * tx > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = sgn * 1.2, nx = ux * Math.cos(a) - uy * Math.sin(a), ny = ux * Math.sin(a) + uy * Math.cos(a);
    p.line(x, y, x + nx * 1.5, y + ny * 1.5, c);
    (x += nx * 1.5), (y += ny * 1.5), (ux = nx), (uy = ny);
  }
}

// Band j: a stretch of the funnel's wall, `span` radians long, its head at angle th and height h, its tail lower (it
// winds up the funnel). Seen from the side it is part of a slanted ellipse; from above, a spiral arc.
function bandAt(j, t, s) {
  const f = (rand(j, s, 1) + (j / BANDS) * 0.6 + (t * RISE) / H) % 1, h = f * H;
  const th = TAU * rand(j, s, 2) + W * (0.9 + 0.2 * rand(j, s, 3)) * t;
  const span = Math.PI * (0.7 + 0.5 * rand(j, s, 4));
  // fade in at the foot, out at the top; peel outward and go as the unwinding foot passes
  const peel = clamp01((footOf(t) - h + 8) / 8);
  const a = smooth(0, 0.08, f) * smooth(1, 0.9, f) * (1 - peel) * (h <= topOf(t) ? 1 : 0);
  return { h, th, span, a, grow: (1 + 0.6 * peel) * (1 + 0.12 * pulse(t)) };
}

function bands(p, t, o, front, top) {
  const C = o.palette, s = o.seed, flash = onHit(t);
  for (let j = 0; j < BANDS; j++) {
    const b = bandAt(j, t, s);
    if (b.a <= 0.02 || (top && b.h < H * 0.2)) continue; // from above, the foot is lost under the bands over it
    const M = Math.max(4, Math.round(b.span / 0.14)), pts = [];
    for (let k = 0; k <= M; k++) {
      const th = b.th - b.span * (1 - k / M), h = Math.max(0, b.h - b.span * (1 - k / M) * (top ? 0 : 2.2));
      const r = radius(h) * b.grow * (top ? 0.5 + 0.5 * (k / M) : 1); // from above the tail spirals inward
      pts.push(top ? [Math.cos(th) * r, Math.sin(th) * r, true] : [sway(h, t) + Math.cos(th) * r, -h + Math.sin(th) * r * RY, Math.sin(th) > 0]);
    }
    for (let k = 0; k < M; k++) {
      const [x0, y0, f0] = pts[k], [x1, y1] = pts[k + 1], u = (k + 1) / M;
      if (!top && f0 !== front) continue;
      const near = top ? b.h / H > 0.5 : front; // from above, the funnel's top is nearer the eye
      const c = flash && near ? 7 : near ? (u > 0.9 ? 7 : u > 0.6 ? 6 : u > 0.3 ? 5 : 4) : u > 0.7 ? 4 : u > 0.35 ? 3 : 2;
      p.line(x0, y0, x1, y1, C[c], b.a * Math.min(1, u / 0.35));
    }
    const [xa, ya] = pts[M - 1], [xb, yb, fb] = pts[M];
    // the head curls up (from above, outward)
    if ((top ? b.h > H * 0.5 : front && fb) && b.a > 0.5) curl(p, xb, yb, xb - xa, yb - ya, top ? xb : 0, top ? yb : -1, C[7]);
  }
}

// What the wind carries: dust and leaves lifted from the skirt, wound up the funnel on a helix, each to its own
// height, until the unwinding foot passes it and flings it out to fall.
function carried(j, t, s, leaf) {
  const born = 0.12 + 0.4 * rand(j, s, 21), hmax = H * (0.3 + 0.62 * rand(j, s, 22)), off = 2 * rand(j, s, 23);
  const th0 = TAU * rand(j, s, 24), w = W * (0.6 + 0.25 * rand(j, s, 25)), tr = UNWIND + (GONE - UNWIND) * Math.sqrt(hmax / H);
  const life = (leaf ? 0.42 : 0.32) + 0.1 * rand(j, s, 26);
  if (t < born || t > tr + life) return null;
  const tc = Math.min(t, tr), h = hmax * (1 - (1 - clamp01((tc - born) / 0.5)) ** 2), th = th0 + w * (tc - born);
  const r = radius(h) + off;
  const pos = { x: Math.cos(th) * r, z: Math.sin(th) * r, h, th, a: 1 };
  if (t <= tr) return pos;
  // flung: along its spin and outward, dragged, falling
  const q = t - tr, k = leaf ? 4.5 : 3, g = 500, v = 25 + 20 * rand(j, s, 27);
  const vx = -Math.sin(th) * v + Math.cos(th) * 15, vz = Math.cos(th) * v + Math.sin(th) * 15, vy = 15 + 20 * rand(j, s, 28);
  const e = (1 - Math.exp(-k * q)) / k;
  pos.x += vx * e;
  pos.z += vz * e;
  pos.h = Math.max(0, h + (vy + g / k) * e - (g / k) * q);
  pos.a = 1 - smooth(life * 0.55, life, q);
  pos.flung = q;
  return pos;
}

function debris(p, t, o, front, top) {
  const D = o.dust, L = o.leaf, s = o.seed;
  for (let j = 0; j < DUSTS + LEAVES; j++) {
    const leaf = j >= DUSTS, q = carried(j, t, s, leaf);
    if (!q) continue;
    const near = q.z > 0;
    if (!top && near !== front) continue;
    const at = (q, t) => (top ? [q.x, q.z] : [sway(q.h, t) + q.x, -q.h + q.z * RY]), [x, y] = at(q, t);
    if (leaf) { // a leaf tumbling: two pixels that turn, light and dark side in turn
      const spin = Math.floor((t * 12 + rand(j, s, 29) * 4) % 4), [dx, dy] = [[1, 0], [1, 1], [0, 1], [-1, 1]][spin];
      p.dot(x, y, L[near || top ? 3 : 2], q.a);
      p.dot(x + dx, y + dy, L[spin % 2 ? 1 : 2], q.a);
      continue;
    }
    // a grain of dust streaks along its path, so its spin shows
    const was = carried(j, t - 0.03, s, false), c = D[near || top ? 4 + (j % 2) : 3];
    if (was && !(q.flung > 0 && was.h === 0)) p.line(...at(was, t - 0.03), x, y, u => (u > 0.5 ? c : D[2]), q.a);
    else p.dot(x, y, c, q.a);
  }
}

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, D, x, y, r, a) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return D[5];
    return D[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? 3 : 4];
  }, (dx, dy, d) => a * smooth(1, 0.5, d));
}

// The skirt: dust churned round the foot, streaks of it whirled round, puffs thrown out and up and thinning, and
// kicked out wider on each hit.
function skirt(p, t, o, front, top) {
  const D = o.dust, s = o.seed, env = smooth(0.04, 0.16, t) * (1 - smooth(UNWIND, UNWIND + 0.18, t));
  const list = [];
  if (env > 0) {
    const flare = HITS.reduce((m, h) => (t >= h ? Math.max(m, Math.exp(-(t - h) / 0.15)) : m), 0);
    const go = smooth(UNWIND, UNWIND + 0.18, t); // as the foot lifts, the ring spreads, rises and thins away
    for (let i = 0; i < PUFFS; i++) { // a ring of puffs close enough to merge, each swelling and thinning in turn
      const u = (t * 2.4 + rand(i, s, 31)) % 1, th = (TAU * i) / PUFFS + W * 0.7 * t, rr = (5 + 2.5 * u) * (1 + 0.5 * flare + 0.4 * go);
      list.push({ x: Math.cos(th) * rr, z: Math.sin(th) * rr, h: 1 + 2.5 * u + 3 * go, r: 2 + 1.8 * u + go, a: env * (0.45 + 0.3 * flare) * Math.sin(Math.PI * u) });
    }
    for (let i = 0; i < 5; i++) { // streaks of dust whirled round the foot, ending in a hook
      const rr = 5 + 7 * rand(i, s, 33), h = 0.5 + 3 * rand(i, s, 34), th = TAU * rand(i, s, 35) + W * 1.1 * t, M = 6;
      const pt = k => {
        const a = th - 1.3 * (1 - k / M);
        return top ? [Math.cos(a) * rr, Math.sin(a) * rr, true] : [Math.cos(a) * rr, -h + Math.sin(a) * rr * RY, Math.sin(a) > 0];
      };
      for (let k = 0; k < M; k++) {
        const [x0, y0, f0] = pt(k), [x1, y1] = pt(k + 1);
        if (top || f0 === front) p.line(x0, y0, x1, y1, D[f0 ? (k > M - 3 ? 5 : 4) : 3], env * Math.min(1, (k + 1) / 3));
      }
    }
  }
  HITS.forEach((hit, n) => { // each grind throws streaks of grit out along the floor, swept round as they go
    const q = t - hit;
    if (q < 0 || q > 0.3) return;
    for (let i = 0; i < 6; i++) {
      const th = TAU * (i / 6 + rand(n, i, s)), d0 = 5 + 15 * out(q, 0.08), len = 6 * (1 - q / 0.3) + 1;
      const pt = k => {
        const d = d0 - len * (1 - k / 3), a = th + 0.5 * (d / 20);
        return top ? [Math.cos(a) * d, Math.sin(a) * d] : [Math.cos(a) * d, -1 - 2 * q + Math.sin(a) * d * RY];
      };
      if (!top && Math.sin(th) > 0 !== front) continue;
      for (let k = 0; k < 3; k++) p.line(...pt(k), ...pt(k + 1), D[k === 2 ? 5 : 4], 1 - (q / 0.3) ** 2);
    }
  });
  for (const q of list) {
    if (!top && q.z > 0 !== front) continue;
    if (top) puff(p, D, q.x, q.z, q.r, q.a);
    else puff(p, D, q.x, -Math.max(q.h, q.r * 0.8) + q.z * RY, q.r, q.a);
  }
}

// The twist it forms from: three arms spiralling in on the floor, tightening and spinning up.
function twist(p, t, o, front, top) {
  if (t >= 0.24) return;
  const C = o.palette, a = 1 - smooth(0.14, 0.24, t), k = 1 - 0.55 * smooth(0, 0.16, t);
  for (let i = 0; i < 3; i++) {
    const M = 12;
    for (let m = 0; m < M; m++) {
      const pt = n => {
        const u = n / M, th = (i * TAU) / 3 + 3.2 * u + W * 1.3 * t, r = (2 + 12 * (1 - u)) * k;
        return [Math.cos(th) * r, Math.sin(th) * r];
      };
      const [x0, z0] = pt(m), [x1, z1] = pt(m + 1);
      if (!top && (z0 + z1 > 0) !== front) continue;
      const c = C[m > M - 4 ? 6 : z0 + z1 > 0 || top ? 5 : 3];
      if (top) p.line(x0, z0, x1, z1, c, a);
      else p.line(x0, -0.5 + z0 * RY, x1, -0.5 + z1 * RY, c, a);
    }
  }
}

function lights(p, t, o, top) {
  const C = o.palette, env = smooth(0.06, 0.25, t) * (1 - smooth(UNWIND, GONE, t)), hit = pulse(t);
  if (env <= 0 && hit <= 0) return;
  if (top) p.glow(0, 0, 20, C[5], 0.15 * env + 0.12 * hit);
  else p.glowLine(0, -2, 0, -topOf(t) * 0.75, 12, C[5], 0.2 * env + 0.12 * hit);
}

export function drawBack(p, t, o) {
  const top = o.view === 'top';
  lights(p, t, o, top);
  if (top) {
    skirt(p, t, o, true, true);
    twist(p, t, o, true, true);
    return;
  }
  twist(p, t, o, false, false);
  skirt(p, t, o, false, false);
  bands(p, t, o, false, false);
  debris(p, t, o, false, false);
}

export function draw(p, t, o) {
  const top = o.view === 'top';
  if (top) {
    bands(p, t, o, true, true);
    debris(p, t, o, true, true);
    return;
  }
  twist(p, t, o, true, false);
  skirt(p, t, o, true, false);
  bands(p, t, o, true, false);
  debris(p, t, o, true, false);
}
