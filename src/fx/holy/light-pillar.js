import { Rng, Particles, SPARK, EMBER, noise2 } from '../../core/index.js';

const HIT = 0.2;

export const meta = {
  name: 'Light pillar',
  desc: 'A thin ray picks out the target, then a column of light slams down on it: a white hero frame, a flare racing over the ground, sparks rising as the beam thins and lifts away',
  tags: ['impact', 'hit', 'holy', 'light', 'beam', 'spell', 'strike'],
  size: [84, 116],
  origin: [42, 104],
  duration: 1.1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'holy', seed: 1 },
  act: { hits: [{ t: HIT, freeze: 0.08, shake: 3 }] },
  sound: [
    { t: 0, kind: 'chime', gain: 0.3, pitch: 2 }, // the ray finds its mark
    { t: HIT - 0.12, kind: 'whoosh', gain: 0.4 }, // the column coming down, loudest on the hit
    { t: HIT, kind: 'thump', gain: 0.8, pitch: 0.7 },
    { t: HIT, kind: 'crack', gain: 0.55, pitch: 0.9 },
    { t: HIT, kind: 'chime', gain: 0.7 }, // a bright chord rings out
    { t: HIT, kind: 'chime', gain: 0.5, pitch: 1.5 },
    { t: HIT + 0.02, kind: 'chime', gain: 0.3, pitch: 2 },
    { t: HIT + 0.3, kind: 'chime', gain: 0.12, pitch: 2.5 }, // sparks rising
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30;
const TOP = -104; // the column comes in at the top edge
const SQ = 0.28; // the ground ellipse's height over its width
const RAY = 0.07; // the ray takes this long to reach the ground
const HOLD = 0.55; // the column's life after the hero frame

// A flat ellipse on the ground; front is the half nearer the viewer.
function ellipse(p, rx, front, c, a = 1) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 === front) p.line(Math.cos(a0) * rx, Math.sin(a0) * rx * SQ, Math.cos(a1) * rx, Math.sin(a1) * rx * SQ, c, a);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed;
  const parts = new Particles({ rng, palette: C, ground: 0 });
  for (let i = 0; i < 14; i++) { // sparks splashed out low over the ground, both ways
    const a = rng.range(Math.PI * 1.04, Math.PI * 1.4) + (i % 2 ? 0 : Math.PI * 0.56), v = rng.range(50, 90);
    parts.spawn(SPARK, rng.range(-4, 4), -1, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.25, 0.45), { delay: HIT });
  }
  for (let i = 0; i < 16; i++) { // motes of light rising round the column
    parts.spawn(EMBER, rng.range(-8, 8), rng.range(-24, -1), rng.range(-15, 15), rng.range(-90, -40), rng.range(0.4, 0.62), { delay: HIT + rng.range(0, 0.25) });
  }

  let n = 0, t = 0, fr = Math.round(-HIT / F);
  // After the hero frame: v runs 0 to 1 while the column narrows, dims and, at the end, lifts off the ground.
  const after = () => {
    const v = Math.max(0, (t - HIT - F) / HOLD); // 0 on the frame after the hit, however the sum rounds
    if (fr < 1 || v >= 1) return null;
    return { v, hw: (2 + 11 * (1 - v) ** 1.5) / 2, bottom: v < 0.7 ? 0 : TOP * ((v - 0.7) / 0.3) ** 2 };
  };
  const ring = (p, front) => { // the flare racing out over the ground
    const v = (t - HIT) / 0.4;
    if (v < 0 || v >= 1) return;
    ellipse(p, 8 + 24 * (1 - (1 - v) ** 3), front, C[(front ? 7 : 6) - Math.floor(v * 4)], Math.min(1, (1 - v) / 0.3));
  };

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the hero frame lands exactly on HIT
      fr = Math.round((t - HIT) / F); // frames from the hit, whole at every frame time
      parts.update(dt);
    },
    drawBack(p) {
      // one hue of light throughout, so the column's glow and the ground's never fight over a pixel
      if (fr < -1) {
        const u = Math.min(1, t / RAY);
        p.glowLine(0, TOP + 12, 0, Math.min(-2, TOP + 12 - TOP * u * u), 5, C[5], 0.25);
      } else if (fr === 0) {
        p.glowLine(0, TOP + 18, 0, -6, 18, C[5], 1);
        p.glowLine(-20, -2, 20, -2, 10, C[5], 0.8);
      } else {
        const q = after();
        if (q) p.glowLine(0, TOP + 12, 0, Math.min(-2, q.bottom - 2), q.hw + 6, C[5], 0.6 * (1 - q.v));
        const g = Math.max(0, 1 - (t - HIT) / 0.8) ** 2; // the struck ground glows on after the beam
        if (fr > 0) p.glowLine(-18, -1, 18, -1, 8, C[5], 0.5 * g);
      }
      ring(p, false);
      parts.draw(p, 'back');
    },
    draw(p) {
      if (fr < -1) {
        // the ray: it runs down from the sky, then flickers on the mark while a ring narrows in on it
        const u = Math.min(1, t / RAY), y = TOP - TOP * u * u, f = Math.floor(t / F + 1e-9);
        p.line(0, TOP, 0, y, u < 1 ? C[5] : C[f % 2 ? 6 : 5]);
        p.px(0, y, C[7]);
        if (u >= 1) {
          const v = (t - RAY) / (HIT - F - RAY), rx = 14 - 9 * v;
          ellipse(p, rx, false, C[4]);
          ellipse(p, rx, true, C[5]);
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) p.px(dx, dy - 1, C[6]);
        }
        return;
      }
      if (fr === -1) {
        // the column on its way down, a frame before it lands
        p.beam(0, TOP + 5, 0, TOP * 0.45, 9, (u, d) => C[d < 0.5 ? 7 : 6]);
        p.line(0, TOP * 0.45, 0, -1, C[6]);
        return;
      }
      if (fr === 0) {
        // the hero frame: all white, the widest, splashed over the ground
        p.shade(-10, TOP, 20, -TOP, x => C[Math.abs(x + 0.5) > 8.5 ? 6 : 7]);
        p.ellipse(0, -1, 26, 7, (dx, dy, d) => C[d < 0.75 ? 7 : 6]);
        return;
      }
      const q = after();
      if (q) {
        const { v, hw, bottom } = q;
        p.shade(-Math.ceil(hw) - 1, TOP, 2 * Math.ceil(hw) + 2, bottom - TOP, (x, y) => {
          const cx = x + 0.5, d = Math.abs(cx) / hw;
          if (d > 1) return 0;
          const nz = noise2(cx * 0.8, (y - t * 320) * 0.08, s); // streaks pouring down
          const tail = bottom < 0 ? Math.min(1, (bottom - y) / 12) : 1; // its lifting end tapers
          const heat = (1.15 - d * 0.9 + (nz - 0.5) * 0.5 - v * 0.7) * tail;
          return heat > 0.85 ? C[7] : heat > 0.6 ? C[6] : heat > 0.38 ? C[5] : heat > 0.18 ? C[4] : heat > 0.05 ? C[3] : 0;
        });
        if (bottom === 0) p.ellipse(0, -1, hw + 4, 2.5, (dx, dy, d) => C[d < 0.6 ? 7 : v < 0.5 ? 6 : 5]); // where it meets the ground
      }
      ring(p, true);
      parts.draw(p);
    },
  };
}
