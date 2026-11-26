import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 3;

export const meta = {
  name: 'Smoke grenade',
  desc: 'A smoke screen that holds: a canister hissing on the floor, thick grey clouds billowing out and up in layers that roll slowly round a dense core',
  tags: ['smoke', 'military', 'grenade', 'screen', 'smokescreen', 'cover', 'cloud', 'canister', 'concealment'],
  size: [100, 72],
  origin: [50, 68],
  duration: DURATION,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'smoke', seed: 1 },
  stage: { at: 'ground', x: 40, looks: { gather: 'windup', point: 'throw', crouch: 'windup', raise: 'throw' } }, // popped beside the caster, screening the ground ahead of them
  sound: Array.from({ length: 8 }, (_, i) => ({ t: (i * DURATION) / 8, kind: 'whoosh', gain: 0.22, pitch: i % 2 ? 0.5 : 0.44 })), // a steady hiss
};

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const CY = -18, RX = 30, RY = 24; // the dome the cloud fills: its middle and half sizes

// The core, a heap that peaks in the middle: big volumes that only sway, so the screen stays dense. [x, y, r]
const CORE = [[-25, -9, 10], [23, -8, 10], [-10, -13, 12], [10, -14, 12], [0, -26, 13], [-15, -28, 10], [14, -30, 10], [2, -38, 9], [-7, -35, 8], [-26, -21, 7], [27, -19, 8]];
// Lobes in front of the core, flanking the canister. [x, y, r]
const FRONT = [[-14, -7, 8], [14, -7, 8], [-27, -12, 6], [26, -14, 6.5]];
const tone = y => (y < -32 ? 5 : y < -18 ? 4 : 3); // lit from above

// A lobe lit from above-left: a crescent of light along its top edge (a disc of light in the middle would make each
// lobe a ball, the cloud a bunch of grapes), the body, a thin rim one step darker down-right. Small ones are flat.
// Flat where it sits on the floor.
function puff(p, C, { x, y, r, a, tone }) {
  if (a <= 0.01 || r < 0.5) return;
  const lit = r > 6; // on smaller ones the crescent is a stray sliver
  p.disc(x, y, r, (dx, dy) => {
    if (lit && dy < r * 0.25 && Math.hypot(dx - r * 0.22, dy - r * 0.3) > r * 0.86) return C[Math.min(7, tone + 1)];
    return C[lit && tone > 3 && Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone]; // the lobes in shadow have no rim: theirs meet in patches dark as holes
  }, (dx, dy, d) => (y + dy > 0 ? 0 : a * smooth(1, 0.7, d)));
}

// Lobes that well up at the top of the dome and roll slowly down its sides, swelling, until they thin away. Each has
// its own slot on the dome and its own phase, so the cloud never pulses as one.
function rollers(ph, s) {
  const list = [];
  for (let j = 0; j < 12; j++) {
    const side = j % 2 ? 1 : -1, u = (ph + (j + 0.5 * rand(j, s)) / 12) % 1;
    const a0 = -Math.PI / 2 + side * (0.05 + 0.85 * ((j >> 1) / 6) + 0.1 * rand(j, s, 1)), ang = a0 + side * 0.6 * u;
    const r = (6.5 + 3 * rand(j, s, 2)) * (0.6 + 0.5 * u), bulge = 1 + 0.12 * u;
    const x = Math.cos(ang) * RX * bulge, y = Math.min(CY + Math.sin(ang) * RY * bulge, -r * 0.75);
    list.push({ x, y, r, a: 0.95 * smooth(0, 0.2, u) * (1 - smooth(0.65, 1, u)), tone: tone(y) });
  }
  for (let j = 0; j < 3; j++) { // the top boils: lobes rise off it, swell and thin away
    const u = (ph + j / 3 + 0.15 * rand(j, s, 9)) % 1, r = (5 + 2 * rand(j, s, 10)) * (0.7 + 0.5 * u);
    list.push({ x: (j - 1) * 11 + 4 * (rand(j, s, 11) - 0.5) + 3 * u, y: -36 - 13 * u, r, a: 0.9 * smooth(0, 0.25, u) * (1 - smooth(0.45, 1, u)), tone: 5 });
  }
  return list;
}

// Low lobes rolling out along the floor both ways, the screen's skirt.
function skirt(ph, s) {
  const list = [];
  for (let j = 0; j < 6; j++) {
    const side = j % 2 ? 1 : -1, u = (ph + (j + 0.5 * rand(j, s, 6)) / 6) % 1, r = (5 + 2 * rand(j, s, 7)) * (0.7 + 0.5 * u);
    list.push({ x: side * (16 + 24 * u), y: -r * 0.75, r, a: 0.92 * smooth(0, 0.2, u) * (1 - smooth(0.55, 1, u)), tone: 3 });
  }
  return list;
}

// The core and the front lobes, swaying on whole cycles of the loop.
function sway(list, ph, s, seed, a) {
  return list.map(([x, y, r], j) => {
    const w = TAU * (ph + rand(j, s, seed));
    return { x: x + Math.sin(w) * 1.5, y: y + Math.cos(w), r: r + Math.sin(2 * w) * 0.7, a, tone: tone(y) };
  });
}

// The hiss: small bright puffs spat out of the canister, rising fast and swelling into the cloud, over a spray that
// flickers at the nozzle.
function jet(p, C, ph, s) {
  for (let j = 0; j < 6; j++) {
    const u = (ph * 4 + j / 6 + 0.1 * rand(j, s, 4)) % 1, sway = Math.sin(TAU * (u + rand(j, s, 5))) * 2 * u;
    puff(p, C, { x: sway, y: -10 - 20 * (1 - (1 - u) ** 2), r: 1.2 + 3.8 * u, a: 0.9 * (1 - smooth(0.5, 1, u)), tone: u < 0.3 ? 6 : 5 });
  }
  const f = Math.floor(ph * 36) % 36; // the frame, so the flicker loops
  p.beam(0.5, -10, 0.5, -13 - 3 * rand(f, 1, s), 2, C[7]);
}

// The canister standing on the floor: a dark tin, lit down its left side, a band round it, the nozzle on top.
function canister(p, C) {
  [1, 4, 3, 2, 1].forEach((c, i) => p.line(i - 2, -8, i - 2, -1, C[c]));
  p.line(-2, -4, 2, -4, C[1]);
  p.line(-2, -9, 2, -9, C[5]);
  p.px(0, -10, C[3]);
  p.line(-3, -0.5, 3, -0.5, C[0]);
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  p.ellipse(0, CY + 2, RX - 2, RY - 4, (dx, dy) => CY + 2 + dy < 0 && C[3]); // a solid body behind the lobes: where their soft edges meet the screen never opens
  for (const q of rollers(ph, s)) puff(p, C, q);
  for (const q of sway(CORE, ph, s, 3, 0.96)) puff(p, C, q);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  for (const q of skirt(ph, s)) puff(p, C, q);
  for (const q of sway(FRONT, ph, s, 8, 0.95)) puff(p, C, q);
  jet(p, C, ph, s);
  canister(p, C);
}
