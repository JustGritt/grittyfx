import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Spin slash',
  desc: 'A whirlwind swing around the wielder at the anchor: the blade sweeps two full turns, its trail wrapping behind and in front of them, cutting the target in front on each pass, its path lingering as a fading ring',
  tags: ['spin', 'whirlwind', 'melee', 'sword', 'impact', 'arc'],
  size: [88, 44],
  origin: [32, 24],
  duration: 0.6,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [72, 64], origin: [32, 32] },
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  act: { windup: 0.15, hits: [{ t: 3 / 30, freeze: 0.04, shake: 1 }, { t: 9 / 30, freeze: 0.08, shake: 2 }] },
  stage: { x: -26 }, // centred on the wielder, the target in reach in front
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.6, pitch: 1.4 }, // a whoosh per turn, loudest as the blade passes in front
    { t: 0.2, kind: 'whoosh', gain: 0.8, pitch: 1.4 },
    { t: 3 / 30, kind: 'crack', gain: 0.45, pitch: 2.2 },
    { t: 9 / 30, kind: 'crack', gain: 0.8, pitch: 1.8 },
    { t: 9 / 30, kind: 'thump', gain: 0.4, pitch: 1.4 },
  ],
};

const TAU = Math.PI * 2;
const H1 = 3 / 30, H2 = 9 / 30; // the blade passes the target, at (R, 0)
const R = 22; // the blade tip's path
const K = 0.32; // the turn seen from a little above: depth squashed to this
const W = 9; // the swept band at its widest, along the blade
const SPIN = TAU / (H2 - H1); // rad/s, steady through both passes
const EASE = 0.18; // then it slows to a stop over this long
const END = H2 + EASE;
const LAG = 0.08; // the trail's tail follows the head this far behind
const TRACE = 0.22; // and the blade's path lingers this far behind
const PRE = 0.04; // the turn is already under way on the first frame
const FLOOR = 11; // below the chest
const clamp01 = v => Math.max(0, Math.min(1, v));

// The blade's angle: from the far side of the wielder's back, round past the target (0) and the near side (pi / 2)
// twice at a steady speed, then slowing to a stop.
function angle(t) {
  if (t <= H2) return SPIN * (t - H1);
  const u = clamp01((t - H2) / EASE);
  return TAU + ((SPIN * EASE) / 2) * (1 - (1 - u) ** 2);
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, top = o.view === 'top', k = top ? 1 : K;
  const parts = new Particles({ rng, palette: C, ground: top ? Infinity : FLOOR, top });
  const lights = new Lights();
  for (const [h, n] of [[H1, 6], [H2, 10]]) {
    lights.add(R, 0, n + 4, C[5], 0.8, 0.2, { delay: h });
    for (let i = 0; i < n; i++) {
      const a = rng.range(-0.2, 1.3), v = rng.range(50, 95); // thrown on round the turn, toward the near side
      parts.spawn(SPARK, R, 0, Math.cos(a) * v * 0.6, Math.sin(a) * v * k, rng.range(0.12, 0.24), { delay: h });
    }
  }

  // the swept band from the tail's angle to the head's: s along it (0 the tail), e across it (0 the hub side, 1 the
  // blade's path); the far half (y < 0) behind the wielder, the near half in front
  const band = (p, t, far) => {
    const h = angle(t), L = h - angle(Math.max(-PRE, t - LAG)), P = h - angle(Math.max(-PRE, t - TRACE));
    const fade = clamp01((t - H2) / (END + LAG - H2)), cool = clamp01((t - END) / 0.1);
    if (P < 0.05 || cool >= 1) return;
    const ry = R * k + 1, y0 = far ? -ry : top ? -ry : 0, y1 = far ? 0 : ry;
    p.shade(-R - 1, y0, 2 * R + 2, y1 - y0, (x, y) => {
      const r = Math.hypot(x + 0.5, (y + 0.5) / k), back = (((h - Math.atan2((y + 0.5) / k, x + 0.5)) % TAU) + TAU) % TAU;
      if (back > L) { // the blade's path lingering, thin and dim; its width in px, where the turn is squashed too
        const a = Math.atan2((y + 0.5) / k, x + 0.5);
        return back <= P && Math.abs(r - R + 0.5) * Math.hypot(Math.cos(a), k * Math.sin(a)) < 0.55 ? C[(far ? 2 : 3) + (cool < 0.5 ? 1 : 0)] : 0;
      }
      const s = 1 - back / L;
      const w = W * Math.min(1, 0.15 + s) * (1 - 0.5 * fade), e = 1 - (R - r) / w;
      if (e < 0 || e > 1.05) return 0;
      if (s < 0.5 && Math.floor((1 - e) * w * 0.6) % 2) return 0; // frays into streaks toward the tail
      const lit = 0.15 + 0.45 * s + 0.45 * e - 0.6 * fade - (far ? 0.15 : 0);
      return C[Math.max(1, Math.min(7, Math.round(7 * lit)))];
    });
  };

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      if (!top) band(p, t, true);
    },
    draw(p) {
      lights.draw(p);
      band(p, t, false);
      for (const h of [H1, H2]) {
        const u = (t - h) / 0.1;
        if (u < 0 || u >= 1) continue;
        const l = (h === H2 ? 9 : 6) + 10 * u, dy = l * 0.3;
        p.beam(R - dy, -l * 0.6, R + dy, l * 0.6, 1.5 * (1 - u) + 0.5, C[u < 0.3 ? 7 : 6], 1 - u * u); // the cut, across the turn
        p.glow(R, 0, 12, C[5], 0.7 * (1 - u));
      }
      const g = angle(t);
      if (t > 0.03 && t < END + 0.1) p.glow(Math.cos(g) * R * 0.85, Math.sin(g) * R * k * 0.85, 9, C[5], 0.45 * (1 - clamp01((t - END) / 0.1)));
      parts.draw(p);
    },
  };
}
