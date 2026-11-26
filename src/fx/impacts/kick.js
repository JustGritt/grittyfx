import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Kick',
  desc: 'A fast roundhouse at chest height: the foot sweeps a flat arc round in front of the kicker and into the target, a white pop where it lands throws out a wide broken ring and sparks, the arc swinging on past behind it',
  tags: ['kick', 'unarmed', 'melee', 'impact', 'hit', 'arc'],
  size: [76, 60],
  origin: [38, 30],
  duration: 0.42,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  act: { windup: 0.2, hits: [{ t: 2 / 30, freeze: 0.08, shake: 4 }] },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.8, pitch: 1.8 }, // the leg swinging round, loudest as it lands
    { t: 2 / 30, kind: 'crack', gain: 0.7, pitch: 1.6 },
    { t: 2 / 30, kind: 'thump', gain: 0.7, pitch: 1.2 },
  ],
};

const TAU = Math.PI * 2;
const HIT = 2 / 30; // the foot lands
// The foot's path: a flat ellipse at chest height, the kicker's hip at its middle, seen a little from above, so its
// near half is lower on screen and its far half higher; it ends at the target (0, 0). Angles run clockwise from +x.
const CX = -14, CY = 0, RX = 14, RY = 7;
const A0 = Math.PI + 0.55, A1 = -0.3; // from behind the kicker, round the near side, past the target behind it
const PRE = 0.03; // the swing is under way on the first frame
const LAG = 0.08; // the smear's tail follows the foot this far behind, and its afterimage twice as far
const W = 5; // the smear's widest, px
const clamp01 = v => Math.max(0, Math.min(1, v));

// The foot's angle: speeding up round the near side into the target, then slowing as it swings on behind it.
function head(t) {
  if (t < HIT) return A0 - A0 * clamp01((t + PRE) / (HIT + PRE)) ** 1.3;
  return A1 * (1 - (1 - clamp01((t - HIT) / 0.12)) ** 2);
}

// The smear between the tail's angle and the head's: a crescent inside the foot's path, a constant width in px however
// flat the ellipse, white at the path and toward the foot, frayed into streaks toward the tail; behind it, back to the
// angle `back`, the path lingers as a thin line. `near` picks the half in front of the characters (true) or behind them.
function smear(p, h, tail, back, cool, C, near) {
  p.shade(CX - RX - 1, CY - RY - 1, 2 * RX + 2, 2 * RY + 2, (x, y) => {
    const nx = (x + 0.5 - CX) / RX, ny = (y + 0.5 - CY) / RY, rho = Math.hypot(nx, ny);
    if (rho < 0.3 || ny >= 0 !== near) return 0;
    const d = (rho - 1) / (Math.hypot(nx / RX, ny / RY) / rho); // px from the path, outside positive
    let a = Math.atan2(ny, nx);
    while (a < h) a += TAU;
    while (a >= h + TAU) a -= TAU;
    if (a > back) return 0;
    if (a > tail) return d > -0.8 && d < 0.5 ? C[cool < 0.5 ? 5 : 4] : 0; // the afterimage
    const s = (tail - a) / (tail - h), w = W * Math.min(1, (s / 0.8) ** 0.7) * clamp01((tail - h) / 0.8) + 1;
    if (d > 0.5 || d < -w) return 0;
    if (s < 0.3 && Math.floor(-d) % 2) return 0; // streaks toward the tail
    const e = -d / w; // 0 on the path, 1 at the inner edge
    return C[Math.max(1, Math.min(7, Math.round(7 * (0.6 + 0.45 * s - 0.45 * e - 0.55 * cool))))];
  });
}

// The pop where the foot lands: a white burst, then a wide ring that thins and breaks up as it flies out.
function pop(p, t, C) {
  const k = t - HIT;
  if (k < 0) return;
  // broken where two waves of its angle dip, irregular as if drawn by hand, the gaps widening as it flies out
  const broken = u => (dx, dy) => {
    const a = Math.atan2(dy, dx);
    return Math.sin(a * 3 + 1.3) + 0.7 * Math.sin(a * 7 + 0.4) > -0.9 + u * 1.4 ? 1 : 0;
  };
  if (k < 1 / 30) {
    p.circle(0.5, 0.5, 5, C[7]);
    p.ring(0.5, 0.5, 8.5, 2.5, C[7], broken(0));
    return;
  }
  if (k < 0.24) {
    const u = (k - 1 / 30) / (0.24 - 1 / 30), ease = 1 - (1 - u) ** 3;
    if (u < 0.4) p.circle(0.5, 0.5, 3.5 * (1 - u / 0.4), C[u < 0.15 ? 7 : 6]);
    p.ring(0.5, 0.5, 9 + ease * 15, 2.6 * (1 - u) ** 1.5 + 0.6, (dx, dy, e) => C[u < 0.15 ? 7 : e > 0 ? 6 : 4], broken(u));
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, ground: 11 }); // the floor 11 px below the chest
  const lights = new Lights();
  lights.add(0, 0, 10, C[7], 1, 0.1, { delay: HIT });
  lights.add(0, 0, 22, C[5], 0.8, 0.3, { delay: HIT });
  for (let i = 0; i < 12; i++) {
    const back = i >= 10, a = back ? Math.PI + rng.range(-0.7, 0.7) : rng.range(-1.6, 0.4), v = back ? rng.range(30, 50) : rng.range(70, 130);
    parts.spawn(SPARK, Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.12, back ? 0.16 : 0.26), { delay: HIT });
  }

  let t = 0, n = 0;
  const layer = (p, near) => {
    const h = head(t), tail = head(t - LAG), back = head(t - 2 * LAG), cool = clamp01((t - HIT) / 0.12);
    if (back - h > 0.05 && cool < 1) smear(p, h, tail, back, cool, C, near);
  };
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      layer(p, false);
    },
    draw(p) {
      lights.draw(p);
      const h = head(t), cool = clamp01((t - HIT) / 0.12);
      if (cool < 1) p.glow(CX + Math.cos(h) * RX, CY + Math.sin(h) * RY, 10, C[5], 0.5 * (1 - cool));
      layer(p, true);
      parts.draw(p);
      pop(p, t, C);
    },
  };
}
