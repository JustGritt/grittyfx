import { rand } from '../../core/index.js';

export const meta = {
  name: 'Signal flare',
  desc: "An artillery spotter's flare hanging under a little parachute: a blinding red core sputtering burning drips, a smoke trail drifting up, swaying slowly as it sinks, its red light washing the ground",
  tags: ['military', 'flare', 'signal', 'artillery', 'light'],
  size: [100, 104],
  origin: [50, 96],
  duration: 3,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8, smoke: 6 },
  options: { palette: ['#1c0610', '#3e0a1e', '#6c0e2a', '#a4153a', '#dc2448', '#ff5468', '#ff9cac', '#fff0f2'], smoke: 'smoke', seed: 1 },
  stage: { at: 'above', ground: 0 }, // the anchor on the floor under the target; the flare hangs high over its head
  sound: [{ t: 0, kind: 'crackle', gain: 0.45, pitch: 1.3 }], // a steady sputter
};

const TAU = Math.PI * 2;
const FY = -44, LINES = 13; // the flare's height over the floor; the canopy above it
const DRIPS = 12, PUFFS = 16;

// The flare and the canopy at phase v: it swings under the canopy, lowest as it passes the middle.
function hang(v) {
  const a = TAU * v;
  return { x: 4 * Math.sin(a - 0.5), y: FY + 1.2 * Math.cos(2 * a - 1), cx: 1.5 * Math.sin(a), cy: FY - LINES + 0.5 * Math.cos(2 * a - 1) };
}

export function draw(p, t, o) {
  const C = o.palette, M = o.smoke, s = o.seed, ph = t / meta.duration, n = Math.floor(ph * 45 + 1e-6);
  const h = hang(ph), flick = 0.5 + 0.2 * Math.sin(TAU * ph * 7) + 0.15 * Math.sin(TAU * ph * 17 + 1) + 0.15 * (rand(n, s, 9) - 0.5) * 2;

  // the red light over everything below, a pool of it on the floor
  p.glow(h.x, h.y, 44, C[4], d => (0.2 + 0.06 * flick) * (1 - d) ** 1.3);
  p.glowLine(h.x * 0.6 - 22, 0, h.x * 0.6 + 22, 0, 6, C[4], (l, d) => (0.4 + 0.1 * flick) * (1 - d) ** 2 * (1 - (2 * l - 1) ** 2));

  // the smoke trail: puffs left where the flare was, rising slowly, drifting off with the wind, swelling and thinning
  for (let j = 0; j < PUFFS; j++) {
    const u = (ph + j / PUFFS) % 1, b = hang(ph - u), r = 1.5 + 5.5 * u ** 0.8;
    const x = b.x - 18 * u ** 1.6 + Math.sin(TAU * (u + rand(j, s))) * 1.5, y = b.y - 3 - 36 * (1 - (1 - u) ** 1.4);
    const a0 = 0.8 * (1 - u) ** 1.2 * Math.min(1, u / 0.04);
    p.disc(x, y, r, (dx, dy) => {
      if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return M[u < 0.25 ? 4 : 3];
      return M[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? 1 : 2];
    }, (dx, dy, d) => a0 * Math.min(1, (1 - d) / 0.45));
  }

  // the canopy: a little dome of silk, lit from above, its hem catching the flare's light; the shroud lines
  for (const side of [-1, 1]) p.line(h.cx + side * 5, h.cy, h.x + side * 0.5, h.y - 4, M[3], 0.8);
  p.ellipse(h.cx, h.cy, 6, 4, (dx, dy) => dy > 0 ? 0 : dy > -1 ? C[4] : Math.abs(Math.abs(dx) - 2.5) < 0.5 && dy > -3 ? M[2] : dx + dy < -3.5 ? M[4] : dx > 3 ? M[2] : M[3]);

  // the canister, then the core burning out of its foot: white hot, a red-pink corona, sputtering rays
  for (const dy of [-3, -2]) {
    p.px(h.x - 1, h.y + dy, M[2]);
    p.px(h.x, h.y + dy, M[1]);
  }
  p.glow(h.x, h.y, 13, C[5], 0.5 + 0.25 * flick);
  p.glow(h.x, h.y, 6, C[6], 0.4 + 0.2 * flick);
  // too bright to look at: a cross of light flaring off it, longest across
  p.glowLine(h.x - 10, h.y, h.x + 10, h.y, 1.5, C[6], (l, d) => (0.3 + 0.3 * flick) * (1 - Math.abs(2 * l - 1)) ** 2 * (1 - d));
  p.glowLine(h.x, h.y - 6, h.x, h.y + 6, 1.5, C[6], (l, d) => (0.25 + 0.25 * flick) * (1 - Math.abs(2 * l - 1)) ** 2 * (1 - d));
  for (let k = 0; k < 4; k++) {
    const a = TAU * rand(k, n, s), len = 2 + 3 * rand(k, n, s + 1);
    if (rand(k, n, s + 2) < 0.6) p.line(h.x + Math.cos(a) * 2, h.y + Math.sin(a) * 2, h.x + Math.cos(a) * len, h.y + Math.sin(a) * len, l => C[l < 0.5 ? 6 : 5]);
  }
  const r = 2.2 + 0.8 * flick;
  p.circle(h.x, h.y, r, (dx, dy, d) => C[d < 0.4 ? 7 : d < 0.7 ? 6 : 5]);

  // burning drips falling off it, sputtering, cooling as they fall
  for (let j = 0; j < DRIPS; j++) {
    const k = 5, v = ph * k + (j + 0.6 * rand(j, s)) / DRIPS, u = v % 1, cycle = Math.floor(v);
    if (rand(j, n, s + 3) < 0.15) continue; // a sputter
    const b = hang(ph - u / k), age = u * (meta.duration / k), vx = (rand(j, cycle, s) - 0.5) * 16;
    const pos = a => [b.x + vx * a, b.y + 2 + 4 * a + 50 * a * a];
    const [x, y] = pos(age);
    if (u < 0.7) p.line(...pos(Math.max(0, age - 0.05)), x, y, l => C[(u < 0.3 ? 7 : u < 0.5 ? 6 : 5) - (l < 0.5 ? 1 : 0)]);
    else p.px(x, y, C[4]);
    p.light(x, y, C[5], 0.5 * (1 - u));
  }
}
