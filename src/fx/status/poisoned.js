import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2;
// Bubbles: when each starts in the loop (fixed, so the pops can be heard), twice a loop each.
const BUBBLES = [0, 0.09, 0.22, 0.31, 0.4, 0.58, 0.67, 0.81];
const K = 2, POP = 0.72, GONE = 0.84; // of a bubble's cycle: it rises until POP, bursts until GONE
const DRIP = 0.3; // of the loop: when the drop lets go

// Every pop, as a time in the loop.
const pops = BUBBLES.flatMap(off => [0, 1].map(m => ((((POP - off + m) / K) % 1) + 1) % 1)).sort((a, b) => a - b);

export const meta = {
  name: 'Poisoned',
  desc: 'A poison status over a body: green bubbles that rise and pop, a sickly drip that splashes at the feet, faint fumes',
  tags: ['status', 'poison', 'debuff', 'bubbles', 'toxic'],
  size: [44, 56],
  origin: [22, 50],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'poison', seed: 1 },
  stage: { at: 'target', ground: 0 }, // over the whole body, from its feet
  sound: [
    // a soft blub at every pop, the pitch wandering; a drop landing
    ...pops.map((ph, i) => ({ t: ph * DURATION, kind: 'thump', gain: 0.2 + 0.08 * (i % 3), pitch: 2.6 + 0.35 * ((i * 5) % 4) })),
    { t: (DRIP + 0.13) * DURATION, kind: 'thump', gain: 0.2, pitch: 4.2 },
  ],
};

const smooth = x => x * x * (3 - 2 * x);

// A bubble j in its cycle: where it is, how big, and u (0 to 1 over its cycle).
function bubble(j, ph, s) {
  const v = ph * K + BUBBLES[j], u = v % 1, c = Math.floor(v) % K;
  const r0 = rand(j, c, s), r1 = rand(j, c, s + 1), r2 = rand(j, c, s + 2);
  const x0 = (((j * 3) % 8) / 7 - 0.5) * 18 + (r0 - 0.5) * 2.5; // each bubble in its own lane
  const y0 = -5 - r1 * 22, rise = 5 + 8 * r2, h = Math.min(u, POP) / POP;
  return {
    u,
    x: x0 + Math.sin(TAU * (h * 1.2 + r0)) * 1.2 * h,
    y: y0 - rise * (1 - (1 - h) ** 1.6),
    r: 0.8 + (1.4 + 1.2 * r2) * smooth(Math.min(1, h * 1.4)),
  };
}

function drawBubble(p, C, { x, y, r }) {
  x = Math.round(x);
  y = Math.round(y);
  if (r < 1.3) return void p.px(x, y, C[6]);
  const R = Math.round(r * 2) / 2; // whole or half px, so the rim is round
  const cx = x + (R % 1 ? 0.5 : 0), cy = y + (R % 1 ? 0.5 : 0);
  // a see-through skin: a faint tint, a rim lit up-left and shadowed down-right, a glint inside
  p.disc(cx, cy, R - 0.6, C[3], 0.3);
  p.ring(cx, cy, R - 0.6, 0.8, (dx, dy) => C[dx + dy < -R * 0.6 ? 7 : dx + dy > R * 0.5 ? 4 : 5]); // no square corners
  if (R >= 2) p.px(cx - R * 0.35, cy - R * 0.35, C[7]);
  p.light(cx, cy, C[6], 0.3);
}

// A burst: the skin tears into a broken ring, then droplets fly out and fall.
function drawPop(p, C, { x, y, r }, k) {
  x = Math.round(x) + 0.5;
  y = Math.round(y) + 0.5;
  if (k < 0.3) { // the skin tears into four bright pieces
    for (let i = 0; i < 4; i++) p.arc(x, y, r + 0.8, i * TAU / 4 - 1.1, i * TAU / 4 - 0.2, 1, C[7]);
    return;
  }
  const d = r + 0.5 + 2.5 * (1 - (1 - k) ** 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - 1.9;
    p.px(x + Math.cos(a) * d, y + Math.sin(a) * d + 3 * (k - 0.3) ** 2, C[k < 0.65 ? 6 : 4]);
  }
}

// The drip: a drop gathers under a hand, stretches, lets go, falls, splashes at the feet and soaks in.
function drip(p, C, ph, s) {
  const x = Math.round((rand(7, s) < 0.5 ? -1 : 1) * (7 + 2 * rand(8, s))), y0 = -22;
  const u = (ph - DRIP + 1.3) % 1 - 0.3; // -0.3 to 0 gathering, 0 to 0.13 falling, then the splash
  if (u < 0) {
    const g = (u + 0.3) / 0.3, len = Math.round(3 * g * g); // a bead swells and sags on a thread
    if (len) p.line(x, y0, x, y0 + len - 1, C[4]);
    p.circle(x + 0.5, y0 + len + 0.5, 0.6 + 0.8 * g, d => C[d < 0.5 && g > 0.5 ? 7 : 5]);
    p.light(x, y0 + len, C[6], 0.3 * g);
  } else if (u < 0.13) {
    const f = u / 0.13, y = y0 + 4 + (-y0 - 5) * f * f; // falling ever faster, a streak behind
    p.line(x, y - 1 - 3 * f, x, y - 1, t => C[t > 0.5 ? 5 : 3]);
    p.px(x, y, C[7]);
    p.px(x, y + 1, C[6]);
    p.light(x, y, C[6], 0.35);
  } else if (u < 0.55) {
    const k = (u - 0.13) / 0.42;
    p.ellipse(x + 0.5, 0, 1.5 + 2.5 * Math.min(1, k * 3), 1, C[k < 0.5 ? 5 : 4], 1 - k);
    if (k < 0.35) {
      const d = 1 + 5 * k, hop = 3 * Math.sin(Math.PI * k / 0.35);
      p.px(x - d, -1 - hop, C[6]);
      p.px(x + 1 + d, -1 - hop * 0.8, C[6]);
    }
  }
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION, breathe = 0.5 + 0.5 * Math.sin(TAU * ph * 2);
  p.glow(0, -18, 22, C[4], 0.14 + 0.06 * breathe);
  for (let j = 0; j < 6; j++) { // fumes rising off the body in wisps, curling, swelling and thinning
    const u = (ph + j / 6) % 1, side = j % 2 ? 1 : -1, x0 = side * (2 + 7 * rand(j, s)), a = 0.2 * Math.sin(Math.PI * u) ** 1.5;
    for (let i = 0; i < 3; i++) {
      const v = Math.max(0, u - i * 0.1), r = 2 + v * 4 - i * 0.5;
      const x = x0 + Math.sin(TAU * (v * 1.2 + rand(j, s, 1))) * (1.5 + 3 * v), y = -12 - v * 30;
      p.disc(x, y, r, (dx, dy) => C[dx + dy < -r * 0.4 ? 5 : 4], (dx, dy, d) => a * (1 - d * d));
    }
  }
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  drip(p, C, ph, s);
  for (let j = 0; j < BUBBLES.length; j++) {
    const b = bubble(j, ph, s);
    if (b.u < POP) drawBubble(p, C, b);
    else if (b.u < GONE) drawPop(p, C, b, (b.u - POP) / (GONE - POP));
  }
}
