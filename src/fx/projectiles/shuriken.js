export const meta = {
  name: 'Shuriken',
  desc: 'A spinning four-pointed throwing star: bevelled steel points around a dark hole, a glint as each point swings past the light, air streaming off behind',
  tags: ['projectile', 'thrown', 'shuriken', 'star', 'spin', 'ninja', 'physical'],
  size: [28, 16],
  origin: [20, 8],
  duration: 0.4,
  loop: true,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 6 },
  options: { palette: 'stone', seed: 1 },
  sound: [
    // a fast whir, three times a loop
    { t: 0, kind: 'whoosh', gain: 0.22, pitch: 2.6 },
    { t: 0.13, kind: 'whoosh', gain: 0.18, pitch: 2.8 },
    { t: 0.27, kind: 'whoosh', gain: 0.2, pitch: 2.7 },
  ],
};

const Q = Math.PI / 2;
const R = 5.4, r = 1.7; // the points' reach and the waist between them, px
const TURN = 3 * Q; // radians a loop: 22.5 degrees a frame, three quarter turns, and each quarter looks the same
const LIGHT = -3 * Math.PI / 4; // the light comes from the upper left
const DASH = 7;
const AIR = [[-3, 9, 0], [3, 9, 0.5], [0, 12, 0.25]]; // streaks: y, length, phase

// Where (x, y) sits on the star turned `spin`: d from the center, which face (1 leading, -1 trailing), and how far
// from a point's ridge (0) to halfway between two points (1).
function at(x, y, spin) {
  const d = Math.hypot(x, y), u = (((Math.atan2(y, x) - spin) % Q) + Q) % Q;
  return { d, side: u < Q / 2 ? 1 : -1, off: Math.min(u, Q - u) / (Q / 2) };
}

export function draw(p, t, o) {
  const S = o.palette, ph = t / meta.duration, spin = TURN * ph;

  // streaks of air behind it, dashes that stream back and thin out
  for (const [dy, len, k] of AIR) {
    for (let d = 0; d < len; d++) {
      if ((d + (ph * 3 + k) * DASH) % DASH < DASH - 3) p.blend(-R - 1 - d, dy, S[5], 0.5 * (1 - d / len));
    }
  }

  // the star: each point a blade bevelled along its ridge, the leading face lit, the trailing one in shadow
  p.shade(-7, -7, 15, 15, (x, y) => {
    const { d, side, off } = at(x, y, spin);
    return d < 0.6 ? S[0] : d < 1.6 ? S[2] : off < 0.18 ? S[5] : side > 0 ? S[4] : S[3];
  }, (x, y) => {
    const { d, off } = at(x, y, spin);
    return d <= R - (R - r) * off ? 1 : 0;
  });

  // a glint where a point swings past the light
  const aim = Math.cos(4 * (LIGHT - spin)); // 1 when a point aims at the light
  p.glow(Math.cos(LIGHT) * 3 + 0.5, Math.sin(LIGHT) * 3 + 0.5, 2, S[5], Math.max(0, aim) ** 3 * 0.5);
}
