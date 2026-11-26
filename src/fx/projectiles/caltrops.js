import { rand } from '../../core/index.js';

export const meta = {
  name: 'Caltrops',
  desc: 'A handful of caltrops tossed in a low arc: they tumble apart, clatter and hop over the floor at the target\'s feet, settle spikes up, glint one by one, then fade',
  tags: ['thrown', 'ninja', 'trap', 'caltrops', 'spikes', 'scatter', 'physical'],
  size: [88, 44],
  origin: [68, 40],
  duration: 1.8,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 6, dust: 5 },
  options: { palette: 'stone', dust: 'dust', seed: 1 },
  act: { hits: [{ t: 11 / 30, freeze: 0.03, shake: 1 }] }, // most of the handful has struck the floor
  stage: { at: 'target', ground: 0 }, // the anchor is the floor under the target; they fly in from the thrower's side
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 2.4 }, // the toss
    { t: 10 / 30, kind: 'crack', gain: 0.4, pitch: 2.8 }, // they strike the floor, one after another
    { t: 11 / 30, kind: 'crack', gain: 0.5, pitch: 2.5 },
    { t: 0.387, kind: 'crack', gain: 0.3, pitch: 3.1 },
    { t: 0.482, kind: 'crack', gain: 0.2, pitch: 3.4 }, // their hops coming down
    { t: 0.515, kind: 'crack', gain: 0.15, pitch: 3.6 },
    { t: 0.6, kind: 'crack', gain: 0.08, pitch: 4 }, // settling
    { t: 0.75, kind: 'chime', gain: 0.12, pitch: 2.4 }, // glints
    { t: 0.93, kind: 'chime', gain: 0.08, pitch: 2.8 },
    { t: 1.11, kind: 'chime', gain: 0.06, pitch: 3 },
  ],
};

const G = 1100; // px/s²: a low arc that drops them hard onto the floor
const FIRST = 10 / 30; // the nearest strikes the floor, the rest over the next two frames
const FROM = [-61, -22]; // the thrower's hand, back along the arc (the kunoichi's on the stage)
// Each caltrop: where it comes to rest, its two hops' lengths and heights (px), how much nearer the viewer it lies, and
// where it sits in the handful as it leaves the hand.
const LANES = [
  [-16, 5, 3, 1, 1, 0, 0, 0],
  [-9, 6, 4, 2, 1, 1, -1, 1],
  [-2, 4, 2, 1, 1, -1, 1, -1],
  [4, 7, 3, 2, 1, 1, -1, -1],
  [11, 5, 3, 1, 1, 0, 1, 1],
];
const GLINT = [1, 3, 0, 4, 2]; // the order the light catches them in, then the order they fade in
const LAND0 = LANES[0][0] - LANES[0][1] - LANES[0][3];
// A caltrop resting spike up on three feet, its hub at (0, 0): the spike, the hub with its legs' roots, the feet.
const SHAPE = [[0, -2], [0, -1], [-1, 0], [0, 0], [1, 0], [-2, 1], [0, 1], [2, 1]];
// The shape turned k quarter turns clockwise, shaded where each pixel then sits: lit from the upper left.
const TURNS = [0, 1, 2, 3].map(k => SHAPE.map(([x, y]) => {
  for (let i = 0; i < k; i++) [x, y] = [-y, x];
  return [x, y, Math.max(2, Math.min(5, Math.round(3.4 + 0.7 * (-x - y))))];
}));

function caltrop(i, seed) {
  const [rest, dx1, h1, dx2, h2, z, sx, sy] = LANES[i];
  const land = rest - dx1 - dx2, x0 = FROM[0] + sx, y0 = FROM[1] + sy, y = z - 2; // the hub's height at rest
  const T = FIRST + (land - LAND0) * 0.002; // fixed, so the hit and the clatter don't move with the seed
  const j = Math.round(rand(i, seed, 1) * 2 - 1); // a px either way
  return {
    T, x0, y0, y, h1, h2, land: land + j, x1: land + dx1 + j, x2: rest + j,
    vy: (y - y0 - (G * T * T) / 2) / T, d1: 2 * Math.sqrt((2 * h1) / G), d2: 2 * Math.sqrt((2 * h2) / G),
    spin: rand(i, seed, 2) * 4, dir: rand(i, seed, 3) < 0.5 ? -1 : 1,
  };
}

// Where a caltrop's hub is at t, and whether it flies, hops or rests.
function pos(c, t) {
  if (t < c.T) return [c.x0 + ((c.land - c.x0) * t) / c.T, c.y0 + c.vy * t + (G * t * t) / 2, 'air'];
  let u = t - c.T;
  if (u < c.d1) {
    const k = u / c.d1;
    return [c.land + (c.x1 - c.land) * k, c.y - 4 * c.h1 * k * (1 - k), 'hop'];
  }
  u -= c.d1;
  if (u < c.d2) {
    const k = u / c.d2;
    return [c.x1 + (c.x2 - c.x1) * k, c.y - 4 * c.h2 * k * (1 - k), 'hop'];
  }
  return [c.x2, c.y, 'rest'];
}

export function draw(p, t, o) {
  const S = o.palette, D = o.dust;
  const all = LANES.map((_, i) => caltrop(i, o.seed));

  all.forEach((c, i) => {
    // a puff of dust where it strikes the floor
    const k = (t - c.T) / 0.22;
    if (k >= 0 && k < 1) p.disc(c.land + 0.5 + k * 2, c.y + 0.5 - k, 1.5 + k, (dx, dy, d) => D[d > 0.7 ? 2 : dx + dy < -1 ? 4 : 3], (dx, dy, d) => 0.9 * (1 - k) * (1 - d * d));

    // a streak of air behind it in flight
    for (let s = 1; s <= 2; s++) {
      const b = t - s * 0.012;
      if (b < 0 || b >= c.T) continue;
      const [x, y] = pos(c, b);
      p.blend(x, y, S[4], 0.3 / s);
    }

    const [x, y, state] = pos(c, t), hx = Math.round(x), hy = Math.round(y);
    const turn = state === 'rest' ? 0 : ((Math.floor(c.spin + c.dir * t * (state === 'air' ? 16 : 10)) % 4) + 4) % 4;
    const fade = Math.max(0, (t - (1.25 + GLINT[i] * 0.05)) / 0.3); // after the glints, one by one, stepping down the ramp
    if (fade >= 1) return;
    for (const [dx, dy, s] of TURNS[turn]) p.dot(hx + dx, hy + dy, S[Math.max(0, s - Math.floor(fade * 3))], 1 - fade * fade);

    // a spark off the stone where it strikes
    const u = t - c.T;
    if (u >= 0 && u < 0.1) {
      p.glow(c.land, c.y + 1, 4, S[5], 0.6 * (1 - u / 0.1));
      for (const [vx, vy] of [[35, -100], [-20, -80]]) {
        const at = v => [c.land + vx * v, c.y + 1 + vy * v + 800 * v * v];
        p.line(...at(Math.max(0, u - 0.02)), ...at(u), S[5]);
      }
    }

    // then, at rest, the light catching its spike: a star that opens and closes
    const g = t - (0.75 + GLINT[i] * 0.09);
    if (state === 'rest' && g >= 0 && g < 0.2) {
      const arm = g < 0.05 ? 1 : g < 0.14 ? 2 : 1, tx = c.x2, ty = c.y - 2;
      p.glow(tx + 0.5, ty + 0.5, 4, S[5], 0.8 * (1 - g / 0.2));
      for (let a = 1; a <= arm; a++) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(tx + ax * a, ty + ay * a, S[a === 1 ? 5 : 4]);
      p.px(tx, ty, S[5]);
    }
  });
}
