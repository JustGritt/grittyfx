import { Rng, Particles, Lights, SMOKE, FIRE } from '../../core/index.js';

export const meta = {
  name: 'Muzzle flash',
  desc: "A rifle's shot at the muzzle: a white star of flame for a frame, petals licking forward, a puff of smoke that drifts and thins",
  tags: ['firearm', 'military', 'gun', 'rifle', 'muzzle', 'flash', 'shot', 'gunshot', 'fire', 'smoke'],
  size: [72, 60],
  origin: [24, 30],
  duration: 0.8,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, smoke: 6 },
  options: { palette: 'fire', smoke: 'smoke', seed: 1 },
  act: { windup: 0.1, hits: [{ t: 0, freeze: 0.04, shake: 0 }] },
  // Until the stage has a soldier, the archer shoots it: the flash sits on its bow hand (FAR - 60 px, 21 px up), the goblin
  // flinching as the round lands at once.
  stage: { at: 'target', x: -60, ground: 21 },
  sound: [{ t: 0, kind: 'shot', pitch: 1.1 }],
};

// The star: [angle, length, base width] of each petal, longest first so the short ones draw over them.
const STAR = [[0, 20, 5], [-0.6, 12, 3.2], [0.6, 12, 3.2], [-1.55, 7, 2.4], [1.55, 7, 2.4], [Math.PI, 4, 2]];

// A petal of flame from the muzzle along angle a, starting r0 px out: a pointed leaf `w` px wide near its base, `len`
// long. The bore's axis runs along pixel row 0. heat(u, v) picks the step from u (0 at the base, 1 at the tip) and v (0
// on the axis, 1 at the edge).
function petal(p, a, r0, len, w, heat) {
  const ca = Math.cos(a), sa = Math.sin(a), R = Math.ceil(r0 + len + w);
  p.shade(-R, -R, 2 * R, 2 * R, (x, y) => {
    const X = x + 0.5, u = (X * ca + y * sa - r0) / len;
    if (u < 0 || u > 1) return 0;
    const hw = (w / 2) * (u < 0.3 ? 0.6 + (0.4 * u) / 0.3 : ((1 - u) / 0.7) ** 0.8) + 0.15, d = Math.abs(y * ca - X * sa);
    return d <= hw ? heat(u, d / hw) : 0;
  });
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, top = o.view === 'top';
  const parts = new Particles({ rng, palette: C, smoke: o.smoke, top });
  const lights = new Lights();
  const step = h => C[Math.max(0, Math.min(7, Math.round(h)))];

  lights.add(4, 0, 26, C[6], 1, 0.16);
  lights.add(2, 0, 10, C[7], 1, 0.06);
  for (let i = 0; i < 3; i++) { // tongues of flame thrown forward
    const a = rng.range(-0.35, 0.35), v = rng.range(90, 150);
    parts.spawn(FIRE, 6 + i * 3, rng.range(-1, 1), Math.cos(a) * v, Math.sin(a) * v, rng.range(0.07, 0.11), { size: rng.range(1.2, 1.9), delay: 1 / 30 });
  }
  for (let i = 0; i < 9; i++) { // the puff: one ragged cloud along the plume, faster the further out, drifting up as it thins
    const x = 1 + i * 1.8, v = (16 + x * 1.4) * rng.range(0.85, 1.15);
    parts.spawn(SMOKE, x, rng.range(-1.5, 1.5), v, top ? rng.range(-5, 5) : rng.range(-16, -2), rng.range(0.45, 0.7), { size: rng.range(1.8, 2.8), delay: 0.04 + i * 0.006 });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      parts.draw(p);
      if (t < 0.02) { // the hero frame: a white star
        for (const [a, len, w] of STAR) petal(p, a, 0, len, w, (u, v) => step(u < 0.3 && v < 0.6 ? 7 : 7.2 - 3.4 * u - 1.6 * v));
        p.circle(1.5, 0.5, 2.4, C[7]);
      } else if (t < 0.05) { // the star breaks up: the plume runs ahead, the petals shrink and cool
        petal(p, 0, 3, 17, 4, (u, v) => step(6.6 - 3.4 * u - 1.4 * v));
        for (const s of [-1, 1]) petal(p, s * 0.45, 1.5, 9, 2.6, (u, v) => step(6 - 3 * u - v));
        p.circle(1.5, 0.5, 1.6, C[6]);
      } else if (t < 0.085) { // what's left of it
        petal(p, 0, 8, 8, 2, (u, v) => step(5 - 2 * u - v));
      }
    },
  };
}
