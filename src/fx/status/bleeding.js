import { rand } from '../../core/index.js';

const DURATION = 1.6;
const BEATS = [0, 0.8]; // a heartbeat: the gash throbs and spurts, toward the front, then the back
const G = 300; // px/s², what the drops fall by
const GASH = [2, -10], NICK = [5, -15]; // a cut across the chest, a nick on the shoulder
const JET = 5; // droplets in a spurt, let go one after another so they string out along the arc
// The gash, '1' its dark slit, the rest its lips, lit from the upper left. x, y from GASH.
const CUT = ['..65', '.614', '514.', '34..'];
// Drops that well up under a wound, swell, let go and fall: [x, y they hang from, when they let go]
const DRIPS = [[GASH[0] - 2, GASH[1] + 4, 0.5], [NICK[0], NICK[1] + 3, 1.25]];
// How long something thrown from y0 at vy takes to hit the floor (y = 0).
const landing = (y0, vy) => (-vy + Math.sqrt(vy * vy - 2 * G * y0)) / G;

export const meta = {
  name: 'Bleeding',
  desc: 'A bleed status over a body: a gash that throbs with each heartbeat and spurts, drops that well up and fall, spatters on the floor that fade',
  tags: ['status', 'debuff', 'bleed', 'blood', 'wound', 'dot', 'gore'],
  size: [40, 30],
  origin: [20, 26],
  duration: DURATION,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'blood', seed: 1 },
  stage: { at: 'target', ground: 0 }, // over the whole body, from its feet
  sound: [
    ...BEATS.map((t, i) => ({ t, kind: 'thump', gain: 0.28, pitch: 3.6 + 0.3 * i })), // a wet plip on each spurt
    ...DRIPS.map(([, y, r], i) => ({ t: r + landing(y + 1, 0), kind: 'thump', gain: 0.15, pitch: 4.4 + 0.4 * i })), // a drop landing
  ].sort((a, b) => a.t - b.t),
};

const age = (t, t0) => (((t - t0) % DURATION) + DURATION) % DURATION;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// The heart: a beat and its echo, lub-dub, as a level from 0 to 1.
const heart = (t, tau) => Math.max(...BEATS.map(b => {
  const a = age(t, b);
  return Math.exp(-a / tau) + (a > 0.16 && a < 0.6 ? 0.55 * Math.exp(-(a - 0.16) / tau) : 0);
}));

// A drop in flight: a bright head and a short tail behind it, along its motion.
function drop(p, C, x, y, vx, vy, big) {
  const v = Math.hypot(vx, vy) || 1, len = clamp(v * 0.025, 0.5, 3);
  p.line(x - (vx / v) * len, y - (vy / v) * len, x, y, u => C[u > 0.5 ? 5 : 4]);
  p.px(x, y, C[big ? 7 : 6]);
}

// Where a drop hit the floor `a` seconds ago: a crown that hops out, then a spatter that darkens, shrinks and goes.
function splash(p, C, x, a, w, crown = true) {
  x = Math.round(x);
  if (crown && a < 0.16) {
    const k = a / 0.16, d = 1 + 2.5 * k, hop = 2.5 * Math.sin(Math.PI * k);
    p.px(x - d, -1 - hop, C[k < 0.5 ? 6 : 5]);
    p.px(x + d, -1 - hop * 0.7, C[k < 0.5 ? 6 : 5]);
  }
  const k = a / 0.7; // gone before its drop wells up again
  if (k >= 1) return;
  const half = Math.round(w * (1 - k * 0.4) - 0.5);
  p.line(x - half, 0, x + half, 0, C[k < 0.2 ? 6 : k < 0.5 ? 5 : 4], 1 - clamp((k - 0.55) / 0.45, 0, 1));
  if (k < 0.25) p.px(x, -1, C[5]); // the drop's own bead, before it spreads
}

export function drawBack(p, t, o) {
  p.glow(0, -12, 16, o.palette[4], 0.2 * heart(t, 0.09)); // the body flushes on the beat
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, beat = heart(t, 0.07), hot = beat > 0.5 ? 2 : beat > 0.2 ? 1 : 0;
  const [gx, gy] = GASH;

  // the gash, swelling bright on the beat; blood runs from its low end
  CUT.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && p.px(gx - 2 + i, gy - 2 + j, C[Math.min(7, +ch + hot)])));
  p.line(gx - 2, gy + 2, gx - 2, gy + 3, u => C[u < 0.4 ? 5 : 4]);
  p.glow(gx + 0.5, gy + 0.5, 7, C[5], 0.12 + 0.5 * beat);
  // the nick, smaller, oozing
  p.px(NICK[0], NICK[1], C[1]);
  p.px(NICK[0] + 1, NICK[1] - 1, C[5]);
  p.px(NICK[0] - 1, NICK[1] + 1, C[4]);
  p.line(NICK[0], NICK[1] + 1, NICK[0], NICK[1] + 2, C[4]);

  // a little pool under the body, fed by the drips, soaking away
  const wet = Math.max(...DRIPS.map(([, , r]) => { const a = age(t, r + 0.25); return a < 1 ? 1 - a : 0; }));
  p.ellipse(GASH[0] - 1.5, 0.5, 1.5 + 1.5 * wet, 0.9, dx => C[dx < -1 ? 4 : 3]); // one row: the floor

  for (const [x, y0, r] of DRIPS) {
    const a = age(t, r - 0.6);
    if (a < 0.6) { // the drop swells and sags
      const g = a / 0.6;
      p.circle(x + 0.5, y0 + 0.5 + g * 0.8, 0.5 + 0.6 * g, C[g > 0.5 ? 6 : 5]);
      if (g > 0.5) p.px(x, y0 + Math.round(g * 0.8), C[7]);
      continue;
    }
    const f = a - 0.6, fall = landing(y0 + 1, 0);
    if (f < fall) drop(p, C, x, y0 + 1 + (G * f * f) / 2, 0, G * f, true);
    else splash(p, C, x, f - fall, 1.5 + rand(r * 100, s) * 1.2);
  }

  BEATS.forEach((b, i) => {
    const a = age(t, b), side = i % 2 ? 1 : -1, x0 = gx + (side > 0 ? 1 : -2), y0 = gy - 1;
    const v = 18 + 6 * rand(i, s), up = 32 + 8 * rand(i, s, 1);
    for (let j = 0; j < JET; j++) { // a spurt: droplets strung out along one arc, the first ones flung farthest
      const f = a - j * 0.025, k = 1 - j * 0.09, vx = side * v * k, vy = -up * k;
      if (f < 0) continue;
      const fly = landing(y0, vy);
      if (f < fly) drop(p, C, x0 + vx * f, y0 + vy * f + (G * f * f) / 2, vx, vy + G * f, j === 0);
      else if (j % 2 === 0) splash(p, C, x0 + vx * fly, f - fly, j === 0 ? 1.6 : 0.9, j === 0);
    }
    const k = a / 0.7;
    if (k < 1) for (let j = 0; j < 3; j++) { // specks the spurt left on the skin, round the cut
      const x = gx + side * (1 + Math.round(rand(j, i, s + 5) * 3)), y = gy - 2 + Math.round(rand(j, i, s + 6) * 5);
      p.dot(x, y, C[k < 0.4 ? 5 : 3], 1 - k * k);
    }
  });
}
