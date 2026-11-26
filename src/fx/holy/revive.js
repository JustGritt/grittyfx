import { rand, noise2 } from '../../core/index.js';

const LAND = 0.32, RISE = 0.8, UP = 1.0, END = 1.9;

export const meta = {
  name: 'Revive',
  desc: 'A shaft of soft light comes down on a spot on the floor, motes falling into the glow of a body lying there; it rises and stands in a white flash, a ring flaring out over the ground, and the light lifts away in rising motes',
  tags: ['revive', 'resurrect', 'heal', 'holy', 'light', 'magic', 'spell'],
  size: [64, 96],
  origin: [32, 84],
  duration: END,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'holy', seed: 1 },
  act: { hits: [{ t: UP, freeze: 0.05, shake: 0 }] },
  // beside her, where an ally would lie: she holds her staff up while the light comes down
  stage: { at: 'aside', x: 6, ground: 0, pose: 'raise' },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 0.5 }, // the light coming down
    { t: 0.05, kind: 'chime', gain: 0.25 },
    { t: LAND, kind: 'chime', gain: 0.22, pitch: 1.26 },
    { t: RISE - 0.05, kind: 'whoosh', gain: 0.3, pitch: 0.8 }, // the rising
    { t: UP, kind: 'chime', gain: 0.5 }, // a chord as it stands
    { t: UP, kind: 'chime', gain: 0.4, pitch: 1.26 },
    { t: UP + 0.03, kind: 'chime', gain: 0.35, pitch: 1.5 },
    { t: UP + 0.35, kind: 'chime', gain: 0.15, pitch: 2.5 },
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30;
const TOP = -84; // the shaft comes in at the top edge
const HW = 8; // the shaft's half-width
const SQ = 0.28; // the ground ellipses' height over their width
const FALL = 10, MOTES = 14;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = u => u * u * (3 - 2 * u);
const OUT = u => 1 - (1 - u) ** 3;
const BACK = u => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // eases out past 1 and back

// A flat ellipse on the ground; front is the half nearer the viewer.
function ellipse(p, rx, front, c, a = 1) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 === front) p.line(Math.cos(a0) * rx, Math.sin(a0) * rx * SQ - 1, Math.cos(a1) * rx, Math.sin(a1) * rx * SQ - 1, c, a);
  }
}

// The shaft: where its foot has come down to, how wide, how strong, and (going) where its lifting end is.
function shaft(t) {
  if (t >= END - 0.1) return null;
  const foot = TOP + (0 - TOP) * smooth(clamp(t / LAND));
  const v = clamp((t - UP - F) / (END - 0.1 - UP - F)); // after the rise it narrows and lifts away
  return { foot: v > 0.55 ? TOP * ((v - 0.55) / 0.45) ** 2 : foot, hw: HW * (1 - 0.7 * v), k: t < UP ? 0.7 + 0.3 * smooth(clamp((t - LAND) / (RISE - LAND))) : 1 - v * 0.6 };
}

// The body of light: lying on the floor, head toward the caster, then lifted upright and set on its feet. Its centre,
// its turn from upright, how lit, how far it has faded from the feet up, and how far it has risen.
function body(t) {
  if (t < LAND - 0.05 || t >= END - 0.15) return null;
  const on = smooth(clamp((t - LAND + 0.05) / 0.2));
  const u = BACK(clamp((t - RISE) / (UP - RISE)));
  const fade = t > UP + 0.3 ? 1 - clamp((t - UP - 0.3) / (END - 0.15 - UP - 0.3)) : 1;
  const lit = 0.6 + 0.4 * smooth(clamp((t - LAND) / (RISE - LAND))); // it brightens as the light gathers in it
  return { cy: -3.5 - 8.5 * u, turn: -(Math.PI / 2) * (1 - u), w: 0.7 + 0.3 * Math.min(1, u), on: on * lit, dim: lit < 0.85, fade, u };
}

// How deep a point (its own coordinates, upright, centred) is inside the body: 0 at its heart, 1 at its edge.
// w narrows it, lying, so that it hugs the floor.
const inside = (x, y, w = 1) => Math.min(Math.hypot(x, y + 9.5) / 2.7, Math.hypot(x / (4.5 * w), (y - 3) / 9));

export function drawBack(p, t, o) {
  const C = o.palette, q = shaft(t), b = body(t);
  if (q && q.foot > TOP + 18) p.glowLine(0, TOP + 16, 0, Math.min(-4, q.foot - 2), q.hw + 7, C[5], 0.4 * q.k);
  if (b) p.glow(0, b.cy, 12, C[5], 0.45 * b.on * b.fade);
  const k = t - UP;
  if (k >= 0 && k < 0.5) p.glowLine(-14, -1, 14, -1, 6, C[5], 0.35 * (1 - k / 0.5) ** 2); // the ground lit by the ring
  ring(p, t, C, false);
}

// The floor's ring: it draws in under the shaft, then flares out as the body stands and fades.
function ring(p, t, C, front) {
  if (t < LAND - 0.08) return;
  const k = t - UP;
  if (k < 0) {
    const g = OUT(clamp((t - LAND + 0.08) / 0.25));
    ellipse(p, 18 - 3 * g, front, C[front ? 5 : 4], g * 0.9);
  } else if (k < 0.45) {
    const v = k / 0.45;
    ellipse(p, 13 + 15 * OUT(v), front, C[(front ? 7 : 6) - Math.floor(v * 4)], Math.min(1, (1 - v) / 0.3));
  }
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, q = shaft(t), b = body(t);

  // a few brighter rays down the shaft, each waxing and waning on its own: how bright the one in column x is, or 0
  const ray = x => {
    for (let j = 0; j < 3; j++) {
      if (Math.floor((rand(j, s, 7) - 0.5) * 2 * (q.hw - 1.5)) === x) return Math.max(0, Math.sin(TAU * (t * 1.2 + rand(j, s, 8))));
    }
    return 0;
  };
  if (q) { // soft light poured down: translucent, streaked, brightest at its heart and fading toward the sky
    const hw = q.hw, bottom = q.foot;
    p.shade(-Math.ceil(hw) - 1, TOP, 2 * Math.ceil(hw) + 2, Math.max(0, Math.ceil(bottom - TOP)), (x, y) => {
      const d = Math.abs(x + 0.5) / hw;
      if (d > 1) return 0;
      if (ray(x)) return C[6];
      const n = noise2((x + 0.5) * 0.6, (y - t * 50) * 0.06, s);
      const heat = 1 - d * 0.8 + (n - 0.5) * 0.6;
      return C[heat > 0.7 ? 6 : 5];
    }, (x, y) => {
      const d = Math.abs(x + 0.5) / hw, sky = clamp((y - TOP) / 30), tip = clamp((bottom - y) / 6), r = ray(x);
      return q.k * (r ? 0.22 + 0.2 * r : 0.24 - 0.16 * d * d) * sky * (bottom >= -1 ? 1 : tip);
    });
  }

  // motes drifting down the shaft into the glow
  for (let j = 0; j < MOTES; j++) {
    const b0 = 0.08 + 0.6 * (j / MOTES) + 0.05 * rand(j, s), v = (t - b0) / 0.45;
    if (v < 0 || v >= 1) continue;
    const x = (rand(j, s, 1) - 0.5) * 2 * (HW - 2) * (1 - 0.6 * v), y = TOP + 14 + (-4 - TOP - 14) * v * v;
    p.px(x, y, C[v < 0.7 ? 7 : 6]);
    p.px(x, y - 1, C[5]);
    p.light(x, y, C[5], 0.4);
  }

  ring(p, t, C, true);

  if (b) { // the body of light, brighter at its heart; white as it stands
    const hero = t >= UP - 1e-6 && t < UP + F, breathe = 0.85 + 0.15 * Math.sin(TAU * t * 3);
    const cos = Math.cos(b.turn), sin = Math.sin(b.turn);
    const depth = (x, y) => {
      const dx = x + 0.5, dy = y + 0.5 - b.cy;
      return inside(dx * cos + dy * sin, -dx * sin + dy * cos, b.w);
    };
    p.shade(-15, -28, 30, 28, (x, y) => {
      const d = depth(x, y);
      if (d > 1) return 0;
      return hero ? C[d < 0.8 ? 7 : 6] : C[(d < 0.45 ? 7 : d < 0.75 ? 6 : d < 0.92 ? 5 : 4) - (b.dim ? 1 : 0)];
    }, (x, y) => {
      const d = depth(x, y), gone = clamp((-y - 0.5 - 27 * (1 - b.fade)) / 4); // it fades from the feet up
      return hero ? 1 : b.on * gone * (0.95 - 0.45 * d * d) * breathe;
    });
  }

  // a glint over the spot that gathers before the rise
  const g = (t - LAND) / (RISE - LAND);
  if (g > 0 && t < UP) {
    const arm = Math.round(1 + 3 * smooth(clamp(g))), y = -26 - 6 * clamp((t - RISE) / (UP - RISE));
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(dx, y + dy, C[d === arm ? 5 : 7]);
    p.px(0, y, C[7]);
    p.light(0, y, C[6], 0.6);
  }

  // risen: motes spiral up off it and away
  for (let j = 0; j < FALL; j++) {
    const v = (t - UP - 0.03 * j) / 0.55;
    if (v < 0 || v >= 1) continue;
    const a = TAU * (rand(j, s, 2) + 0.9 * v), r = 6 + 4 * rand(j, s, 3);
    const x = Math.cos(a) * r * (1 - 0.4 * v), y = -4 - 50 * OUT(v) * (0.7 + 0.3 * rand(j, s, 4)) + Math.sin(a) * 2;
    const c = C[7 - Math.floor(v * 3)];
    p.px(x, y, c);
    if (v < 0.25) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[5]);
    p.light(x, y, C[5], 0.5 * (1 - v));
  }
}
