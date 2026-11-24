export const meta = {
  name: 'Kunai',
  desc: 'A thrown kunai flying point first: a leaf blade lit along its ridge, a wrapped grip, a ring pommel and a tassel that flutters, air streaming off behind',
  tags: ['projectile', 'thrown', 'kunai', 'knife', 'dagger', 'ninja', 'physical'],
  size: [40, 12],
  origin: [36, 6],
  duration: 0.4,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, steel: 6 },
  options: { palette: 'blood', steel: 'stone', seed: 1 },
  sound: [
    // a thin whistle of air, twice a loop
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 2.2 },
    { t: 0.2, kind: 'whoosh', gain: 0.22, pitch: 2.4 },
  ],
};

const TAU = Math.PI * 2;
const RING = -15; // the pommel ring's center, behind the point at 0
const DASH = 8; // the air streaks' dash period, px; they run back two periods a loop
// Air streaks: y off the axis, where they start, length, phase.
const AIR = [[0, -24, 10, 0], [-2, -19, 9, 0.5], [2, -19, 9, 0.25]];
// The blade, point at (0, 0): [x, y, steel step], the top lit, the ridge brightest, the underside in shadow.
const BLADE = [
  [0, 0, 5], [-1, 0, 5], [-2, 0, 5], [-3, 0, 5], [-4, 0, 5], [-5, 0, 4], [-6, 0, 4], [-7, 0, 3],
  [-2, -1, 4], [-3, -1, 4], [-4, -1, 4], [-5, -1, 4], [-6, -1, 3], [-4, -2, 3], [-5, -2, 3],
  [-2, 1, 3], [-3, 1, 3], [-4, 1, 3], [-5, 1, 3], [-6, 1, 2], [-4, 2, 2], [-5, 2, 2],
];

export function draw(p, t, o) {
  const C = o.palette, S = o.steel, ph = t / meta.duration;

  // streaks of air off the tassel: dashes that stream back and thin out
  for (const [dy, x0, len, k] of AIR) {
    for (let d = 0; d < len; d++) {
      if ((d + (ph * 2 + k) * DASH) % DASH < DASH - 3) p.blend(x0 - d, dy, S[5], 0.55 * (1 - d / len));
    }
  }

  // the tassel: two strands tied to the ring, rippling back in the wind, whole waves a loop, their ends darker
  for (const [dy, len, k, c, end] of [[0, 6, 0, C[5], C[3]], [1, 5, 0.3, C[3], C[2]]]) {
    for (let d = 1; d <= len; d++) {
      const wave = Math.round(Math.sin(TAU * (ph * 2 - d / 6 + k)) * (d / len) * 1.2);
      p.px(RING - 1 - d, dy + wave, d === len ? end : c);
    }
  }

  // the ring pommel: a 3x3 loop with a hole, lit from above
  for (const [x, y, k] of [[-1, -1, 5], [0, -1, 5], [1, -1, 4], [-1, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 2], [1, 1, 2]]) p.px(RING + x, y, S[k]);

  // the grip: dark steel with a cord wrapped round it in turns slanting back, lit from above
  for (let x = -8; x >= RING + 2; x--) {
    for (const y of [-1, 0, 1]) p.px(x, y, (((x - y) % 3) + 3) % 3 === 0 ? C[3 - y] : S[2 - Math.max(0, y)]);
  }

  // the blade, then a glint running along the steel
  for (const [x, y, k] of BLADE) p.px(x, y, S[k]);
  p.glow(-3, -1, 2, S[5], 0.2 + 0.15 * Math.sin(TAU * ph * 2));
}
