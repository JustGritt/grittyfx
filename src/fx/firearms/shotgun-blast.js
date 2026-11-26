import { Rng, Particles, Lights, SMOKE, FIRE, EMBER } from '../../core/index.js';

export const meta = {
  name: 'Shotgun blast',
  desc: 'A shotgun fired: a wide fan of flame, pellets streaking out in a cone, burning flecks and a heavy cloud of smoke rolling forward',
  tags: ['firearm', 'military', 'gun', 'shotgun', 'blast', 'muzzle', 'flash', 'pellets', 'buckshot', 'spread', 'gunshot', 'fire', 'smoke'],
  size: [104, 72],
  origin: [30, 38],
  duration: 1,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, smoke: 6 },
  options: { palette: 'fire', smoke: 'smoke', seed: 1 },
  act: { windup: 0.1, hits: [{ t: 0, freeze: 0.07, shake: 2 }] },
  // Until the stage has a soldier, the archer fires it: the blast sits on its bow hand (FAR - 60 px, 21 px up).
  stage: { at: 'target', x: -60, ground: 21 },
  sound: [
    { t: 0, kind: 'shot', pitch: 0.7 },
    { t: 0, kind: 'crack', gain: 0.3, pitch: 0.35 }, // a heavier rumble rolling after it
  ],
};

// The fan: [angle, length, base width] of each petal, longest first so the short ones draw over them.
const FAN = [[0, 24, 8], [-0.32, 19, 5], [0.32, 19, 5], [-0.78, 12, 4], [0.78, 12, 4], [-1.5, 6, 3], [1.5, 6, 3], [Math.PI, 4, 3]];
const PELLETS = 9, TRAIL = 14; // px of streak behind each pellet

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

  lights.add(6, 0, 34, C[6], 1, 0.22);
  lights.add(3, 0, 14, C[7], 1, 0.08);
  // pellets, each in its own lane of the cone: angle, speed, life, how far out it starts
  const pellets = Array.from({ length: PELLETS }, (_, i) => ({
    a: ((i + rng.range(0.2, 0.8)) / PELLETS - 0.5) * 0.5, v: rng.range(440, 660), life: rng.range(0.08, 0.11), s0: rng.range(3, 9),
  }));
  for (let i = 0; i < 6; i++) { // the fan's flame rolling forward into the cloud
    const a = rng.range(-0.4, 0.4), v = rng.range(60, 140);
    parts.spawn(FIRE, 6 + i * 2.5, rng.range(-2, 2), Math.cos(a) * v, Math.sin(a) * v, rng.range(0.08, 0.13), { size: rng.range(2, 3.2), delay: 1 / 30 });
  }
  for (let i = 0; i < 11; i++) { // the cloud: a cone of big puffs, the far ones thrown furthest, rolling up as they thin
    const x = 2 + i * 2.4, a = rng.range(-0.35, 0.35), v = (20 + x * 1.5) * rng.range(0.9, 1.1), up = top ? 0 : rng.range(4, 14); // seen from above, nothing rises
    parts.spawn(SMOKE, x, rng.range(-3, 3), Math.cos(a) * v, Math.sin(a) * v - up, rng.range(0.6, 0.85), { size: rng.range(3.5, 5), delay: 0.04 + i * 0.006 });
  }
  for (let i = 0; i < 4; i++) { // burning flecks of wad and powder
    const a = rng.range(-0.35, 0.35), v = rng.range(70, 130);
    parts.spawn(EMBER, 8, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.3, 0.5), { delay: 1 / 30 });
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
      for (const q of pellets) { // a streak behind each pellet, slowing a little; it cools and shortens as its life ends
        if (t >= q.life) continue;
        const d = q.s0 + (q.v * (1 - Math.exp(-3 * t))) / 3, ca = Math.cos(q.a), sa = Math.sin(q.a), u = t / q.life;
        const tail = Math.max(q.s0, d - TRAIL * (u < 0.6 ? 1 : 1 - (u - 0.6) * 1.5)), cool = u > 0.75 ? 2 : u > 0.5 ? 1 : 0;
        p.line(ca * tail, sa * tail, ca * d, sa * d, s => step((s > 0.75 ? 7 : s > 0.35 ? 6 : 4.5) - cool));
      }
      if (t < 0.02) { // the hero frame: a white fan
        for (const [a, len, w] of FAN) petal(p, a, 0, len, w, (u, v) => step(u < 0.3 && v < 0.6 ? 7 : 7.2 - 3.4 * u - 1.6 * v));
        p.circle(1.5, 0.5, 3.5, C[7]);
      } else if (t < 0.05) { // the fan breaks up: the plume runs ahead, the petals shrink and cool
        petal(p, 0, 4, 21, 6, (u, v) => step(6.8 - 3.4 * u - 1.4 * v));
        for (const s of [-1, 1]) petal(p, s * 0.36, 2, 14, 4, (u, v) => step(6.2 - 3 * u - v));
        p.circle(1.5, 0.5, 2.4, C[6]);
      } else if (t < 0.085) { // what's left of it
        petal(p, 0, 10, 11, 3, (u, v) => step(5.2 - 2 * u - v));
      }
    },
  };
}
