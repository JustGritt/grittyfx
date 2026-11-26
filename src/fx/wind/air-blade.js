import { rand } from '../../core/index.js';

export const meta = {
  name: 'Air blade',
  desc: 'A crescent of pressed air flying edge first: a thin bright leading edge that shimmers, streaks peeling off its tips and curling as they fade, dust caught in its wake',
  tags: ['projectile', 'thrown', 'wind', 'air', 'blade', 'crescent', 'ninja'],
  size: [36, 30],
  origin: [30, 15],
  duration: 0.4,
  loop: true,
  fps: 30,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, dust: 6 },
  options: { palette: 'wind', dust: 'dust', seed: 1 },
  sound: [
    // a thin whistle of air cut twice a loop
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 2.4 },
    { t: 0.2, kind: 'whoosh', gain: 0.24, pitch: 2.7 },
  ],
};

const TAU = Math.PI * 2;
const R = 7, W = 3, SPAN = 1.4; // the crescent's radius, its width at the front, its half-angle (radians)
const CX = -(R + W / 2); // the circle's center, so the front edge sits at the anchor
const TIP = CX + R * Math.cos(SPAN); // the tips' x
// Streaks: which tip (-1 top, 1 bottom), y off the tip toward the axis, length, how much it bends out, curl, phase.
const STREAKS = [[-1, 0, 13, 0.008, 1, 0], [-1, 2, 7, 0, 0, 0.5], [1, 0, 13, 0.008, 1, 0.25], [1, 2, 7, 0, 0, 0.75]];
const clamp01 = v => Math.max(0, Math.min(1, v));
const ONE = () => 1;

// A streak u of the way through its life: it shoots back off the tip bending gently outward, peels away from the tip,
// and its end rolls over into a curl that tightens as it dims.
function streak(p, C, side, lane, len, bend, curl, u) {
  const y = side * (R * Math.sin(SPAN) - lane) + 0.5, at = s => [TIP - 1 - s, y + side * bend * s * s];
  // it goes by shrinking from the head into its curl, which then unwinds, rather than by darkening or dithering, so
  // it fades as cleanly on a light ground
  const end = len * (1 - (1 - clamp01(u * 3)) ** 2) + 6 * u, head = end * Math.min(1, (u / 0.85) ** 2), rc = 2 + 0.5 * u;
  const c = v => C[Math.max(3, Math.round(6.4 - 4 * u - 1.5 * v - lane / 2))];
  // the body in 4 px pieces, so it bends and dims along its length
  for (let s0 = head, n = Math.ceil((end - head) / 4); s0 < end - 1; s0 += (end - head) / n) {
    const s1 = Math.min(end, s0 + (end - head) / n);
    p.line(...at(s0), ...at(s1), c((s0 - head) / (end - head)));
  }
  if (!curl || u < 0.15) return;
  // the curl: from the end's heading, turning on outward and back over
  const [ex, ey] = at(end), e = Math.atan2(2 * side * bend * end, -1) + side * Math.PI / 2;
  const sweep = Math.PI * (0.7 + 0.8 * u), gone = clamp01((u - 0.8) / 0.2) * sweep;
  if (sweep - gone > 0.3) p.arc(ex - rc * Math.cos(e), ey - rc * Math.sin(e), rc, e - side * gone, e - side * sweep, ONE, () => c(1));
}

export function draw(p, t, o) {
  const C = o.palette, D = o.dust, s = o.seed, ph = t / meta.duration;

  for (const [side, lane, len, bend, curl, k] of STREAKS) streak(p, C, side, lane, len, bend, curl, (ph + k) % 1);

  // the crescent: the convex edge leads, brightest; it breathes a little and a glint runs tip to tip, twice a loop
  const glint = u => Math.cos(TAU * (u - ph * 2)), w = W * (1 + 0.15 * Math.sin(TAU * ph * 2));
  p.arc(CX, 0, R, -SPAN, SPAN, u => w * Math.sin(Math.PI * u) ** 1.2, (u, e) => {
    const tip = Math.sin(Math.PI * u), lift = glint(u) > 0.8 ? 1 : 0;
    return C[Math.max(2, Math.min(7, Math.round((e > 0.35 ? 7 : e > -0.35 ? 5.5 : 4) - 3 * (1 - tip) ** 2 + lift)))];
  });
  p.glow(-2, 0, 9, C[5], 0.25 + 0.08 * Math.sin(TAU * ph * 2));

  // dust caught in the wake: dragged back off the crescent and drawn out toward the curls, fading
  for (let j = 0; j < 3; j++) {
    const u = (ph + rand(j, s, 3)) % 1, y0 = (rand(j, s, 4) - 0.5) * 6;
    p.blend(-10 - 20 * u ** 1.3, y0 * (1 + 1.2 * u), D[j % 2 ? 5 : 4], 0.9 * (1 - u));
  }
}
