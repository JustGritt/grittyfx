import { Rng, Lights, rand } from '../../core/index.js';

export const meta = {
  name: 'Splash',
  desc: 'Something hits the water: a white burst, a crown of water thrown up that collapses into a foam ring, a jet from the middle, droplets that arc out and ripple where they land',
  tags: ['water', 'splash', 'impact', 'hit', 'landing', 'droplets'],
  size: [84, 56],
  origin: [42, 40],
  duration: 1.2,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [84, 84] },
  ramps: { palette: 8 },
  options: { palette: 'water', seed: 1 },
  act: { hits: [{ t: 1 / 30, freeze: 0.04, shake: 1 }] },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 0.6 }, // the water thrown up, loudest as the crown peaks
    { t: 1 / 30, kind: 'thump', gain: 0.7, pitch: 0.8 }, // the plunge
    { t: 1 / 30, kind: 'crack', gain: 0.45, pitch: 0.55 }, // the splash's hiss
    { t: 0.55, kind: 'crack', gain: 0.12, pitch: 2.6 }, // the jet falling back, droplets landing
    { t: 0.64, kind: 'crack', gain: 0.08, pitch: 3 },
    { t: 0.75, kind: 'crack', gain: 0.06, pitch: 3.2 },
  ],
};

const TAU = Math.PI * 2;
const HIT = 1 / 30; // the white burst
const SQ = 0.3; // the water seen from the side: a circle on it is an ellipse this flat
const G = 400; // gravity, px/s^2
const LAND = 0.22; // how long a drop's landing mark lasts
const CROWN = 0.34, JET0 = 0.24, JET = 0.4;
const ease = u => 1 - (1 - u) ** 2;

// Everything lives on or over the water: x across, z into the picture (+ toward the viewer), h up. The side view sees
// the water at a slant, the top view straight down.
export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed, top = o.view === 'top';
  const at = (x, z, h = 0) => (top ? [x, z] : [x, z * SQ - h]);
  const lights = new Lights();
  lights.add(0, top ? 0 : -6, 20, C[6], 0.8, 0.3, { delay: HIT });

  const cols = Array.from({ length: 9 }, (_, k) => ({ a: ((k + rng.range(0.2, 0.8)) / 9) * TAU, h: rng.range(10, 17), lean: rng.range(2, 5) }));
  const drops = [], rings = [];
  const throwDrop = (x, z, h, vx, vz, vh, delay) => drops.push({ x, z, h, vx, vz, vh, delay });
  // spray at the burst, fast and high; then drops thrown off the crown's tips as it peaks; then the jet's top drop
  for (let i = 0; i < 8; i++) {
    const a = ((i + rng.range(0, 1)) / 8) * TAU, v = rng.range(18, 38);
    throwDrop(Math.cos(a) * 3, Math.sin(a) * 3, 2, Math.cos(a) * v, Math.sin(a) * v, rng.range(100, 150), HIT);
  }
  for (const c of cols) {
    const r = 4 + 8 * ease(0.3) + c.lean, v = rng.range(8, 24);
    throwDrop(Math.cos(c.a) * r, Math.sin(c.a) * r, c.h, Math.cos(c.a) * v, Math.sin(c.a) * v, rng.range(30, 70), HIT + 0.3 * CROWN);
  }
  throwDrop(0, 0, 21, rng.range(-6, 6), rng.range(-4, 4), 40, JET0 + 0.45 * JET);

  let n = 0, t = 0;

  // a ring on the water, broken where gap(segment) says so; front picks the half nearer the viewer (the top view draws
  // it whole with the front layer). Big rings keep their segments as they spread, so the gaps hold still.
  const circle = (p, x, z, r, front, c, gap = () => false) => {
    if (top && !front) return;
    const N = r < 5 ? 16 : 56;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      if (gap(i, N) || (!top && Math.sin((a0 + a1) / 2) > 0 !== front)) continue;
      p.line(...at(x + Math.cos(a0) * r, z + Math.sin(a0) * r), ...at(x + Math.cos(a1) * r, z + Math.sin(a1) * r), c);
    }
  };

  // where a drop lands: a fleck kicked up, then a ring a few px wide
  const land = (p, r, front) => {
    const u = r.age / LAND;
    if (u < 0.3) front && p.px(...at(r.x, r.z, 2 * (1 - u / 0.3)), C[7]);
    else circle(p, r.x, r.z, 1 + (top ? 1.2 : 2) * u, front, C[(front && !top ? 6 : 5) - Math.floor(u * 2.5)]);
  };

  // the crown: columns thrown up and out round a rim that spreads, rising fast, then slumping back
  const crown = (p, front) => {
    const c = (t - HIT) / CROWN;
    if (c <= 0 || c >= 1) return;
    const rr = 4 + 8 * ease(c), rise = c < 0.3 ? ease(c / 0.3) : 1 - ((c - 0.3) / 0.7) ** 1.4, cool = Math.floor(c * 3);
    for (const k of cols) {
      const near = Math.sin(k.a) > 0;
      if (!top && near !== front) continue;
      const cx = Math.cos(k.a), cz = Math.sin(k.a), tip = rr + k.lean * (0.5 + c);
      const [x0, y0] = at(cx * rr, cz * rr), [x1, y1] = at(cx * tip, cz * tip, k.h * rise);
      p.beam(x0, y0, x1, y1, 3 - 1.4 * c, (u, d) => C[Math.max(2, (u > 0.7 ? 7 : d > 0.6 ? 4 : 6) - cool - (near || top ? 0 : 1))]);
      if (c < 0.3) p.px(x1, y1, C[7]);
    }
    if (top) p.ring(0, 0, rr, 2.5 - c, (dx, dy, e) => C[(e > 0 ? 7 : 5) - cool]);
    else circle(p, 0, 0, rr, front, C[(front ? 7 : 5) - cool]);
  };

  // the jet: a column that pushes up out of the middle and falls back into it
  const jet = p => {
    const j = (t - JET0) / JET;
    if (j <= 0 || j >= 1) return;
    const h = 22 * 4 * j * (1 - j);
    if (top) {
      const r = 1 + 2.2 * Math.sin(Math.PI * j); // coming up toward the eye
      p.circle(0, 0, r + 0.6, C[4]);
      p.circle(0, 0, r, (dx, dy) => C[dx + dy < 0 ? 7 : 6]);
      return;
    }
    p.beam(0, 0, 0, -h, 3.4 - j, (u, d) => C[u > 0.85 ? 7 : d > 0.55 ? 4 : 6]);
    p.line(-1, -1, -1, -h + 1, u => C[u > 0.3 ? 7 : 6]); // the lit side
  };

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the burst lands exactly on its frame
      lights.update(dt);
      for (const q of drops) {
        if (q.delay > 0 && (q.delay -= dt) > 0) continue;
        q.vh -= G * dt;
        q.x += q.vx * dt;
        q.z += q.vz * dt;
        q.h += q.vh * dt;
        if (q.h <= 0) (q.dead = true), rings.push({ x: q.x, z: q.z, age: 0 });
      }
      for (const r of rings) r.age += dt;
      drops.splice(0, drops.length, ...drops.filter(q => !q.dead));
      rings.splice(0, rings.length, ...rings.filter(r => r.age < LAND));
    },
    drawBack(p) {
      lights.draw(p);
      if (!top) crown(p, false);
      // the foam ring, then a slow ripple, running out over the water
      const f = (t - HIT) / 0.5;
      if (f > 0 && f < 1) circle(p, 0, 0, 5 + 18 * ease(f), false, C[6 - Math.floor(f * 3)], i => rand(i, 1, s) < f * 0.6);
      const g = (t - 0.3) / 0.85;
      if (g > 0 && g < 1) circle(p, 0, 0, 8 + 22 * ease(g), false, C[5 - Math.floor(g * 3)], i => rand(i, 2, s) < 0.2 + g * 0.6);
      for (const r of rings) land(p, r, false);
    },
    draw(p) {
      if (t < HIT) {
        // the surface breaks: a dimple with a bright lip
        const [x, y] = at(0, 0);
        if (top) p.ring(x, y, 2.5, 1.5, C[6]);
        else p.ellipse(x, y, 4, 1.4, (dx, dy) => C[dy < 0 ? 2 : 6]);
        return;
      }
      if (t < HIT + 1 / 30) {
        // the hero frame: a white burst of spray, a white ring on the water
        p.glow(...at(0, 0, 6), 18, C[7], 0.9);
        for (let i = 0; i < 11; i++) {
          // streaks of spray fanning up and out, longest straight up; seen from above, a star round the hole
          const a = ((i + 0.5 * rand(i, s, 4)) / 11) * TAU, l = 8 + 7 * rand(i, s, 5);
          if (top) p.line(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * (l + 4), Math.sin(a) * (l + 4), u => C[u > 0.6 ? 6 : 7]);
          else {
            const sx = Math.cos(a), up = 0.4 + 0.6 * Math.abs(Math.sin(a));
            p.beam(sx * 3, -1, sx * l * 0.9, -2 - up * l * 1.2, i % 2 ? 2 : 3, (u, d) => C[d > 0.6 ? 5 : 7]); // a colored rim: it holds on a light background
          }
        }
        if (top) p.ring(0, 0, 5.5, 3, (dx, dy, e) => C[e > 0.4 ? 5 : 7]);
        else p.ellipse(0, 0, 10, 2.2, (dx, dy, d) => C[d > 0.75 ? 5 : 7]);
        return;
      }
      crown(p, true);
      const f = (t - HIT) / 0.5, g = (t - 0.3) / 0.85;
      if (f > 0 && f < 1) circle(p, 0, 0, 5 + 18 * ease(f), true, C[7 - Math.floor(f * 3)], i => rand(i, 1, s) < f * 0.6);
      if (g > 0 && g < 1) circle(p, 0, 0, 8 + 22 * ease(g), true, C[6 - Math.floor(g * 3)], i => rand(i, 2, s) < 0.2 + g * 0.6);
      for (const r of rings) land(p, r, true);
      jet(p);
      for (const q of drops) {
        if (q.delay > 0) continue;
        const [x, y] = at(q.x, q.z, q.h), [x0, y0] = at(q.x - q.vx * 0.025, q.z - q.vz * 0.025, q.h - q.vh * 0.025);
        if (top && q.h > 10) p.circle(x + 0.5, y + 0.5, 1.2, C[7]); // high up, nearer the eye
        else p.line(x0, y0, x, y, u => C[u > 0.5 ? 7 : 5]);
      }
    },
  };
}
