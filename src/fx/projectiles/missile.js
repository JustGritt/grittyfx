import { rand } from '../../core/index.js';

// Olive drab, dark to light, as on projectiles/rocket: the band round the warhead.
const OLIVE = ['#1c211b', '#2a3227', '#3a4535', '#4d5a45', '#647358', '#808f6e'];

export const meta = {
  name: 'Missile',
  desc: 'A guided missile in flight: a slim steel body with an olive band, a dark seeker nose, canards and tail fins, a white-hot exhaust and a smoke trail that corkscrews behind it as it rolls',
  tags: ['projectile', 'rocket', 'missile', 'military', 'guided', 'launcher', 'explosive', 'smoke'],
  size: [72, 24],
  origin: [68, 12],
  duration: 0.8,
  loop: true,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, smoke: 6, metal: 8, paint: 6 },
  options: { palette: 'fire', smoke: 'smoke', metal: 'stone', paint: OLIVE, seed: 1 },
  sound: [
    // the motor's hiss, three times a loop, wrapping round so it never stops
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 1.1 },
    { t: 0.27, kind: 'whoosh', gain: 0.26, pitch: 1.2 },
    { t: 0.53, kind: 'whoosh', gain: 0.28, pitch: 1.05 },
    { t: 0, kind: 'crackle', gain: 0.18, pitch: 0.8 }, // the motor's roar under it
  ],
};

const TAU = Math.PI * 2;
const NOZZLE = -21; // the exhaust leaves here, behind the nose at 0
const FLICKER = [6, 8, 5, 7, 8, 6, 9, 5, 7, 6, 8, 7]; // the flame's length, frame by frame through a loop
const PUFFS = 26, TRAIL = 38; // puffs along the trail, and how far back it reaches
const K = 2, ROLL = 4; // each puff runs the trail K times a loop; the missile rolls ROLL turns a loop
// The missile, nose at x 0, from x -21: a row per y from -4, a char per x; digits are metal steps, letters paint steps
// (a darkest). Swept tail fins and small canards, a steel body lit from above, an olive band, a dark seeker with a glint.
const BODY = [
  '3.....................',
  '54....................',
  '.554.........34.......',
  '2777666666666ee66667..',
  '1555555555555dd555221.',
  '1333333333333bb3331...',
  '.221.........21.......',
  '21....................',
  '1.....................',
];

// all behind the cast: on the stage it slides out of the gunner's tube, and into the goblin as it blows up
export function drawBack(p, t, o) {
  const C = o.palette, S = o.smoke, M = o.metal, P = o.paint, s = o.seed, ph = t / meta.duration;
  const len = FLICKER[Math.floor(ph * FLICKER.length + 1e-6) % FLICKER.length], rise = o.view === 'top' ? 0 : 2;

  // The trail: puffs left where the nozzle was as the missile rolls, so they lie along a spiral: each is u through its
  // life, swelling, drifting out from the axis and thinning; those on the far side of the spiral are drawn first,
  // smaller and darker, those on the near side over them.
  const puffs = [];
  for (let j = 0; j < PUFFS; j++) {
    const u = (ph * K + j / PUFFS) % 1, th = TAU * (ROLL * ph - (ROLL / K) * u + 0.15 * rand(j, s));
    const near = Math.cos(th), R = 0.6 + 3.4 * u ** 0.7;
    puffs.push({ u, near, x: NOZZLE - 3 - TRAIL * u, y: 0.5 + R * Math.sin(th) - rise * u, r: (1.2 + 2.4 * u ** 0.7) * (0.85 + 0.15 * near) });
  }
  puffs.sort((a, b) => a.near - b.near);
  for (const { u, near, x, y, r } of puffs) {
    const a = (0.75 + 0.15 * near) * (1 - u) ** 1.2 * Math.min(1, u / 0.05), hot = u < 0.1, lit = near > 0.3 ? 4 : near > -0.3 ? 3 : 2;
    p.disc(x, y, r, (dx, dy) => {
      if (hot) return C[Math.hypot(dx, dy) < r * 0.5 ? 5 : 4];
      if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.55) return S[Math.min(5, lit + (u < 0.4 ? 1 : 0))];
      return S[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.9 ? lit - 1 : lit];
    }, (dx, dy, d) => a * Math.min(1, (1 - d) / 0.35));
  }

  // the exhaust: a white-hot point, a slim flame that tapers and flickers, light around it
  p.glow(NOZZLE - 5, 0.5, 6, C[5], 0.45); // behind the nozzle, so the fins stay dark
  p.glowLine(NOZZLE - 2, 0.5, NOZZLE - len - 3, 0.5, 4, C[6], (v, d) => 0.55 * (1 - v) * (1 - d) ** 2);
  p.shade(NOZZLE - 10, -2, 10, 5, (x, y) => {
    const v = (NOZZLE - x - 0.5) / len, half = 1.6 * (1 - v) ** 0.8;
    if (v < 0 || v >= 1 || Math.abs(y) > half) return 0;
    const heat = (1 - Math.abs(y) / (half + 0.4)) * (1.15 - v);
    return C[heat > 0.75 ? 7 : heat > 0.5 ? 6 : heat > 0.3 ? 5 : 4];
  });

  // the missile
  BODY.forEach((row, i) => {
    for (let k = 0; k < row.length; k++) {
      const ch = row[k];
      if (ch === '.') continue;
      p.px(k - 21, i - 4, ch >= 'a' ? P[ch.charCodeAt(0) - 97] : M[+ch]);
    }
  });
  p.glow(-2, -0.5, 3, M[7], 0.3 + 0.2 * Math.sin(TAU * 2 * ph)); // a glint on the seeker
}
