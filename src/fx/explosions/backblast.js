import { Rng, Particles, Lights, SMOKE, FIRE, DUST, rand } from '../../core/index.js';

export const meta = {
  name: 'Backblast',
  desc: 'The blast out of the back of a shoulder launcher as it fires: a cone of flame-lit gas jetting back, dust and grit torn off the floor behind the gunner, a smoke cloud that lingers and drifts away',
  tags: ['military', 'rocket', 'launcher', 'backblast', 'bazooka', 'blast', 'smoke', 'dust', 'fire'],
  size: [100, 64],
  origin: [86, 38],
  duration: 0.9,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 6, dust: 6 },
  options: { palette: 'fire', smoke: 'smoke', dust: 'dust', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0, shake: 2 }] },
  // The anchor is the back of a kneeling gunner's tube as he fires (his tip, the tube's mouth, is 24 px ahead of
  // it, 15 px over the floor); it blows out to the left, behind him.
  stage: { at: 'caster', pose: 'point', x: -11, ground: 15 },
  sound: [
    { t: 0, kind: 'thump', gain: 0.8, pitch: 0.5 }, // the low thump of the motor lighting
    { t: 0, kind: 'crack', gain: 0.35, pitch: 0.6 }, // its pop
    { t: 0, kind: 'whoosh', gain: 0.9, pitch: 0.6 }, // the gas rushing out the back
  ],
};

const FLOOR = 15; // the floor, below the tube's axis at y 0.5
const SPREAD = 0.3; // the cone's half-width per px back
const TILT = 0.12; // its axis dips this much per px back, toward the floor
const clamp01 = v => Math.max(0, Math.min(1, v));

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, s = o.seed;
  const parts = new Particles({ rng, palette: C, smoke: S, dust: W, ground: FLOOR });
  const lights = new Lights();

  lights.add(-8, 0.5, 16, C[7], 0.6, 0.1);
  lights.add(-18, 3, 22, C[5], 0.5, 0.3, { delay: 0.03 });

  // gas jetting back: hot puffs close behind the mouth that burn out into smoke, then a cloud thrown out along the
  // cone that slows, swells, rises a little and drifts
  for (let i = 0; i < 7; i++) {
    const a = ((i + rng.range(0, 1)) / 7 - 0.5) * 2 * SPREAD, v = rng.range(100, 170);
    parts.spawn(FIRE, -rng.range(3, 8), 0.5, -Math.cos(a) * v, (Math.sin(a) + TILT) * v, rng.range(0.08, 0.13), { size: rng.range(4.5, 6.5), smoke: rng.range(0.45, 0.55), delay: 0.02 });
  }
  for (let i = 0; i < 8; i++) {
    const d = rng.range(6, 34), y = 0.5 + d * TILT + rng.range(-1, 1) * d * SPREAD * 0.8;
    parts.spawn(SMOKE, -d, y, -rng.range(40, 120), rng.range(-12, 6), rng.range(0.55, 0.78), {
      size: rng.range(4, 6) + d * 0.06, delay: rng.range(0.02, 0.09), back: i % 3 === 0,
    });
  }
  // dust torn off the floor where the blast reaches it and thrown back low, farther back a little later
  for (let i = 0; i < 10; i++) {
    const d = 6 + (i / 9) * 36 + rng.range(-2, 2);
    parts.spawn(DUST, -d, FLOOR - 1, -rng.range(70, 160), -rng.range(4, 20), rng.range(0.4, 0.6), {
      size: rng.range(1.5, 3.5), delay: 0.02 + d * 0.0015, back: i % 2 === 0,
    });
  }
  // grit flung up off the floor and falling back
  const grit = [];
  for (let i = 0; i < 14; i++) {
    const d = rng.range(8, 36);
    grit.push({ x: -d, y: FLOOR - 1, vx: -rng.range(60, 150), vy: -rng.range(40, 95), delay: 0.02 + d * 0.0015, age: 0, life: rng.range(0.35, 0.55), c: W[rng.int(1, 3)] });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed
      parts.update(dt);
      lights.update(dt);
      for (const g of grit) {
        if ((g.delay -= dt) > 0) continue;
        g.age += dt;
        g.vy += 300 * dt;
        g.vx *= 1 - 2 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y >= FLOOR - 0.5) g.age = g.life; // lands and is gone
      }
    },
    drawBack(p) {
      parts.draw(p, 'back');
    },
    draw(p) {
      lights.draw(p);
      const fl = clamp01(t / 0.03) * Math.max(0, 1 - t / 0.45) ** 2; // light on the floor behind him
      if (fl > 0) p.glowLine(-40, FLOOR - 1, -4, FLOOR - 1, 5, C[5], 0.4 * fl);
      parts.draw(p);
      for (const g of grit) {
        if (g.delay > 0 || g.age >= g.life) continue;
        p.line(g.x - g.vx * 0.012, g.y - g.vy * 0.012, g.x, g.y, g.c, Math.min(1, (1 - g.age / g.life) / 0.3));
      }
      cone(p, t, C, s);
    },
  };
}

// The jet: a cone of flame out of the tube's back, white at the mouth, hottest on the first frame, each row a tongue
// of its own length so the far end is ragged, fading out along its last half and cooling as it breaks into the puffs.
function cone(p, t, C, s) {
  const u = t / 0.12;
  if (u >= 1) return;
  const len = 32 + 8 * (1 - (1 - u) ** 2), f = Math.floor(t * 30 + 1e-6), half = Math.ceil(len * SPREAD + 2);
  let fade = 0; // c runs before a for each pixel: c leaves the pixel's alpha here
  p.glowLine(-2, 0.5, -len * 0.7, 0.5 + len * 0.7 * TILT, 8, C[6], (v, d) => 0.5 * (1 - u) * (1 - v) * (1 - d) ** 2);
  p.shade(-Math.ceil(len) - 1, -half, Math.ceil(len) + 1, 2 * half + Math.ceil(len * TILT) + 1, (x, y) => {
    const X = -(x + 0.5), Y = y - X * TILT, w = 1.2 + X * SPREAD, reach = len * (0.65 + 0.35 * rand(y + 64, f, s)) * (1 - 0.3 * (Y / w) ** 2);
    if (X < 0 || X > reach || Math.abs(Y) > w || y >= FLOOR - 1) return 0;
    const v = X / reach, heat = (1 - v) * (1 - (0.5 * Math.abs(Y)) / w) * (1 - 0.45 * u) + 0.08;
    fade = (1 - u * u) * clamp01((1 - v) / 0.4);
    return C[heat > 0.72 ? 7 : heat > 0.52 ? 6 : heat > 0.36 ? 5 : heat > 0.22 ? 4 : 3];
  }, () => fade);
}
