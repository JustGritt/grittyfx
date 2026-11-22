import { Rng, Lights, Bits, rand } from '../../core/index.js';

export const meta = {
  name: 'Frost burst',
  desc: 'Cold gathers, then a crown of ice spikes bursts from the ground with flying shards and a frost ring; the spikes shatter and a cold mist settles',
  tags: ['magic', 'ice', 'frost', 'nova', 'spell'],
  size: [80, 60],
  origin: [40, 46],
  duration: 1.3,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  act: { hits: [{ t: 0.12, freeze: 0.05, shake: 2 }] },
};

const TAU = Math.PI * 2;
const BURST = 0.12;
const SHATTER = 0.5;
const F = 1 / 30;
const ease = u => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2; // ease-out with a little overshoot

// A flat ellipse on the ground; front is the half nearer the viewer.
function ellipse(p, rx, ry, front, c, a = 1) {
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 === front) p.line(Math.cos(a0) * rx, Math.sin(a0) * ry, Math.cos(a1) * rx, Math.sin(a1) * ry, c, a);
  }
}

// An ice spike: a kite from its base on the ground to the tip, a lit face up-left and a shadowed one.
function spike(p, k, len, C, hot) {
  const dx = Math.cos(k.a), dy = Math.sin(k.a), sh = 0.3 * len, R = len + 1;
  p.shade(Math.floor(k.x - R), Math.floor(-R), 2 * R + 1, R + 2, (px, py) => {
    const x = px + 0.5 - k.x, y = py + 0.5, u = x * dx + y * dy, v = y * dx - x * dy;
    const half = u < sh ? k.w * (0.45 + (0.55 * u) / sh) : k.w * (1 - (u - sh) / (len - sh));
    if (u < 0 || u > len || Math.abs(v) > half || y > 0.5) return 0;
    if (hot || u > len - 2) return C[7];
    const lit = (dy - dx) * Math.sign(v) > 0, edge = Math.abs(v) > half - 1;
    return lit ? C[edge ? 7 : 6] : C[edge ? 3 : 4];
  });
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed;
  const lights = new Lights();
  const bits = new Bits({ rng, ground: 0 });
  const mist = [];
  const puff = (x, vx, r, life, delay, back) => mist.push({ x, y: -1, vx, r, life, delay, back, age: 0 });

  const specks = Array.from({ length: 7 }, () => ({ a: rng.range(0, TAU), r: rng.range(14, 22) }));
  const spikes = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI * (0.18 + (0.64 * i) / 4) + rng.range(-0.08, 0.08);
    return { a, x: Math.cos(a) * 3, w: rng.range(2.6, 3.4), len: (10 + 12 * Math.sin(-a)) * rng.range(0.9, 1.1), delay: 0.015 * Math.abs(i - 2), at: SHATTER + 0.03 * rng.int(0, 4) };
  });
  const frost = Array.from({ length: 16 }, () => {
    const a = rng.range(0, TAU), d = Math.sqrt(rng.range(0.05, 1));
    return { x: Math.cos(a) * d * 27, y: Math.sin(a) * d * 6.5, d, l: rng.int(1, 3), end: rng.range(0.85, 1.2), glint: rng.chance(0.35) };
  });

  lights.add(0, -10, 22, C[5], 0.8, 0.8, { delay: BURST + F });
  for (let i = 0; i < 8; i++) {
    const a = rng.range(-Math.PI * 0.85, -Math.PI * 0.15), v = rng.range(70, 110);
    bits.spawn(Math.cos(a) * 3, -3, Math.cos(a) * v * 0.5, Math.sin(a) * v, { c: C[rng.int(5, 7)], size: rng.range(2.5, 4), life: rng.range(0.7, 1), shard: true, delay: BURST });
  }
  for (const k of spikes) {
    for (let j = 1; j <= 2; j++) {
      const u = j / 2.5, x = k.x + Math.cos(k.a) * k.len * u, y = Math.sin(k.a) * k.len * u;
      bits.spawn(x, y, Math.cos(k.a) * rng.range(15, 40), rng.range(-45, -15), { c: C[rng.int(4, 6)], size: rng.range(2.5, 3.5), life: rng.range(0.45, 0.6), shard: true, delay: k.at });
    }
    puff(k.x, Math.cos(k.a) * 25, rng.range(3, 4), rng.range(0.5, 0.65), k.at, k.a > -Math.PI / 2);
  }
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1;
    puff(side * rng.range(2, 6), side * rng.range(30, 70), rng.range(3, 5), rng.range(0.8, 1.05), BURST + rng.range(0, 0.1), i % 4 < 2);
  }

  let n = 0, t = 0;
  const spread = () => 1 - (1 - Math.min(1, (t - BURST) / 0.4)) ** 3;
  const ring = (p, front) => {
    const v = (t - BURST) / 0.4;
    if (v < 0 || v >= 1) return;
    const rx = 5 + 25 * spread();
    ellipse(p, rx, rx * 0.25, front, C[(front ? 7 : 6) - Math.floor(v * 3)], Math.min(1, (1 - v) / 0.3));
  };
  // frost the ring leaves on the ground: short glinting dashes that melt away one by one
  const frosts = (p, front) => {
    if (t < BURST) return;
    for (const [i, q] of frost.entries()) {
      const age = t - BURST - q.d * 0.4;
      if (q.y > 0 !== front || q.d > spread() || t > q.end) continue;
      p.line(q.x - 1, q.y, q.x - 1 + q.l, q.y, C[age < 0.15 ? 6 : t > q.end - 0.2 ? 3 : 5]);
      if (q.glint && rand(i, Math.floor(t / F / 2), s) < 0.15) {
        for (const [dx, dy] of [[0, 1], [0, -1]]) p.px(q.x, q.y + dy, C[5]);
        p.px(q.x, q.y, C[7]);
      }
    }
  };
  // cold mist: thin puffs that roll out low, swell and sink onto the ground
  const mists = (p, back) => {
    for (const q of mist) {
      if (q.delay > 0 || q.back !== back) continue;
      const u = q.age / q.life, r = q.r * (1 + 0.9 * u), a = 0.55 * (1 - u) ** 1.5 * Math.min(1, q.age / 0.08);
      p.disc(q.x, q.y - r * 0.3, r, (dx, dy) => C[dy < -r * 0.3 ? 5 : 4], (dx, dy, d) => a * (1 - d * d));
    }
  };

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the burst lands exactly on its frame
      lights.update(dt);
      bits.update(dt);
      for (const q of mist) {
        if (q.delay > 0) {
          q.delay -= dt;
          continue;
        }
        q.age += dt;
        q.vx *= 1 - 3 * dt;
        q.x += q.vx * dt;
      }
    },
    drawBack(p) {
      lights.draw(p);
      if (t < BURST) p.glow(0, -3, 3 + 6 * (t / BURST), C[5], 0.3 + 0.4 * (t / BURST));
      else if (t < BURST + F) p.glow(0, -8, 20, C[7], 1);
      else p.glowLine(-14, -1, 14, -1, 9, C[5], 0.35 * Math.max(0, 1 - (t - BURST) / 1.1) ** 2); // cold light pooled on the ground
      ring(p, false);
      frosts(p, false);
      mists(p, true);
    },
    draw(p) {
      if (t < BURST) {
        // the cold gathers: specks streak in, faster and faster
        const u = t / BURST;
        for (const q of specks) {
          const r = q.r * (1 - u * u), x = Math.cos(q.a) * r, y = -3 + Math.sin(q.a) * r * 0.6;
          p.line(x, y, x + Math.cos(q.a) * 3, y + Math.sin(q.a) * 1.8, C[5]);
          p.px(x, y, C[7]);
        }
        p.px(0, -3, C[7]);
        return;
      }
      for (const k of spikes) {
        const g = Math.min(1, (t - BURST - k.delay) / 0.07);
        if (g > 0 && t < k.at) spike(p, k, k.len * ease(g), C, t > k.at - F);
      }
      if (t < BURST + F) {
        p.circle(0.5, -3.5, 5, C[7]); // the white frame, hugging the ground
        p.beam(-13, -0.5, 13, -0.5, 2, C[7]);
      }
      ring(p, true);
      frosts(p, true);
      bits.draw(p);
      mists(p, false);
    },
  };
}
