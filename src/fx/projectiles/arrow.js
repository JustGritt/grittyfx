export const meta = {
  name: 'Arrow',
  desc: 'An arrow in flight: a steel broadhead that glints, a shaft whose fletching shivers as it flies, streaks of air running off behind',
  tags: ['projectile', 'arrow', 'bow', 'physical'],
  size: [48, 12],
  origin: [42, 6],
  duration: 0.4,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, wood: 6, steel: 6 },
  options: { palette: 'blood', wood: 'dust', steel: 'stone', seed: 1 },
  sound: [
    // a thin whistle of air, twice a loop
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 1.9 },
    { t: 0.2, kind: 'whoosh', gain: 0.22, pitch: 2.1 },
  ],
};

const TAU = Math.PI * 2;
const TAIL = -19; // the nock, behind the point at 0
const DASH = 8; // the air streaks' dash period, px; they run back two periods a loop
// Air streaks: y off the shaft, length behind the nock, phase.
const AIR = [[0, 16, 0], [-2, 10, 0.5], [2, 10, 0.25]];

export function draw(p, t, o) {
  const C = o.palette, W = o.wood, S = o.steel, ph = t / meta.duration, shiver = Math.sin(TAU * ph * 4) > 0 ? 1 : 0;

  // streaks of air off the fletching: dashes that stream back and thin out
  for (const [dy, len, k] of AIR) {
    for (let d = 1; d <= len; d++) {
      if ((d + (ph * 2 + k) * DASH) % DASH < DASH - 3) p.blend(TAIL - d, dy, S[5], 0.6 * (1 - d / len));
    }
  }

  // the shaft, the nock and the fletching: two vanes swept back, their tips shivering
  p.line(-3, 0, TAIL, 0, W[4]);
  p.px(TAIL, 0, W[1]);
  for (const [side, c, edge] of [[-1, C[5], C[6]], [1, C[3], C[4]]]) {
    p.line(TAIL + 5, side, TAIL + 1, side, c);
    p.line(TAIL + 2 - shiver, 2 * side, TAIL - shiver, 2 * side, edge);
  }

  // the broadhead: a bright point, barbs swept back, lit from above
  for (const [x, y, k] of [[0, 0, 5], [-1, 0, 5], [-1, -1, 5], [-2, -1, 4], [-3, -2, 4], [-2, 0, 4], [-1, 1, 3], [-2, 1, 3], [-3, 2, 2], [-3, 0, 2]]) p.px(x, y, S[k]);
  p.glow(-1, -1, 3, S[5], 0.35 + 0.25 * Math.sin(TAU * ph * 2)); // a glint running along the steel
}
