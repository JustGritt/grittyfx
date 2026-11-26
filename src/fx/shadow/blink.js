import { rand } from '../../core/index.js';

const HIT = 3 / 30; // she reappears
const DIST = 54; // the step, px

export const meta = {
  name: 'Blink',
  desc: 'A shadow step: a slit of light where the body was, afterimages and speed lines streaking ahead, a slit opening where it reappears, wisps of shadow at both ends',
  tags: ['vanish', 'blink', 'teleport', 'dash', 'shadow', 'ninja', 'afterimage'],
  size: [88, 40],
  origin: [18, 20],
  duration: 0.5,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [140, 140], directions: 8 },
  ramps: { palette: 8, smoke: 8 },
  options: { palette: 'arcane', smoke: 'shadow', seed: 1 },
  act: { windup: 0.2, hits: [{ t: 3 / 30, freeze: 0.03, shake: 1 }] },
  stage: { at: 'caster', ground: 14, hide: [0, HIT], move: [HIT, DIST] }, // from her chest, 54 px on: where a slash at the goblin is swung from
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.6, pitch: 2.2 }, // the zip
    { t: 3 / 30, kind: 'crack', gain: 0.3, pitch: 2.4 }, // the reappearance
    { t: 3 / 30, kind: 'chime', gain: 0.2, pitch: 1.6 },
  ],
};

const H = 13; // half a body's height: the slits and afterimages
const out = (u, k) => 1 - Math.exp(-Math.max(0, u) / k);
const clamp = v => Math.max(0, Math.min(1, v));

// A slit of light, a body's height, opening u (0 to 1) wide and collapsing to a point as it closes.
function slit(p, C, x, h, open) {
  if (h < 1) return p.px(x, 0, C[7]);
  p.glowLine(x, -h, x, h, 4, C[5], 0.5);
  p.line(x, -h, x, h, w => C[Math.abs(w - 0.5) < 0.3 ? 7 : 6]);
  if (open) for (const dx of [-1, 1]) p.line(x + dx, -h + 2, x + dx, h - 2, C[5]);
}

// Wisps of shadow left by a slit, starting at t0: a few soft puffs drifting back off the path and thinning.
function wisps(p, o, x, t0, t, V, k) {
  const S = o.smoke, u = t - t0;
  if (u < 0 || u >= 0.4) return;
  const e = u / 0.4;
  for (let i = 0; i < 4; i++) {
    const r = 3.5 + 1.5 * rand(i, k, o.seed) + 2.5 * e, side = i % 2 ? 1 : -1;
    const y = side * V * (3 + 5 * (i >> 1) + 4 * out(u, 0.1)), dx = -(3 + 6 * rand(i, k, o.seed + 1)) * out(u, 0.12);
    p.disc(x + dx, y, r, (ddx, ddy, d) => S[d > 0.8 ? 3 : ddx + ddy < -1 ? 6 : 5], (ddx, ddy, d) => 0.75 * (1 - e) * (1 - d * d));
  }
}

export function drawBack(p, t, o) {
  const V = o.view === 'top' ? 0.35 : 1; // seen from above, a body's height is a short mark across the path
  wisps(p, o, 0, 0, t, V, 1);
  wisps(p, o, DIST, HIT, t, V, 2);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, V = o.view === 'top' ? 0.35 : 1, left = 1 - t / meta.duration; // left: lights reach 0 at the end

  // where she was: the slit, full height on the first frame, pinching shut
  if (t < 0.13) slit(p, C, 0, H * V * (1 - t / 0.13) ** 1.5, t < 1 / 30);

  if (t >= 1 / 30) {
    const u = t - 1 / 30;
    // the path lights up as she crosses it, then fades
    p.glowLine(0, 0, DIST, 0, 6 * V + 2, C[4], (w, d) => 0.35 * (1 - d) ** 2 * Math.exp(-u / 0.12) * (0.4 + 0.6 * w) * left);

    // a smear the height of her body: speed lines, longest at the middle, their tails drawn in to the far end
    for (let i = 0; i < 7; i++) {
      const v = (i - 3) / 3, y = v * (H - 2) * V, lag = 0.07 + 0.1 * rand(i, s), tail = DIST * out(u - 0.03 * Math.abs(v), lag);
      const head = DIST - 3 - 5 * Math.abs(v) - 3 * rand(i, s, 2), start = 6 + 22 * v * v; // the smear's back is rounded
      const x0 = Math.max(tail, start);
      if (head - x0 > 1) p.line(x0, y, head, y, w => C[w > 0.75 ? 7 - Math.round(Math.abs(v)) : w > 0.35 ? 5 : 3]);
    }
  }

  // where she reappears: the slit opens on the hit, a flash and a ring, then pinches shut
  if (t >= HIT) {
    const u = t - HIT;
    if (u < 0.3) slit(p, C, DIST, H * V * (u < 0.1 ? 1 : (1 - (u - 0.1) / 0.2) ** 1.5), u < 0.1);
    if (u < 1 / 30) p.circle(DIST + 0.5, 0.5, 3, C[7]);
    if (u < 0.1) p.ring(DIST + 0.5, 0.5, 4 + 6 * out(u, 0.03), 1, C[u < 0.05 ? 6 : 4]);
    p.glow(DIST, 0, 14, C[5], 0.7 * Math.exp(-u / 0.08) * left);
  }
}
