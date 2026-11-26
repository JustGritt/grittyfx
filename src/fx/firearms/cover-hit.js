import { Rng, Particles, Lights, Bits, SPARK, DUST } from '../../core/index.js';

const GROUND = 8; // the floor, below the impact point
const HERO = 1 / 30;
const HOLE = 0.42; // the pock mark starts to fade
const POUR = [0.1, 0.36]; // sand trickling out of the hole: from, to

export const meta = {
  name: 'Cover hit',
  desc: 'A bullet burying itself in sandbags: a spray of sand and dust thrown back at the shooter, a few hot sparks, clods that fall and settle, a pock mark trickling sand',
  tags: ['firearm', 'military', 'impact', 'cover', 'sandbag', 'dust', 'bullet'],
  size: [52, 38],
  origin: [40, 24],
  duration: 0.6,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, sparks: 6 },
  options: { palette: 'dust', sparks: 'fire', seed: 1 },
  stage: { ground: GROUND, x: -14 }, // the shot misses: it lands in the cover in front of the goblin
  sound: [
    { t: 0, kind: 'crack', gain: 0.8, pitch: 1.5 }, // the gritty snap of the round going in
    { t: 0, kind: 'thump', gain: 0.6, pitch: 1.4 }, // dull, into packed sand
    { t: 0.3, kind: 'crack', gain: 0.08, pitch: 3 }, // clods landing
  ],
};

const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, F = o.sparks;
  const parts = new Particles({ rng, palette: F, dust: C, ground: GROUND });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: GROUND,
    onLand: b => {
      if (b.vy < 50 || b.age > 0.35) return;
      parts.spawn(DUST, b.x, GROUND - 1, rng.range(-12, 12), rng.range(-6, -2), rng.range(0.2, 0.28), { size: rng.range(1, 1.6), ramp: C.slice(1) });
    },
  });

  lights.add(0, 0, 6, F[5], 0.7, 0.07);
  lights.add(-2, 0, 10, F[3], 0.4, 0.16);

  // grains of sand: a fan thrown back at the shooter, mostly upward, falling as they slow
  const grains = [];
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + rng.range(-1, 0.3), v = rng.range(80, 170);
    grains.push({ x: -1, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rng.range(0.14, 0.32), age: -HERO / 2, c: rng.int(5, 7) });
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI + rng.range(-0.9, 0.3), v = rng.range(100, 150);
    parts.spawn(SPARK, -1, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.1, 0.2), { delay: HERO });
  }
  // the puff: bright sand thrown out ahead, darker dust hanging behind it
  for (let i = 0; i < 9; i++) {
    const lead = i < 5, a = Math.PI + rng.range(-0.75, 0.25), v = lead ? rng.range(90, 150) : rng.range(30, 70);
    parts.spawn(DUST, -2, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.3, 0.48), {
      size: lead ? rng.range(1.5, 2.4) : rng.range(2.4, 3.4), delay: HERO + (lead ? 0 : 0.02), ramp: C.slice(lead ? 3 : 2),
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + rng.range(-1.15, -0.35), v = rng.range(55, 95);
    bits.spawn(-1, 0, Math.cos(a) * v, Math.sin(a) * v, { c: C[rng.int(3, 4)], size: rng.range(2, 3), life: rng.range(0.44, 0.54), delay: HERO });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      for (const g of grains) {
        if ((g.age += dt) < 0) continue;
        g.vy += 300 * dt;
        g.vx *= 1 - 3 * dt;
        g.vy *= 1 - 3 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y > GROUND - 0.5) (g.y = GROUND - 0.5), (g.vy = 0), (g.vx *= 0.5); // grains hitting the floor stop there
      }
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      if (t > 0.55) return;
      // the pock mark: a hole glowing for a moment, then dark with a lit lower lip, fading out. No lip round the rest:
      // with no sandbag behind it, a ring and the stream under it read as a "?"
      const a = Math.min(1, (0.55 - t) / (0.55 - HOLE));
      for (const [x, y] of [[-1, 1], [0, 1]]) p.dot(x, y, C[5], a); // the lower lip, lit
      const hot = t < 0.05 ? F[5] : t < 0.1 ? F[3] : t < 0.14 ? F[1] : C[0];
      for (const [x, y] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) p.dot(x, y, hot, a);
      // sand trickling out of it: a thin stream falling to the floor, its head ahead and its tail let go
      const head = Math.min(GROUND, 1 + 150 * Math.max(0, t - POUR[0]) ** 2), tail = 1 + 150 * Math.max(0, t - POUR[1]) ** 2;
      for (let y = Math.max(2, Math.ceil(tail)); y < head; y++) if ((y + Math.floor(t * 90)) % 3 !== 0) p.px(0, y, C[y < 5 ? 5 : 4]);
    },
    draw(p) {
      lights.draw(p);
      if (t < HERO) {
        p.circle(0.5, 0.5, 1.4, F[5]);
        for (const [dx, dy] of [[-6, 0], [-4, -3], [-4, 3]]) p.line(0, 0, dx, dy, s => F[s < 0.5 ? 5 : 4]);
      } else if (t < 0.17) {
        // the spray: a fan of streaks flung back, the head running out and the tail catching up
        const u = (t - HERO) / (0.17 - HERO), head = 8 + 15 * out(t - HERO, 0.04), tail = head * (0.25 + 0.75 * u);
        for (const [a, l] of [[-0.9, 0.7], [-0.45, 1], [-0.1, 0.8], [0.3, 0.55]]) {
          const cx = -Math.cos(a), cy = Math.sin(a);
          p.line(cx * tail * l, cy * tail * l + u * u * 4, cx * head * l, cy * head * l + u * u * 6, s => C[s > 0.5 ? 7 : 6]);
        }
        if (u < 0.4) p.circle(0.5, 0.5, 2 * (1 - u / 0.4), F[4]);
      }
      bits.draw(p);
      parts.draw(p);
      for (const g of grains) {
        if (g.age < 0 || g.age >= g.life) continue;
        const k = 0.035, a = Math.min(1, (g.life - g.age) / 0.08);
        p.line(g.x - g.vx * k, g.y - g.vy * k, g.x, g.y, s => C[s > 0.5 ? g.c : g.c - 2], a);
      }
    },
  };
}
