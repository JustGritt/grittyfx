import { Rng, Particles, Lights, Bits, DUST, rand } from '../../core/index.js';

export const meta = {
  name: 'Spike',
  desc: 'The floor cracks and trembles under the target, then a cluster of jagged spikes stabs up through it throwing debris and dust, holds, and crumbles into falling chunks',
  tags: ['earth', 'rock', 'spike', 'eruption', 'magic', 'spell'],
  size: [88, 64],
  origin: [44, 52],
  duration: 1.3,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, dust: 5 },
  options: { palette: 'stone', dust: 'dust', seed: 1 },
  act: { hits: [{ t: 0.24, freeze: 0.07, shake: 3 }] },
  stage: { at: 'target', ground: 0 }, // bursts from the floor under the goblin
  sound: [
    { t: 0, kind: 'crack', gain: 0.35, pitch: 0.3 }, // the ground rumbling
    { t: 0.24, kind: 'crack', gain: 0.9, pitch: 0.9 }, // the spikes stab up
    { t: 0.24, kind: 'thump', gain: 0.8, pitch: 0.7 },
    { t: 0.7, kind: 'crack', gain: 0.4, pitch: 1.6 }, // they crumble
    { t: 0.78, kind: 'crack', gain: 0.25, pitch: 2.2 },
  ],
};

const HIT = 0.24;
const F = 1 / 30;
const FLAT = 0.4; // the floor seen from a low angle
const ease = u => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2; // out, with a little overshoot

// A rock spike leaning by `a` (0 is straight up): a jagged wedge from its base to the tip in three facets, lit from
// up-left (a broad face, the bright one by the ridge, the shadowed one past it), outlined dark. `rise` pushes it up out
// of the floor (0 to 1), `top` is how much of it is left as it crumbles from the tip down (1 to 0). Below the floor it
// isn't drawn.
function spike(p, k, rise, top, C, hot) {
  const sa = Math.sin(k.a), ca = Math.cos(k.a), sink = k.h * (1 - rise), keep = k.h * top, R = k.h + k.w;
  p.shade(Math.floor(k.x - R), -R - 1, 2 * R + 2, R + 2, (px, py) => {
    const x = px + 0.5 - k.x, y = py + 0.5;
    if (y > 0.5) return 0;
    const u = -(y - sink) * ca + x * sa, v = x * ca + (y - sink) * sa; // up the spike, across it
    if (u < -2 || u > keep) return 0;
    const q = Math.max(0, u) / k.h, side = v < 0 ? 0 : 1, jag = 1.6 * (rand(k.i, Math.floor(u / 4), side) - 0.4) * (1 - q);
    const half = (k.w / 2) * (1 - q) ** 0.9 + jag;
    if (Math.abs(v) > half) return 0;
    const ridge = k.ridge * half, edge = half - Math.abs(v) < 1, cut = u > keep - 1.5 && top < 1;
    if (hot) return C[edge ? 6 : 7];
    if (edge) return C[2];
    if (cut || u < 1.5) return C[3]; // the broken top, the base in the floor's shade
    if (v > ridge) return C[q > 0.75 ? 5 : 4];
    if (v > ridge - half * 0.45) return C[q > 0.7 ? 7 : 6];
    return C[q > 0.8 ? 6 : 5];
  });
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed;
  const parts = new Particles({ rng, palette: C, dust: o.dust, ground: 0 });
  const lights = new Lights();
  const bits = new Bits({ rng, ground: 0, gravity: 480 });

  // the cluster: the tallest in the middle, smaller ones leaning out to either side
  const spikes = [[0, 0, 28, 12], [-8, -0.3, 19, 9], [8, 0.34, 21, 9], [-15, -0.62, 11, 7], [15, 0.6, 12, 7]].map(([x, a, h, w], i) => ({
    i: i + s * 5, x: x + rng.range(-1, 1), a: a + rng.range(-0.08, 0.08), h: h * rng.range(0.9, 1.08), w, ridge: rng.range(-0.1, 0.25),
    at: HIT + [0, 0.03, 0.02, 0.06, 0.05][i], crumble: 0.68 + rng.range(0, 0.12),
  }));
  // the crack the spikes come through: two lines wandering out over the floor
  const crack = [-1, 1].map(side => {
    const pts = [[0, 0]];
    for (let x = 0, z = 0; x < 16; ) (x += rng.range(2.5, 4)), (z = Math.max(-6, Math.min(6, z + rng.range(-3, 3)))), pts.push([side * x, z * FLAT]);
    return pts;
  });
  // grit hopping on the trembling floor before the burst
  for (let i = 0; i < 12; i++) {
    const x = rng.range(-14, 14);
    bits.spawn(x, 0, rng.range(-8, 8), -rng.range(50, 80), { c: C[rng.int(4, 6)], size: 1.5, life: 0.22, delay: rng.range(0.02, HIT - 0.22) });
  }

  lights.add(0, -12, 22, C[7], 1, 0.25, { delay: HIT });
  for (const k of spikes) {
    // debris thrown up as each spike breaks the floor
    for (let j = 0; j < 3; j++) {
      const a = k.a * 0.6 + rng.range(-0.6, 0.6) - Math.PI / 2, v = rng.range(90, 150);
      bits.spawn(k.x, -1, Math.cos(a) * v * 0.35, Math.sin(a) * v, { c: C[rng.int(2, 5)], size: rng.range(1.5, 3), life: rng.range(0.6, 0.85), delay: k.at });
    }
    // chunks of it falling as it crumbles from the tip down
    for (let j = 0; j < 4; j++) {
      const u = k.h * (0.9 - j * 0.22), x = k.x + Math.sin(k.a) * u, y = -Math.cos(k.a) * u;
      bits.spawn(x, y, rng.range(-20, 20) + Math.sin(k.a) * 30, rng.range(-30, 0), { c: C[rng.int(2, 5)], size: rng.range(2, 3.5), life: rng.range(0.28, 0.36), delay: k.crumble + j * 0.03 });
    }
    for (let j = 0; j < 2; j++) parts.spawn(DUST, k.x + Math.sin(k.a) * k.h * (0.3 + 0.4 * j), -2 - Math.cos(k.a) * k.h * (0.3 + 0.4 * j), rng.range(-25, 25), rng.range(-5, 10), rng.range(0.3, 0.4), { size: rng.range(1.2, 1.8), delay: k.crumble + 0.04 * j, ramp: C.slice(2) }); // rock dust
  }
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    parts.spawn(DUST, side * rng.range(4, 12), -1, side * rng.range(30, 80), -rng.range(8, 25), rng.range(0.35, 0.55), { size: rng.range(1.2, 2.2), delay: HIT + rng.range(0, 0.08), back: i % 2 === 0 });
  }

  let n = 0, t = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the burst lands on its frame
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      // the crack: opening and glowing as the ground gives, then dark as the spikes stand in it, fading at the end
      const open = Math.min(1, t / (HIT * 0.8)), a = Math.min(1, (1.2 - t) / 0.25);
      if (a <= 0) return;
      if (t < HIT) p.glowLine(-10 * open, 0, 10 * open, 0, 5 + 3 * open, C[6], 0.25 + 0.35 * open * (rand(Math.floor(t / F), 3, s) < 0.5 ? 1 : 0.7));
      for (const pts of crack) {
        const n = Math.max(2, Math.ceil(pts.length * open));
        p.polyline(pts.slice(0, n).map(([x, y]) => [x, y + 1]), C[1], a); // the dark lip under it
        p.polyline(pts.slice(0, n), C[t < HIT ? 6 : 1], a);
      }
      if (t >= HIT && t < 0.8) p.ellipse(0.5, 0, 15, 1.5, C[1]); // the floor broken open round the spikes
    },
    draw(p) {
      lights.draw(p);
      for (const k of spikes) {
        const g = (t - k.at) / 0.06;
        if (g <= 0 || t > k.crumble + 0.12) continue;
        const top = 1 - Math.max(0, (t - k.crumble) / 0.12);
        spike(p, k, ease(Math.min(1, g)), top, C, t < HIT + F);
      }
      if (t >= HIT && t < HIT + F) {
        p.ellipse(0.5, -0.5, 16, 2.5, C[7]); // the floor bursting
        p.glow(0, -8, 16, C[7], 1);
      }
      bits.draw(p);
      parts.draw(p);
    },
  };
}
