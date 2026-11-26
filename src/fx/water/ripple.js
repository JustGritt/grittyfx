import { rand } from '../../core/index.js';

export const meta = {
  name: 'Ripple',
  desc: 'Rings that spread over still water from one spot, a bright crest over a dark trough, breaking up and fading as they go, a glint riding each crest',
  tags: ['water', 'ripple', 'ambient', 'surface', 'prop'],
  size: [64, 24],
  origin: [32, 12],
  duration: 2.4,
  loop: true,
  fps: 15,
  views: ['side', 'top'],
  stage: { x: 22, scenery: 'pool' }, // on a pool in the floor, clear of the caster
  top: { size: [64, 64] },
  ramps: { palette: 8 },
  options: { palette: 'water', seed: 1 },
  // a soft lap of water as each ring leaves the spot
  sound: [0, 0.8, 1.6].map(t => ({ t, kind: 'whoosh', gain: 0.2, pitch: 0.45 })),
};

const TAU = Math.PI * 2;
const RINGS = 3; // alive at once, one leaving the spot every duration / RINGS
const MAX = 28; // the radius a ring fades out at
const SQ = 0.3; // rings seen from the side: flattened ellipses
const N = 64; // segments of a side-view ring

// Ring j leaves the spot at phase j / RINGS of every loop and lives one loop, so it is the same ring each time round.
const age = (ph, j) => (((ph - j / RINGS) % 1) + 1) % 1;
const radius = u => 2 + (MAX - 2) * (1 - (1 - u) ** 1.7); // fast off the spot, slowing as it spreads

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration, top = o.view === 'top';

  for (let j = 0; j < RINGS; j++) {
    const u = age(ph, j), r = radius(u), cool = Math.min(4, Math.floor(u * 4.4));
    // it breaks into arcs as it spreads: open where a smooth wave round the ring stays above the threshold
    const p1 = TAU * rand(j, s, 1), p2 = TAU * rand(j, s, 2), cut = -0.15 + 1.0 * u ** 1.5;
    const open = am => 0.5 + 0.28 * Math.sin(3 * am + p1) + 0.22 * Math.sin(7 * am + p2) > cut;
    if (top) {
      // lit from up-left: the slope facing the light is bright, the far one dark, so each ring stands up off the water
      const w = 3 - u;
      p.ring(0, 0, r, w, (dx, dy, e) => {
        const lit = Math.cos(Math.atan2(dy, dx) + Math.PI * 0.75) > 0 === e > 0;
        return C[lit ? 7 - cool : Math.max(1, 3 - cool)];
      }, (dx, dy) => (open(Math.atan2(dy, dx)) ? 1 : 0));
    } else {
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
        if (!open(am)) continue;
        const seg = (rr, c) => p.line(Math.cos(a0) * rr, Math.sin(a0) * rr * SQ, Math.cos(a1) * rr, Math.sin(a1) * rr * SQ, c);
        const front = Math.sin(am) > 0;
        if (r > 4 && front) seg(r - 2.5, C[Math.max(1, 2 - cool)]); // the trough in front of the crest
        if (front && u < 0.4) seg(r + 0.7, C[6 - cool]); // a young crest stands taller
        seg(r, C[(front ? 7 : 6) - cool]);
      }
    }
    // a glint riding the crest, twinkling once on its way out
    if (u > 0.1 && u < 0.45) {
      const a = TAU * rand(j, s, 3), g = Math.sin((Math.PI * (u - 0.1)) / 0.35);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * (top ? 1 : SQ), arm = g > 0.6 ? 2 : 1;
      for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(x + dx, y + dy, C[d === arm ? 5 : 6]);
      p.px(x, y, C[7]);
      p.light(x, y, C[6], 0.6 * g);
    }
  }

  // the spot: the water heaves up as each ring leaves it, and settles
  const bob = Math.max(0, ...Array.from({ length: RINGS }, (_, j) => 1 - age(ph, j) / 0.15));
  if (top) {
    if (bob > 0) p.circle(0, 0, 1 + 2 * bob, (dx, dy) => C[dx + dy < 0 ? 7 : 5]);
    else p.px(0, 0, C[4]);
  } else {
    if (bob > 0) p.ellipse(0, -bob, 1 + 2 * bob, 0.6 + bob, (dx, dy) => C[dy < 0 ? 7 : 5]);
    else p.line(-1, 0, 1, 0, C[4]);
  }
  if (bob > 0) p.glow(0, 0, 7, C[6], 0.4 * bob);
}
