import { Rng, Particles, Lights, Bits, SPARK, SMOKE, FIRE, EMBER, DUST } from '../../core/index.js';

export const meta = {
  name: 'Small explosion',
  desc: 'A white flash, a fireball that cools into rolling smoke, sparks and chunks that bounce and kick up dust',
  tags: ['explosion', 'fire', 'smoke', 'debris', 'blast'],
  size: [124, 84],
  origin: [60, 64],
  duration: 1.6,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 6, dust: 5, debris: 4 },
  options: { palette: 'fire', smoke: 'smoke', dust: 'dust', debris: 'stone', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.05, shake: 4 }] },
};

const TAU = Math.PI * 2;
const CY = -12; // the fireball's center, above the ground at 0

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, D = o.debris;
  const parts = new Particles({ rng, palette: C, smoke: S, dust: o.dust, ground: 0 });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: 0,
    onLand: b => {
      if (b.vy < 60 || b.age > 0.8) return; // a hard landing, early enough for its dust to settle
      for (let i = 0; i < 2; i++) parts.spawn(DUST, b.x, -1, rng.range(-25, 25), rng.range(-12, -4), rng.range(0.35, 0.55), { size: rng.range(1.5, 2.5) });
    },
  });

  lights.add(0, CY, 30, C[7], 1, 0.14);
  lights.add(0, CY, 28, C[5], 0.8, 0.9, { delay: 0.04 });

  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, TAU), d = rng.range(0, 7), v = rng.range(15, 55);
    parts.spawn(FIRE, Math.cos(a) * d, CY + Math.sin(a) * d * 0.8, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 15, rng.range(0.35, 0.6), {
      size: rng.range(5, 9), delay: 0.03, smoke: rng.range(0.7, 0.9),
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), d = rng.range(3, 10);
    parts.spawn(SMOKE, Math.cos(a) * d, CY + Math.sin(a) * d, Math.cos(a) * 20, -10, rng.range(0.8, 1.1), { size: rng.range(5, 8), delay: rng.range(0.15, 0.3) });
  }
  for (let i = 0; i < 12; i++) {
    const a = rng.range(Math.PI * 1.05, Math.PI * 1.95), v = rng.range(60, 110);
    parts.spawn(SPARK, 0, CY, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.25, 0.45), { delay: 0.03 });
  }
  for (let i = 0; i < 8; i++) {
    parts.spawn(EMBER, rng.range(-10, 10), CY + rng.range(-6, 4), rng.range(-20, 20), rng.range(-50, -20), rng.range(0.6, 1.1), { delay: rng.range(0.05, 0.3) });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      parts.spawn(DUST, side * rng.range(4, 10), -1, side * rng.range(30, 70), rng.range(-8, -2), rng.range(0.5, 0.8), { size: rng.range(2.5, 4), delay: 0.04 });
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = rng.range(Math.PI * 1.2, Math.PI * 1.8), v = rng.range(55, 100);
    bits.spawn(0, CY, Math.cos(a) * v, Math.sin(a) * v, { c: i < 2 ? C[5] : D[rng.int(1, 2)], size: rng.range(2, 3.5), life: rng.range(1, 1.3), delay: 0.03 });
  }

  let t = 0;
  return {
    update(dt) {
      t += dt;
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    draw(p) {
      lights.draw(p);
      // light pooled on the floor; it comes up after the white flash, so the two lights never fight over a pixel
      const floor = Math.min(1, Math.max(0, (t - 0.1) / 0.06)) * Math.max(0, 1 - (t - 0.1) / 1) ** 2;
      if (floor > 0) p.glowLine(-30, -1, 30, -1, 6, C[5], 0.5 * floor);
      if (t < 0.07) p.circle(0, CY, 11 + t * 60, C[7]); // the white frame
      bits.draw(p);
      parts.draw(p);
    },
  };
}
