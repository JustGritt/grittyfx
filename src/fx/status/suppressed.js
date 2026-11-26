import { rand } from '../../core/index.js';

const DURATION = 2.4;
const W = 64, H = 30, OX = 32, OY = 17; // the canvas; the anchor is the top of the head
const V = 420, LEN = 13, IN = OX + LEN; // rounds: px/s, streak length, where they start (off the left edge)
// Rounds: when each comes in (s), its lane (px over the head) and its slope. A burst of three, a straggler or two, a
// pair whose second clips the head (NEAR) and goes off, then a last pair.
const ROUNDS = [
  [0, -7, 0.02], [0.08, -3, -0.01], [0.15, -10, 0.03], [0.4, -4, 0.01], [0.62, -5, -0.02], [1.0, -12, 0.02],
  [1.3, -9, 0.01], [1.38, -1.5, 0], [1.95, -6, -0.03], [2.12, -11, 0.02],
];
const NEAR = 7, CLIP = [2, -1.5], OFF = [Math.cos(-0.55), Math.sin(-0.55)], SLOW = 0.6; // the one that clips
const S_CLIP = IN + CLIP[0], T_CLIP = ROUNDS[NEAR][0] + S_CLIP / V; // when it clips
const SWEAT = 0.2; // of the loop: when the sweat drop starts to bead
const DROP = ['.3.', '345', '355', '232']; // a teardrop, pointed on top, lit up-left, by sweat step

export const meta = {
  name: 'Suppressed',
  desc: 'A suppression status over the head: tracer rounds whizzing past just overhead, one clipping in sparks and dust, a bead of sweat',
  tags: ['status', 'debuff', 'military', 'suppression', 'bullets', 'suppressed', 'pinned', 'tracer', 'gunfire'],
  size: [W, H],
  origin: [OX, OY],
  duration: DURATION,
  loop: true,
  fps: 20,
  views: ['side'],
  ramps: { palette: 8, dust: 6, sweat: 6 },
  options: { palette: 'gold', dust: 'dust', sweat: 'water', seed: 1 },
  // a sharp crack as each round passes over the head, and a ricochet off the one that clips
  sound: [
    ...ROUNDS.map(([t0], i) => ({ t: (t0 + IN / V) % DURATION, kind: 'crack', gain: i === NEAR ? 0.45 : 0.3, pitch: 1.7 + 0.15 * (i % 3) })),
    { t: T_CLIP + 0.02, kind: 'crack', gain: 0.22, pitch: 3 },
  ],
};

const inside = (x, y) => x >= -OX && x < W - OX && y >= -OY && y < H - OY;
const age = (t, t0) => (((t - t0) % DURATION) + DURATION) % DURATION;

// Where round i is, s px along its path: a straight lane, or for the near one, off at an angle after it clips.
function at(i, s) {
  const [, lane, slope] = ROUNDS[i], x = s - IN;
  if (i !== NEAR || s <= S_CLIP) return [x, lane + slope * x];
  const k = s - S_CLIP;
  return [CLIP[0] + OFF[0] * k, CLIP[1] + OFF[1] * k];
}

// A tracer: a streak hottest at its head, sampled along its path so it can bend, cut off at the canvas edge.
function tracer(p, C, i, t) {
  const tau = age(t, ROUNDS[i][0]), clipped = i === NEAR && tau > S_CLIP / V;
  const far = i % 3 === 2, s = clipped ? S_CLIP + SLOW * V * (tau - S_CLIP / V) : V * tau, len = clipped ? LEN * 0.6 : far ? LEN - 4 : LEN;
  if (s - len - IN > W - OX) return; // gone off the right edge
  const [hx, hy] = at(i, s);
  for (let d = 0; d <= len; d += 0.5) {
    const [x, y] = at(i, s - d), u = d / len;
    if (!inside(x, y)) continue;
    p.dot(x, y, C[(clipped ? (u < 0.3 ? 6 : 4) : u < 0.15 ? 7 : u < 0.35 ? 6 : u < 0.6 ? 5 : 4) - (far ? 1 : 0)], Math.min(1, 2.5 * (1 - u)));
  }
  if (inside(hx - 3, hy - 3) && inside(hx + 3, hy + 3)) p.glowLine(hx - len * 0.5, hy, hx, hy, 3, C[5], (u, dd) => 0.35 * u * (1 - dd) ** 2);
}

// The clip: a star of light, sparks thrown on and up, a pinch of dust.
function clip(p, C, D, tau, s) {
  const [x, y] = CLIP;
  if (tau < 0.1) { // a four-point star, long across the round's line, and a flash
    const hot = tau < 0.05, L = hot ? 4 : 2;
    p.glow(x, y, 10, C[6], 0.9 * (1 - tau / 0.1));
    p.line(x - L, y, x + L, y, k => C[Math.abs(k - 0.5) < 0.2 ? 7 : 6]);
    p.line(x, y - L + 1, x, y + L - 1, k => C[Math.abs(k - 0.5) < 0.25 ? 7 : 6]);
    if (hot) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.px(x + dx, y + dy, C[5]);
  }
  for (let j = 0; j < 2; j++) { // a pinch of dust kicked up off the head, thinning as it drifts
    const life = 0.4 + 0.1 * rand(j, s, 4), u = tau / life;
    if (u >= 1) continue;
    const r = 1 + (1.2 + rand(j, s, 5)) * (1 - (1 - u) ** 2), px = x + (j ? 2 : -1) + 3 * u, py = y - 1 - 3 * u * (1 + rand(j, s, 6));
    p.disc(px, py, r, (dx, dy) => D[dx + dy < -r * 0.3 ? 5 : 4], (dx, dy, d) => 0.75 * (1 - u) ** 1.5 * (1 - d * d));
  }
  for (let j = 0; j < 5; j++) { // sparks, thrown on and up, falling, streaked by their speed
    const life = 0.16 + 0.12 * rand(j, s, 7);
    if (tau >= life) continue;
    const a = -0.15 - 1.9 * rand(j, s, 8), v = 40 + 35 * rand(j, s, 9), u = tau / life;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v + 500 * tau;
    const sx = x + vx * tau, sy = y + Math.sin(a) * v * tau + 250 * tau * tau, bx = sx - vx * 0.03, by = sy - vy * 0.03;
    if (inside(sx, sy) && inside(bx, by)) p.line(bx, by, sx, sy, k => C[k > 0.5 ? (u < 0.5 ? 7 : 6) : 4]);
  }
}

// The sweat drop, on the back of the head: beads, swells, creeps down, lets go and falls away.
function sweat(p, S, ph, jolt) {
  const u = (ph - SWEAT + 1) % 1, x = 6 + jolt;
  if (u > 0.86) return;
  if (u > 0.74) { // falling, stretched
    const f = (u - 0.74) / 0.12, y = 6 + 5 * f * f;
    p.px(x, y, S[5]);
    p.px(x, y - 1, S[3]);
    return;
  }
  const y = Math.round(1 + 3 * (u / 0.74) ** 2); // creeps down ever faster
  if (u < 0.05) return void p.px(x, y + 1, S[4]);
  if (u < 0.1) return void (p.px(x, y, S[3]), p.px(x, y + 1, S[5])); // swells
  DROP.forEach((row, i) => [...row].forEach((ch, j) => ch !== '.' && p.px(x - 1 + j, y - 1 + i, S[+ch])));
}

// The flinch as each round passes over: the head trembles, a shiver mark either side of it.
function shiver(p, S) {
  for (const x of [-10, 11]) p.line(x, 2, x, 4, S[4]);
}

// The flinch as it clips: beads of sweat flicked off both sides of the head.
function flick(p, S, tau) {
  for (const [x0, vx, vy] of [[-4, -35, -50], [5, 40, -45]]) {
    const x = x0 + vx * tau, y = vy * tau + 160 * tau * tau;
    p.px(x, y, S[tau < 0.15 ? 5 : 4]);
  }
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  const jolt = ROUNDS.some(([t0]) => age(t, t0 + IN / V) < 0.1) ? 1 : 0; // a round just went over
  sweat(p, o.sweat, ph, jolt);
  if (jolt) shiver(p, o.sweat);
  const tc = age(t, T_CLIP);
  if (tc < 0.8) clip(p, C, o.dust, tc, s);
  if (tc < 0.3) flick(p, o.sweat, tc);
  for (let i = 0; i < ROUNDS.length; i++) tracer(p, C, i, t);
}
