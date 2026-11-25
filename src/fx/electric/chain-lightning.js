import { Rng, Particles, Lights, SPARK, rand } from '../../core/index.js';

export const meta = {
  name: 'Chain lightning',
  desc: 'Lightning thrown from the staff that jumps on: it crackles at the tip, strikes the target with a white hero frame, then leaps to the floor behind it and on again, each jump later and dimmer, sparks spitting where each one lands',
  tags: ['electric', 'lightning', 'chain', 'magic', 'spell'],
  size: [138, 50],
  origin: [10, 21],
  duration: 0.8,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [236, 236], directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  act: {
    windup: 0.25,
    hits: [{ t: 3 / 30, freeze: 0.06, shake: 2 }, { t: 7 / 30, freeze: 0.03, shake: 1 }, { t: 11 / 30, freeze: 0.02, shake: 1 }],
  },
  stage: { at: 'target', x: -54, ground: 19 }, // from the mage's tip; the floor is 19 px below it
  sound: [
    { t: 0, kind: 'zap', gain: 0.3, pitch: 1.8 }, // crackling at the tip
    { t: 3 / 30, kind: 'crack', gain: 0.8, pitch: 1.2 }, // the strike
    { t: 3 / 30, kind: 'zap', gain: 0.6 },
    { t: 3 / 30, kind: 'thump', gain: 0.5, pitch: 0.8 },
    { t: 7 / 30, kind: 'crack', gain: 0.55, pitch: 1.5 }, // the jumps, each lighter
    { t: 7 / 30, kind: 'zap', gain: 0.4, pitch: 1.2 },
    { t: 11 / 30, kind: 'crack', gain: 0.4, pitch: 1.8 },
    { t: 11 / 30, kind: 'zap', gain: 0.3, pitch: 1.5 },
  ],
};

const F = 1 / 30;
const FLOOR = 19; // px below the tip
// the strike points: the tip, the target's chest, the floor behind it, the floor further on
const P = [[0, 0], [54, 6], [76, FLOOR], [98, FLOOR]];
// each jump: when it strikes (on its hit), how long it holds, its brightest step, how hard it glows
const JUMPS = [
  { t: 3 * F, hold: 0.24, top: 7, k: 0.5 },
  { t: 7 * F, hold: 0.18, top: 7, k: 0.4 },
  { t: 11 * F, hold: 0.14, top: 6, k: 0.3 },
];
const OUT = 0.08; // a bolt flickers out over this long after its hold

// A jagged path from a to b that bows up, re-formed per slot, and a fork or two off it.
function bolt(a, b, slot, j, s) {
  const r = i => rand(slot * 7 + j * 101, i, s);
  const [x0, y0] = a, [x1, y1] = b, len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(4, Math.round(len / 6));
  const nx = (y1 - y0) / len, ny = (x0 - x1) / len; // perpendicular, the upper side for a bolt going right
  const bow = 2 + 3 * r(0), main = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, end = i === 0 || i === n, off = end ? 0 : (r(i + 1) - 0.5) * 7 + bow * Math.sin(Math.PI * u);
    main.push([x0 + (x1 - x0) * u + nx * off, y0 + (y1 - y0) * u + ny * off]);
  }
  const forks = [];
  for (let f = 0; f < 1 + (r(50) < 0.6); f++) {
    const at = main[1 + Math.floor(r(51 + f) * (n - 2))], side = j || r(55 + f) < 0.5 ? -1 : 1, pts = [at]; // up only near the floor
    for (let k = 0; k < 2 + (r(57 + f) < 0.5); k++) {
      const [x, y] = pts[pts.length - 1];
      pts.push([x + 2 + r(60 + f * 3 + k) * 4, y + side * (2 + r(70 + f * 3 + k) * 3)]);
    }
    forks.push(pts);
  }
  return { main, forks };
}

// Light along a path, each segment dimmer at its ends so the joints add up to one light, not knots.
function glowPath(p, pts, r, c, k) {
  for (let i = 1; i < pts.length; i++) p.glowLine(...pts[i - 1], ...pts[i], r, c, (t, d) => k * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * t)));
}

const shift = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed, top = o.view === 'top';
  const parts = new Particles({ rng, palette: C, ...(top ? { top: true } : { ground: FLOOR }) }), lights = new Lights();
  let n = 0, t = 0;
  JUMPS.forEach((J, j) => {
    const [x, y] = P[j + 1], floor = j > 0;
    lights.add(x, y, floor ? 10 : 12, C[6], 0.8 - 0.15 * j, 0.3, { delay: J.t });
    for (let i = 0; i < (floor ? 9 : 7); i++) {
      // off the target they spray back and up; off the floor they fan up and out
      const a = floor ? rng.range(Math.PI * 1.1, Math.PI * 1.9) : rng.range(Math.PI * 0.75, Math.PI * 1.45);
      const v = rng.range(50, 110) * (top ? 0.4 : 1); // seen from above nothing falls, so they would skid off the canvas
      parts.spawn(SPARK, x, y - (floor ? 1 : 0), Math.cos(a) * v, Math.sin(a) * v, rng.range(0.18, 0.34), { delay: J.t });
    }
  });

  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      const frame = Math.floor(t / F + 1e-6);
      lights.draw(p);

      // crackling at the tip until the first strike, and a fading spot after
      if (t < JUMPS[0].t) {
        const u = t / JUMPS[0].t;
        p.glow(0, 0, 4 + 4 * u, C[5], 0.3 + 0.4 * u);
        for (let i = 0; i < 3; i++) {
          const a = rand(frame, i, s) * Math.PI * 2, r1 = 2 + 4 * rand(frame, i + 5, s);
          p.polyline([[0, 0], [Math.cos(a + 0.5) * r1 * 0.6, Math.sin(a + 0.5) * r1 * 0.6], [Math.cos(a) * r1, Math.sin(a) * r1]], C[rand(frame, i + 9, s) < 0.5 ? 6 : 4]);
        }
        p.circle(0.5, 0.5, 1 + u, C[7]);
      }

      JUMPS.forEach((J, j) => {
        const a = t - J.t;
        if (j > 0 && a >= 0 && a < 0.4) { // a scorch where it struck the floor, cooling
          const [x, y] = P[j + 1];
          for (let i = -3; i <= 3; i++) p.dot(x + i, y, C[Math.abs(i) < 2 && a < 0.2 ? 4 : 2], (1 - a / 0.4) * (1 - Math.abs(i) / 4));
        }
        if (a < 0 || a >= J.hold + OUT) return;
        const hero = a < F, fresh = Math.floor(a / F + 1e-6) % 2 === 0, slot = Math.floor(a / (2 * F) + 1e-6);
        const B = bolt(P[j], P[j + 1], slot, j, s), c = J.top;
        if (a >= J.hold) {
          // flickering out: a broken, cooling strand every other frame
          if (fresh) p.polyline(B.main.filter((_, i) => rand(slot, i, s + j) < 0.6), C[4]);
          return;
        }
        glowPath(p, B.main, hero ? 9 : 6, C[5], hero ? J.k + 0.2 : fresh ? J.k : J.k * 0.6);
        p.polyline(shift(B.main.slice(1, -1), 1), C[fresh ? 3 : 2]); // a dark underside: it holds on a light background
        if (fresh || hero) for (const f of B.forks) p.polyline(f, u => C[u > 0.6 ? 4 : c - 1]);
        p.polyline(B.main, C[hero || fresh ? c : c - 1]);
        if (hero) p.polyline(shift(B.main, -1), C[c]); // twice as thick on the strike

        // the strike point: a hot spot, a star on the strike
        const [x, y] = P[j + 1];
        p.circle(x + 0.5, y + 0.5, hero ? 2.6 : fresh ? 1.8 : 1.2, (dx, dy, d) => C[d > 0.7 ? c - 2 : c]);
        if (hero) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) for (let i = 3; i <= 5; i++) p.px(x + dx * i, y + dy * i, C[i < 5 ? c - 1 : 4]);
      });
      parts.draw(p);
    },
  };
}
