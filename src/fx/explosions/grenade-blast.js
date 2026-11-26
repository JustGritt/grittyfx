import { Rng, Particles, Lights, Bits, SMOKE, FIRE, EMBER, DUST } from '../../core/index.js';

export const meta = {
  name: 'Grenade blast',
  desc: 'A frag grenade going off on the floor: a white flash for a frame, a short tight fireball, shrapnel streaking out every way and skipping along the floor, a kick of dirt and grit, a low dust ring rolling out and a puff of smoke rising and thinning',
  tags: ['explosion', 'military', 'grenade', 'frag', 'shrapnel', 'blast', 'fire', 'smoke', 'debris', 'dust'],
  size: [136, 96],
  origin: [68, 70],
  duration: 1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 8, dust: 6, debris: 4 },
  options: { palette: 'fire', smoke: 'smoke', dust: 'dust', debris: 'stone', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.08, shake: 5 }] },
  stage: { ground: 0 },
  sound: [
    { t: 0, kind: 'crack', gain: 1, pitch: 1.3 }, // the hard crack
    { t: 0, kind: 'thump', gain: 0.9, pitch: 0.7 }, // the thump under it
    { t: 0, kind: 'crack', gain: 0.45, pitch: 0.45 }, // a short rumble
    { t: 0.34, kind: 'crack', gain: 0.1, pitch: 3 }, // grit pattering down
    { t: 0.47, kind: 'crack', gain: 0.07, pitch: 3.4 },
  ],
};

const TAU = Math.PI * 2;
const CY = -6; // the burst's center: the grenade lies on the floor at 0
const HERO = 1 / 30;
const clamp01 = v => Math.max(0, Math.min(1, v));

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, D = o.debris;
  const parts = new Particles({ rng, palette: C, smoke: S.slice(1, 7), dust: W, ground: 0 });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: 0,
    onLand: b => b.vy > 60 && b.age < 0.45 && parts.spawn(DUST, b.x, -1, rng.range(-20, 20), rng.range(-10, -3), rng.range(0.25, 0.4), { size: rng.range(1.2, 2) }),
  });

  lights.add(0, CY, 30, C[7], 1, 0.1);
  lights.add(0, CY, 24, C[5], 0.7, 0.35, { delay: 0.04 });

  // the fireball: a few tight puffs, burnt out in a blink
  for (let i = 0; i < 9; i++) {
    const a = ((i + rng.range(0, 1)) / 9) * TAU, d = rng.range(0, 4), v = rng.range(30, 75);
    parts.spawn(FIRE, Math.cos(a) * d, CY + Math.sin(a) * d * 0.7, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 25, rng.range(0.16, 0.28), {
      size: rng.range(4, 6.5), delay: HERO, smoke: i % 2 ? 0 : rng.range(0.45, 0.55),
    });
  }
  // the smoke puff left behind, rising and thinning
  for (let i = 0; i < 5; i++) {
    const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), d = rng.range(2, 7);
    parts.spawn(SMOKE, Math.cos(a) * d, CY - 3 + Math.sin(a) * d, Math.cos(a) * 18, -rng.range(50, 75), rng.range(0.62, 0.74), {
      size: rng.range(5, 7), delay: rng.range(0.12, 0.22), back: true,
    });
  }
  for (let i = 0; i < 5; i++) {
    parts.spawn(EMBER, rng.range(-8, 8), CY + rng.range(-5, 3), rng.range(-25, 25), rng.range(-50, -20), rng.range(0.4, 0.7), { delay: rng.range(0.05, 0.2) });
  }
  // the dust ring: puffs rolling out low along the floor both ways
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      parts.spawn(DUST, side * rng.range(3, 8), -1, side * rng.range(70, 150), -rng.range(2, 9), rng.range(0.45, 0.7), {
        size: rng.range(2, 3.5), delay: HERO + i * 0.01,
      });
    }
  }
  // clods of dirt kicked up and falling back
  for (let i = 0; i < 8; i++) {
    const a = rng.range(-0.75, 0.75), v = rng.range(70, 125);
    bits.spawn(rng.range(-2, 2), -2, Math.sin(a) * v, -Math.cos(a) * v, { c: i % 3 ? W[rng.int(1, 2)] : D[rng.int(1, 2)], size: rng.range(1.5, 2.5), life: rng.range(0.75, 0.9), delay: HERO });
  }

  // Shrapnel: thin hot streaks, one per slot round the circle so they fan out evenly, slowed by the air; those flung
  // down skip along the floor. Grit: dark grains thrown up in a cone and raining back.
  const fly = [];
  for (let i = 0; i < 24; i++) {
    const a = ((i + rng.range(0, 1)) / 24) * TAU, v = rng.range(360, 520);
    fly.push({ x: 0, y: CY, sx: 0, sy: CY, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.85, life: rng.range(0.16, 0.28), age: 0, hot: true, drag: 8, g: 150, k: rng.range(0.05, 0.08) });
  }
  for (let i = 0; i < 22; i++) {
    const a = rng.range(-0.6, 0.6), v = rng.range(90, 180);
    fly.push({ x: rng.range(-3, 3), y: -2, vx: Math.sin(a) * v, vy: -Math.cos(a) * v, life: rng.range(0.5, 0.7), age: 0, c: W[rng.int(2, 4)], drag: 1, g: 300, k: 0.02 });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
      for (const f of fly) {
        f.age += dt;
        f.vy += f.g * dt;
        f.vx *= 1 - f.drag * dt;
        f.vy *= 1 - f.drag * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y >= -0.5) {
          if (!f.hot) f.age = f.life; // grit lands and is gone
          f.y = -0.5;
          f.vy = -Math.abs(f.vy) * 0.3;
          f.vx *= 0.8;
        }
      }
    },
    drawBack(p) {
      parts.draw(p, 'back');
      // the scorch: white hot for a moment, cooling to a dark smudge
      const k = t - HERO;
      if (k > 0) {
        const heat = k < 0.05 ? 6 : k < 0.12 ? 5 : k < 0.2 ? 4 : k < 0.3 ? 3 : 0, a = clamp01((0.95 - t) / 0.3);
        p.ellipse(0.5, -1, 8, 1.5, heat ? C[heat - 1] : S[1], a);
        if (heat) p.ellipse(0.5, -1, 4, 1, C[heat], a);
      }
    },
    draw(p) {
      lights.draw(p);
      const floor = clamp01((t - 0.08) / 0.04) * Math.max(0, 1 - (t - 0.08) / 0.5) ** 2; // after the flash
      if (floor > 0) p.glowLine(-24, -1, 24, -1, 6, C[5], 0.45 * floor);
      bits.draw(p);
      parts.draw(p);
      for (const f of fly) {
        if (t < HERO || f.age >= f.life) continue;
        const h = 1 - f.age / f.life;
        if (f.hot) { // a streak drawn long for its speed, never back past where it started
          const v = Math.hypot(f.vx, f.vy), L = Math.min(v * f.k, 0.8 * Math.hypot(f.x - f.sx, f.y - f.sy), 22);
          const tx = f.x - (f.vx / v) * L, ty = Math.min(-0.5, f.y - (f.vy / v) * L);
          const head = C[h > 0.5 ? 7 : h > 0.25 ? 6 : 5], tail = C[h > 0.5 ? 5 : 4];
          p.line(tx, ty, f.x, f.y, u => (u > 0.6 ? head : tail), Math.min(1, h / 0.3));
          p.light(f.x, f.y, C[5], 0.5 * h);
        } else p.line(f.x - f.vx * f.k, Math.min(-0.5, f.y - f.vy * f.k), f.x, f.y, f.c, Math.min(1, h / 0.3));
      }
      flash(p, t, C, W);
    },
  };
}

// The white frame: a hot core and a star of thin rays, then the core shrinking away and a ring of dust racing out
// along the floor, flat from the low view.
function flash(p, t, C, W) {
  if (t < HERO) {
    p.circle(0, CY, 9, C[7]);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI + (i % 2 ? 0.12 : -0.08), l = i % 2 ? 16 : 26;
      p.line(0, CY, Math.cos(a) * l, CY + Math.sin(a) * l, C[7]);
    }
    p.ellipse(0.5, -1, 26, 1.5, C[7]);
    return;
  }
  const u = (t - HERO) / 0.22;
  if (u >= 1) return;
  if (u < 0.3) p.circle(0, CY, 8 * (1 - u / 0.3), C[7]);
  const rx = 10 + 38 * (1 - (1 - u) ** 3), ry = Math.min(3, rx * 0.1);
  p.shade(-rx - 2, -ry - 3, 2 * rx + 4, 2 * ry + 4, (x, y) => {
    const dx = (x + 0.5) / rx, dy = (y + 1.5) / ry, d = Math.hypot(dx, dy);
    return Math.abs(d - 1) < 0.08 + 0.1 * (1 - u) ? W[dy > 0 ? 5 : 3] : 0;
  }, 1 - u * u);
}
