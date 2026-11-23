import { tileFbm, rand } from '../../core/index.js';

export const meta = {
  name: 'Water bolt',
  desc: 'A flying ball of churning water: swirling bands under a glinting skin, a foam bow wave, a wake of spray that breaks up behind and droplets shed as it goes',
  tags: ['water', 'projectile', 'magic', 'bolt'],
  size: [48, 26],
  origin: [36, 13],
  duration: 0.5,
  loop: true,
  fps: 16,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'water', seed: 1 },
  sound: [
    { t: 0, kind: 'crackle', gain: 0.35, pitch: 0.35 }, // a low churning gurgle
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 0.72 }, // rushing air, one loop long
  ],
};

const TAU = Math.PI * 2;
const R = 5.5; // the ball's radius
const L = 30; // the wake's length
// Wake streams: drift off the axis at the tip, length, width at the ball, waves per loop, phase.
const WAKE = [[0, 1, 4.5, 2, 0], [-3.5, 0.6, 2.8, 3, 0.35], [3.5, 0.7, 2.8, 2, 0.7]];

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration, side = o.view !== 'top';

  p.glowLine(-22, 0, 0, 0, 7, C[5], (u, d) => 0.3 * u * (1 - d) ** 2);
  p.glow(0, 0, 12, C[5], 0.45);

  p.shade(-L - 2, -9, L + R + 6, 18, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, th = Math.atan2(cy, cx), rho = Math.hypot(cx < 0 ? cx / 1.25 : cx, cy);
    // the ball: a skin that churns, three and five lobes running round it, whole turns per loop
    const edge = R + 0.7 * Math.sin(3 * th - TAU * ph * 2) + 0.4 * Math.sin(5 * th + TAU * ph * 3);
    if (rho <= edge) {
      const e = 1 - rho / edge, lit = (-0.6 * cx - 0.8 * cy) / R; // lit from up-left in its own frame
      const swirl = Math.sin(2 * th + 1.6 * rho - TAU * ph * 2); // spiral bands winding in as it turns
      const v = 0.42 + 0.3 * lit + 0.15 * e + 0.2 * swirl;
      if (e < 0.16) return C[lit > 0.2 ? 5 : 3]; // the skin's rim
      return C[v > 0.82 ? 7 : v > 0.64 ? 6 : v > 0.45 ? 5 : v > 0.25 ? 4 : 3];
    }
    if (cx > 0) return 0;
    // the wake: streams of spray that wave and break up into flecks further back
    let e = 0;
    for (const [dy, len, w, k, phase] of WAKE) {
      const v = -cx / (L * len);
      if (v <= 0 || v >= 1) continue;
      const mid = dy * v * v + Math.sin(TAU * (v * 1.2 - ph * k + phase)) * 1.6 * v;
      const half = w * (1 - v) ** 1.2;
      if (half > 0.5) e = Math.max(e, 1 - Math.abs(cy - mid) / half);
    }
    if (e <= 0) return 0;
    // streaks of spray, long across and thin, streaming back two whole tiles per loop
    const u = -cx / L, n = tileFbm(cx * 0.15 + ph * 12, cy * 0.9, 6, 2, s);
    if (n < 0.3 + 0.45 * u - 0.25 * e) return 0; // holes, more of them further back
    const heat = e * (1.1 - u) + (n - 0.5) * 0.6;
    return C[heat > 0.75 ? 7 : heat > 0.55 ? 6 : heat > 0.35 ? 5 : heat > 0.15 ? 4 : 3];
  });

  // the bow wave: a foam crescent pushed ahead of the ball, swelling and slackening as it churns
  const bow = 2 + 0.6 * Math.sin(TAU * ph * 2);
  p.arc(0, 0, R + 0.4, -1.2, 1.2, bow, (u, e) => C[e > 0.2 ? 7 : 6]);
  p.circle(-1.6, -1.8, 1.3, C[7]); // the glint on its skin

  for (let j = 0; j < 8; j++) { // droplets shed off the skin: left behind, they spread, and fall in the side view
    const u = (ph * (1 + (j % 2)) + rand(j, s)) % 1;
    if (u > 0.85) continue;
    const sgn = j % 2 ? 1 : -1, x = -3 - 30 * u ** 1.3, y = sgn * (2.5 + rand(j, s, 1) * 2 + 5 * u) + (side ? 6 * u * u : 0);
    p.line(x + 1 + 2 * (1 - u), y - (side ? 1.2 * u : 0), x, y, q => C[q > 0.5 ? (u < 0.3 ? 7 : 6) : u < 0.5 ? 5 : 4]);
  }
}
