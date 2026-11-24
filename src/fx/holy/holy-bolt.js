import { tileFbm, rand } from '../../core/index.js';

export const meta = {
  name: 'Holy bolt',
  desc: 'A flying lance of light: a white-hot point in gold edges, a short trail of two strands that shimmer and weave, glints popping behind it',
  tags: ['projectile', 'holy', 'light', 'magic', 'spell'],
  size: [52, 22],
  origin: [37, 11],
  duration: 0.5,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'holy', seed: 1 },
  sound: [
    // a bright shimmer that rings on while it flies, over a soft rush of air
    { t: 0, kind: 'chime', gain: 0.25, pitch: 2 },
    { t: 0.25, kind: 'chime', gain: 0.18, pitch: 2.5 },
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 1.4 },
    { t: 0.25, kind: 'whoosh', gain: 0.24, pitch: 1.5 },
  ],
};

const TAU = Math.PI * 2;
const TIP = 10, BACK = -13, MID = 2; // the lance, point first, widest at MID
const W = 3; // its half-width there
const TRAIL = 20; // how far the trail runs behind it

// The lance's half-width at x: a long diamond.
const half = x => (x >= TIP || x <= BACK ? 0 : x > MID ? (W * (TIP - x)) / (TIP - MID) : (W * (x - BACK)) / (MID - BACK));

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  const pulse = 0.5 + 0.5 * Math.sin(TAU * ph * 2);

  p.glowLine(BACK - TRAIL, 0, MID, 0, 6, C[5], (u, d) => 0.35 * u * (1 - d) ** 2);
  p.glow(MID + 2, 0, 10, C[5], 0.4 + 0.15 * pulse);

  // the trail: a streak that tapers and cools behind the lance, shimmering as it streams back, and two fainter
  // strands that peel off either side and waver
  for (let x = BACK + 3; x > BACK - TRAIL; x -= 2) {
    const u = (BACK + 3 - x) / (TRAIL + 3), n = tileFbm(x * 0.2 + ph * 10, 0, 4, 2, s); // two and a half whole tiles a loop
    const heat = 0.92 - u + (n - 0.5) * 0.5, c = C[heat > 0.72 ? 6 : heat > 0.45 ? 5 : 4];
    if (heat < 0.12) continue;
    if (u < 0.45) p.beam(x, 0, x - 2, 0, 1.2, c); // two pixels thick near the lance, one further back
    else p.line(x, 0, x - 2, 0, c);
  }
  for (const k of [-1, 1]) {
    const pt = x => {
      const u = (BACK + 1 - x) / TRAIL;
      return [x, k * (1 + 3 * u) * (0.7 + 0.3 * Math.sin(TAU * (u * 1.5 - ph * 2) + k))];
    };
    for (let x = BACK + 1; x > BACK - TRAIL + 4; x -= 2) {
      const u = (BACK + 1 - x) / TRAIL, n = tileFbm(x * 0.2 + ph * 10, k * 3 + 5, 4, 2, s);
      const heat = 0.85 - u + (n - 0.5) * 0.6;
      if (heat > 0.15) p.line(...pt(x), ...pt(x - 2), C[heat > 0.6 ? 6 : heat > 0.35 ? 5 : 4]);
    }
  }

  // the lance: a white core in gold edges, hottest at the point
  p.shade(BACK, -W - 1, TIP - BACK, 2 * W + 2, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, h = half(cx);
    const d = Math.abs(cy) / h;
    if (!(d <= 1)) return 0;
    return C[d < 0.35 || (cx > TIP - 4 && d < 0.7) ? 7 : d < 0.7 ? 6 : cy > 0 ? 4 : 5];
  });
  // a flare on the point: a ray ahead and two short ones across, growing and shrinking twice a loop
  const r = 1 + Math.round(pulse * 2);
  for (let d = 1; d <= r; d++) p.px(TIP - 1 + d, 0, C[d === r ? 5 : 7]);
  for (let d = 1; d < r; d++) for (const sy of [-1, 1]) p.px(TIP - 3, sy * (1 + d), C[d === r - 1 ? 5 : 6]);

  // glints left behind: each pops as a small star and dwindles to a dot as it falls back
  for (let j = 0; j < 5; j++) {
    const k = 1 + (j % 2), v = ph * k + rand(j, s), u = v % 1, cycle = Math.floor(v) % k;
    if (u > 0.75) continue;
    const x = BACK - 1 - u * 20, y = (rand(j, cycle, s + 1) - 0.5) * 10;
    const arm = u < 0.2 ? 2 : u < 0.5 ? 1 : 0;
    for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(x + dx, y + dy, C[d === arm ? 5 : 6]);
    p.px(x, y, C[u < 0.5 ? 7 : 5]);
    p.light(x, y, C[5], 0.4 * (1 - u));
  }
}
