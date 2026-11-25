import { rand } from '../../core/index.js';

export const meta = {
  name: 'XP orbs',
  desc: 'Experience orbs: they pop out of a point beside the anchor, hang bobbing, then swoop in one after another to the anchor, the collector\'s chest, each flashing as it arrives',
  tags: ['pickup', 'xp', 'experience', 'orb', 'collect', 'absorb', 'reward'],
  size: [80, 56],
  origin: [20, 34],
  duration: 1.2,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  stage: { ground: 14 }, // the knight's chest; the orbs pop out of the floor at his side
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 2 }, // the pop
    { t: 0, kind: 'chime', gain: 0.3, pitch: 1.2 },
    // the orbs arriving, a rising arpeggio, the last the brightest
    ...[0, 1, 2, 3].map(i => ({ t: 0.57 + 0.1 * i + 0.05, kind: 'chime', gain: 0.35 + 0.05 * i, pitch: [1.5, 1.68, 2, 2.25][i] })),
    { t: 0.97, kind: 'chime', gain: 0.5, pitch: 3 },
  ],
};

const TAU = Math.PI * 2;
const N = 8;
const S = [32, 12]; // where they pop out, from the anchor: on the floor at the collector's side
const HOME = 0.35, STEP = 0.05, FLY = 0.22; // orb j leaves at HOME + STEP j and takes FLY to arrive
const out = (t, k) => 1 - Math.exp(-t / k);

// Orb j at t: [x, y], or null before it pops out or after it arrives. back: its position `back` seconds ago.
function orb(j, t, s) {
  // a fan over the source in two rows, near and far, so they don't clump
  const a = -Math.PI / 2 + ((j + 0.5) / N - 0.5) * 3 + (rand(j, s) - 0.5) * 0.2, r = 9 + 9 * (j % 2) + 3 * rand(j, s, 1);
  const hx = S[0] + Math.cos(a) * r, hy = S[1] + Math.sin(a) * r * 0.9 - 8; // where it hangs
  const t0 = HOME + STEP * j;
  if (t < t0) { // bursts out to its spot, then bobs on its own phase
    const e = out(t, 0.06), bob = 1.2 * Math.sin(TAU * (t * 2.5 + rand(j, s, 2))) * Math.min(1, t / 0.15);
    return [S[0] + (hx - S[0]) * e, S[1] + (hy - S[1]) * e + bob];
  }
  const u = (t - t0) / FLY;
  if (u >= 1) return null;
  const v = u * u * (1.6 - 0.6 * u); // gathers speed, then a touch of ease into the chest
  const bob = 1.2 * Math.sin(TAU * (t0 * 2.5 + rand(j, s, 2)));
  // each its own curve: high over the top, low under, or nearly straight, so they don't come in as a string of beads
  const [x0, y0] = [hx, hy + bob], lane = (j * 3) % N / (N - 1), cx = x0 / 2 + 6 * (rand(j, s, 3) - 0.3);
  const cy = y0 / 2 - 34 + 52 * lane;
  return [(1 - v) ** 2 * x0 + 2 * (1 - v) * v * cx, (1 - v) ** 2 * y0 + 2 * (1 - v) * v * cy];
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;

  if (t < 0.2) { // the pop where they come from
    p.glow(S[0], S[1] - 4, 12, C[6], 0.7 * (1 - t / 0.2) ** 2);
    if (t < 1 / 30) p.circle(S[0] + 0.5, S[1] - 3.5, 2.5, C[7]);
  }

  for (let j = 0; j < N; j++) {
    const at = orb(j, t, s);
    if (at) {
      const [x, y] = at, X = Math.round(x), Y = Math.round(y), flying = t > HOME + STEP * j;
      if (flying) { // a streak behind it
        const prev = orb(j, Math.max(HOME + STEP * j, t - 0.06), s);
        if (prev) p.line(Math.round(prev[0]), Math.round(prev[1]), X, Y, q => C[q > 0.6 ? 6 : 4]);
      }
      const pulse = 0.5 + 0.5 * Math.sin(TAU * (t * 4 + rand(j, s, 4)));
      p.glow(X + 0.5, Y + 0.5, 6, C[5], 0.35 + 0.2 * pulse);
      p.circle(X + 0.5, Y + 0.5, 2.2, (dx, dy) => C[dx + dy > 1.5 ? 4 : flying || pulse > 0.5 ? 6 : 5]); // a rim down-right
      p.px(X, Y, C[7]);
      if (!flying && pulse > 0.85) p.px(X - 1, Y - 1, C[7]); // a glint as it bobs
    }
    const big = j === N - 1, v = (t - (HOME + STEP * j + FLY)) / (big ? 0.24 : 0.1); // it arrives: a flash in the chest
    if (v >= 0 && v < 1) {
      p.glow(0, 0, big ? 18 : 8, C[6], (big ? 0.95 : 0.5) * (1 - v) ** 2);
      if (v < (big ? 0.15 : 0.35)) p.circle(0.5, 0.5, big ? 3.5 : 1.6, C[7]);
      if (big) p.ring(0.5, 0.5, 4 + 10 * out(v, 0.3), 1.6 * (1 - v) + 0.6, C[v < 0.3 ? 7 : 5], 1 - v);
    }
  }
}
