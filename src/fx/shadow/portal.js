import { rand } from '../../core/index.js';

export const meta = {
  name: 'Portal',
  desc: 'A summoning portal standing on the ground: a swirling dark oval inside a flickering violet rim, motes drawn into it',
  tags: ['ambient', 'shadow', 'portal', 'magic', 'summon'],
  size: [60, 76],
  origin: [30, 70],
  duration: 2,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8, rim: 8 },
  options: { palette: 'shadow', rim: 'arcane', seed: 1 },
  sound: [
    // a slow swirl of low wind, a whoosh each half second, and a dark bell under it
    { t: 0, kind: 'whoosh', gain: 0.3, pitch: 0.35 },
    { t: 0.5, kind: 'whoosh', gain: 0.22, pitch: 0.4 },
    { t: 1, kind: 'whoosh', gain: 0.3, pitch: 0.35 },
    { t: 1.5, kind: 'whoosh', gain: 0.22, pitch: 0.4 },
    { t: 0.3, kind: 'chime', gain: 0.12, pitch: 0.5 },
  ],
};

const TAU = Math.PI * 2;
const CY = -28; // the oval's center: it hovers just above the ground at 0
const RX = 13, RY = 24;
const ARMS = 3;
const MOTES = 14;

// The rim's radius (1 = the oval) at angle a: it ripples, whole cycles per loop.
const edge = (a, ph) => 1 + 0.04 * Math.sin(3 * a + TAU * ph * 2) + 0.025 * Math.sin(5 * a - TAU * ph * 3);

// A mote drawn into the portal: it spirals in faster and faster and is gone at the rim. k trips a loop.
function mote(j, ph, s) {
  const k = 1 + (j % 2), v = ph * k + rand(j, s), u = v % 1, cycle = Math.floor(v) % k;
  const a0 = TAU * rand(j, cycle, s + 1);
  const at = w => {
    const r = (1 - w) ** 1.6, a = a0 + 1.8 * w * w; // turning with the swirl
    return [Math.cos(a) * RX * (1 + 1.3 * r), CY + Math.sin(a) * RY * (1 + 0.2 * r)]; // in from the sides, never below the ground
  };
  return { u, at };
}

export function drawBack(p, t, o) {
  const R = o.rim, ph = t / meta.duration, pulse = 0.5 + 0.5 * Math.sin(TAU * ph * 2);
  p.glow(0, CY, 30, R[4], 0.25 + 0.08 * pulse);
  p.glowLine(-14, -1, 14, -1, 6, R[5], (u, d) => (0.22 + 0.06 * pulse) * (1 - d) ** 2 * Math.sin(Math.PI * u)); // its light on the ground
}

export function draw(p, t, o) {
  const S = o.palette, R = o.rim, s = o.seed, ph = t / meta.duration;

  p.shade(-RX - 3, CY - RY - 3, 2 * RX + 6, 2 * RY + 6, (x, y) => {
    const nx = (x + 0.5) / RX, ny = (y + 0.5 - CY) / RY, d = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
    const e = edge(a, ph);
    if (d > e) return 0;
    const arm = Math.sin(ARMS * a + 7 * d - TAU * ph * 2); // spiral arms turning, two steps a loop
    if (d > e - 0.07) return R[arm > 0.6 ? 7 : arm > -0.4 ? 6 : 5]; // the rim, hottest where an arm reaches it
    if (d > e - 0.15) return arm > 0.2 ? R[4] : S[5];
    const b = (0.5 + 0.5 * arm) * d ** 1.2; // the arms fade into the dark at the center
    return S[b > 0.6 ? 6 : b > 0.42 ? 5 : b > 0.27 ? 4 : b > 0.14 ? 2 : d < 0.3 ? 0 : 1];
  });

  for (let i = 0; i < 2; i++) { // sparks of energy crawling round the rim, just outside it
    const c = TAU * (ph * (i + 1) + i * 0.4) * (i ? -1 : 1);
    for (let j = 0; j < 6; j++) {
      const a0 = c + j * 0.12, a1 = a0 + 0.12, r0 = edge(a0, ph) + 0.1, r1 = edge(a1, ph) + 0.1;
      p.line(Math.cos(a0) * RX * r0, CY + Math.sin(a0) * RY * r0, Math.cos(a1) * RX * r1, CY + Math.sin(a1) * RY * r1, R[j > 3 ? 7 : j > 1 ? 6 : 4]);
    }
  }

  for (let i = 0; i < 16; i++) { // the rim casts light round the oval; each piece dims at its ends so the joints don't knot
    const a0 = (i / 16) * TAU, a1 = ((i + 1) / 16) * TAU;
    const p0 = [Math.cos(a0) * RX, CY + Math.sin(a0) * RY], p1 = [Math.cos(a1) * RX, CY + Math.sin(a1) * RY];
    p.glowLine(...p0, ...p1, 5, R[5], (u, d) => 0.28 * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * u)));
  }

  for (let j = 0; j < MOTES; j++) {
    const { u, at } = mote(j, ph, s);
    if (u > 0.95) continue;
    const [x, y] = at(u), near = u > 0.6;
    p.line(...at(Math.max(0, u - 0.08)), x, y, w => (w > 0.5 ? (near ? R[6] : S[7]) : near ? R[4] : S[5])); // a streak behind it
    p.light(x, y, R[5], 0.3 * u);
  }
}
