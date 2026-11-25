import { rand } from '../../core/index.js';

export const meta = {
  name: 'Steam vent',
  desc: 'A crack in the floor glowing with heat, breathing out a thin wisp of steam and, twice a loop, a hissing burst that rolls up, leans and thins away',
  tags: ['fire', 'steam', 'vent', 'geyser', 'smoke', 'ambient', 'prop'],
  size: [48, 72],
  origin: [24, 64],
  duration: 2,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8, smoke: 8 },
  options: { palette: 'fire', smoke: 'smoke', seed: 1 },
  stage: { x: 8 }, // clear of the caster
  // a hiss with each burst, the second softer
  sound: [{ t: 0, kind: 'whoosh', gain: 0.35, pitch: 0.8 }, { t: 1, kind: 'whoosh', gain: 0.25, pitch: 0.9 }],
};

const TAU = Math.PI * 2;
const BURSTS = [0, 0.5]; // loop phases a burst leaves the vent
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Every puff alive at loop phase ph: born at a fixed phase each loop and living less than a loop, so the same puffs
// come round every time. A burst feeds a plume for a quarter second; the wisp between bursts is thin and slow.
function puffs(ph, s) {
  const list = [];
  const add = (j, birth, life, v, r0, r1, a0) => {
    const u = ((((ph - birth) % 1) + 1) % 1) / life;
    if (u >= 1) return;
    const side = (rand(j, s, 1) - 0.5) * 14, rise = v * (1 - (1 - u) ** 2);
    const x = side * u + 9 * u * u + 1.5 * Math.sin(TAU * u * 1.5 + j), r = r0 + (r1 - r0) * u ** 0.6;
    list.push({ x, y: -1 - rise, r, a: a0 * (1 - smooth(0.4, 1, u)) * smooth(0, 0.08, u), u });
  };
  BURSTS.forEach((b, k) => {
    for (let i = 0; i < 10; i++) {
      const j = k * 20 + i, v = (34 + 22 * rand(j, s, 3)) * (1 - 0.15 * k);
      add(j, b + i * 0.012, 0.5 + 0.15 * rand(j, s, 2), v, 2, 6 + 3 * rand(j, s, 4), 0.5);
    }
  });
  for (let i = 0; i < 24; i++) add(50 + i, i / 24, 0.5, 22 + 4 * rand(i, s, 5), 2, 4.5, 0.22); // the wisp between bursts
  return list.sort((p, q) => p.y - q.y); // lower puffs roll over the ones above
}

export function draw(p, t, o) {
  const C = o.palette, S = o.smoke, s = o.seed, ph = t / meta.duration;
  // the heat in the crack swells as a burst leaves
  const surge = Math.max(...BURSTS.map((b, k) => Math.exp(-((((ph - b) % 1) + 1) % 1) / 0.1) * (1 - 0.3 * k)));

  p.glowLine(-6, -1, 6, -1, 6, C[4], 0.25 + 0.35 * surge);
  p.glow(0, -6, 12, C[4], 0.1 + 0.25 * surge); // lighting the base of the column

  for (const q of puffs(ph, s)) {
    const { x, y, r, a, u } = q, lit = u < 0.15; // fresh from the vent, a puff catches its glow underneath
    p.disc(x, y, r, (dx, dy) => {
      if (lit && dy > r * 0.4) return C[4];
      if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.4) return S[6];
      return S[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.85 ? 3 : 5];
    }, (dx, dy, d) => a * smooth(1, 0.5, d));
  }

  // the crack: dark broken lips round a seam of heat, hottest in the middle
  p.line(-8, -1, 8, -1, C[1]);
  p.line(-8, 1, 8, 1, C[0]);
  p.line(-7, 0, 7, 0, u => C[Math.abs(u - 0.5) < 0.22 ? (surge > 0.4 ? 7 : 6) : Math.abs(u - 0.5) < 0.38 ? 5 : 3]);
  for (const x of [-5, 2]) p.px(x, -1, C[0]); // where the lips nearly meet
}
