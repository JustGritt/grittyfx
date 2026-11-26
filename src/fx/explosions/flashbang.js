import { Rng, Particles, Lights, SMOKE, rand } from '../../core/index.js';

export const meta = {
  name: 'Flashbang',
  desc: 'A stun grenade going off: a white flash filling a wide circle, its edge dithered, a flare across it, a sharp ring racing out, bright specks hanging and dimming like an afterimage, a puff of smoke off the spent canister',
  tags: ['explosion', 'military', 'flashbang', 'stun', 'flash', 'grenade'],
  size: [144, 120],
  origin: [72, 84],
  duration: 1.2,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 6, steel: 5 },
  options: { palette: ['#1a1c2a', '#343a56', '#56628a', '#8494bc', '#b4c2e0', '#d8e2f4', '#eef3fc', '#ffffff'], smoke: 'smoke', steel: 'stone', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.35, shake: 3 }] }, // the stun: a long freeze
  stage: { ground: 0, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // on the floor at the target, thrown
  sound: [
    { t: 0, kind: 'crack', gain: 1, pitch: 2 }, // the bang, sharp
    { t: 0, kind: 'shot', gain: 0.7, pitch: 1.3 },
    { t: 0.03, kind: 'chime', gain: 0.26, pitch: 1.6 }, // the ears ringing, two tones a little apart so it warbles
    { t: 0.03, kind: 'chime', gain: 0.2, pitch: 1.61 },
  ],
};

const TAU = Math.PI * 2;
const CY = -10; // where it goes off, above the floor at 0
const F = 1 / 30; // a frame
const clamp01 = v => Math.max(0, Math.min(1, v));

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, M = o.steel, s = o.seed;
  const parts = new Particles({ rng, palette: C, smoke: S, ground: 0 }), lights = new Lights();
  lights.add(0, CY, 44, C[7], 1, 0.3);
  lights.add(0, CY, 30, C[5], 0.6, 0.9, { delay: 0.1 });
  // the spent canister smoking where it lies
  for (let i = 0; i < 7; i++) {
    parts.spawn(SMOKE, -3, -2, -rng.range(4, 14), -rng.range(12, 28), rng.range(0.5, 0.75), { size: rng.range(2, 3.5) + i * 0.25, delay: 0.05 + i * 0.05 });
  }
  // the afterimage: specks in their own sectors round the flash, hanging and dimming
  const specks = Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI * (1.05 + (0.9 * (i + rng.range(0.2, 0.8))) / 10), d = rng.range(12, 40);
    return { x: Math.cos(a) * d, y: Math.min(-3, CY + Math.sin(a) * d * 0.9), vx: rng.range(-4, 4), vy: rng.range(2, 6), life: rng.range(0.6, 1.05), big: i % 3 === 0 };
  });

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      const floor = Math.max(0, 1 - t / 0.5) ** 2; // the floor lit round it
      if (floor > 0) p.glowLine(-56, -1, 56, -1, 8, C[6], 0.7 * floor);
      parts.draw(p);
      canister(p, M, t);
      above(p, t, C, s, specks);
    },
  };
}

// The canister on its side on the floor, popped open at one end. Hidden in the flash's first frames.
function canister(p, M, t) {
  const a = 1 - clamp01((t - 0.85) / 0.3);
  if (t < 2 * F || a <= 0) return;
  p.line(-1, -3, 5, -3, M[3], a);
  p.line(-1, -2, 5, -2, M[2], a);
  p.line(-1, -1, 5, -1, M[1], a);
  p.line(-2, -3, -2, -1, M[4], a);
  p.dot(6, -2, M[0], a);
}

function above(p, t, C, s, specks) {
  const air = (dx, dy) => CY + dy < 0; // the floor cuts what is under it
  if (t < 2 * F) {
    // the hero frames: a white disc filling a wide circle, a flare across it, the floor lit white
    const first = t < F, r = first ? 32 : 26;
    const R = r + 14; // a dithered halo round it, so its edge is light, not a hard disc
    p.circle(0.5, CY + 0.5, R, C[6], (dx, dy, d) => (d * R > r ? 1 - (d * R - r) / (R - r) : 0));
    p.circle(0.5, CY + 0.5, r, (dx, dy, d) => C[first || d < 0.8 ? 7 : 6]);
    p.beam(-62, CY, 62, CY, first ? 3 : 2, C[7]);
    p.ellipse(0.5, -0.5, first ? 60 : 52, 1.5, C[7]);
    return;
  }
  const k = t - 2 * F;
  // the core shrinking to a point
  if (k < 0.16) p.circle(0.5, CY + 0.5, 1 + 10 * (1 - k / 0.16) ** 2, C[k < 0.08 ? 7 : 6]);
  // the flare fading along its length
  if (k < 0.2) {
    const u = k / 0.2, l = 62 * (1 - u * u);
    p.line(-l, CY, l, CY, w => C[Math.abs(w - 0.5) < 0.2 * (1 - u) + 0.05 ? 7 : u < 0.5 ? 6 : 5]);
  }
  // the ring racing out, thin and sharp, broken into arcs and cut by the floor; another along the floor, flattened by the low view
  const v = k / 0.24;
  if (v < 1) {
    const e = 1 - (1 - v) ** 3, r = 26 + 36 * e, c = C[v < 0.3 ? 7 : v < 0.6 ? 6 : 5];
    p.ring(0.5, CY + 0.5, r, v < 0.6 ? 2 : 1, (dx, dy, e) => (air(dx, dy) && CY + dy < -1 && Math.sin(Math.atan2(dy, dx) * 7 + 2) > -0.7 ? (v < 0.6 && e < 0 ? C[3] : c) : 0), 1 - v * v); // a darker inner edge, so it reads on a light ground
    const rx = 30 + 30 * e;
    p.ellipse(0.5, -0.5, rx, 2, (dx, dy) => (Math.abs(dx) > rx - 3 ? C[v < 0.5 ? 6 : 5] : 0), 1 - v);
  }
  // the afterimage: specks hanging where the flash was, drifting a little, dimming down the ramp, flickering at the end
  for (const [i, q] of specks.entries()) {
    const u = k / q.life;
    if (u >= 1) continue;
    const x = q.x + q.vx * k, y = Math.min(-1, q.y + q.vy * k), c = C[Math.max(2, 7 - Math.floor(u * 5.5))];
    if (u > 0.6 && rand(i, Math.floor(k * 20), s) < 0.35) continue;
    if (q.big && u < 0.35) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => p.px(x + a, y + b, C[Math.max(2, 6 - Math.floor(u * 6))]));
    p.px(x, y, c);
    p.light(x, y, C[6], 0.5 * (1 - u));
  }
}
