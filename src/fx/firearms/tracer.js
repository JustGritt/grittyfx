import { rand } from '../../core/index.js';

export const meta = {
  name: 'Tracer',
  desc: 'A rifle round in flight: a thin streak with a white-hot head and a tail cooling from yellow to orange, flickering as it flies',
  tags: ['projectile', 'firearm', 'military', 'bullet', 'tracer', 'round', 'rifle', 'gun', 'gunfire', 'shot'],
  size: [36, 10],
  origin: [30, 5],
  duration: 0.3,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { size: [56, 56], directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'fire', seed: 1 },
  stage: { speed: 360 }, // a round outruns an arrow
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 1.3 },
    { t: 0.02, kind: 'crack', gain: 0.14, pitch: 2.6 },
  ],
};

const FRAMES = 6; // frames a loop: the flicker picks a value per frame, so it repeats exactly
const LEN = 22; // the tail, px behind the head
const FADE = 0.6; // of the tail: where it starts to fade out
// The tail's steps by distance behind the head: white-hot, yellow, orange, deep orange, then red fading out.
const STEPS = [[3, 7], [6, 6], [11, 5], [16, 4]];

export function draw(p, t, o) {
  const C = o.palette, f = Math.floor((t / meta.duration) * FRAMES) % FRAMES, r = k => rand(f, o.seed, k);
  const len = LEN - 3 + Math.round(r(1) * 5), heat = Math.round(r(3) * 2) - 1; // the tail flickers, its colors shimmer

  // heat around the round: a hot point at the head, a thin haze along the tail
  p.glowLine(-len * 0.7, 0.5, 0, 0.5, 3, C[5], (u, d) => 0.25 * u * (1 - d) ** 2);
  p.glow(0, 0.5, 3.5, C[6], 0.35 + 0.15 * r(2));

  // the tail, 1 px: hot to cool, then red thinning out
  for (let d = 0; d <= len; d++) {
    const u = d / len, c = C[STEPS.find(([end]) => d < end + (end > 3 ? heat : 0))?.[1] ?? 3];
    if (u < FADE) p.px(-d, 0, c);
    else p.blend(-d, 0, c, 1 - (u - FADE) / (1 - FADE));
  }
  // the head: a point, then 2 px thick, its top yellow, so the round has a body
  for (const [x, k] of [[-1, 6], [-2, 6], [-3, 5]]) p.px(x, -1, C[k]);
}
