import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const FRAMES = 30, FPS = 20, DURATION = FRAMES / FPS;
const SLOTS = 3, LIFE = 3, LIVES = FRAMES / LIFE; // arcs at once; each re-forms every LIFE frames: bright, dim, gone
const TURNS = [2, -2, 1]; // how many times round the body each slot's arc crawls a loop
const FLASH = 20; // the frame where every slot fires at once and the body lights up
const CX = -1, CY = -11, RX = 8, RY = 10; // the body the arcs crawl over

export const meta = {
  name: 'Shocked',
  desc: 'An electrified status over a body: little forked arcs crawling over it, re-forming in a new spot every few frames, sparks spitting off them and a flicker of light',
  tags: ['status', 'electric', 'shock', 'shocked', 'paralyze', 'lightning', 'debuff', 'static'],
  size: [48, 48],
  origin: [24, 37],
  duration: DURATION,
  loop: true,
  fps: FPS,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  stage: { at: 'target', ground: 0 }, // over the whole body, from its feet
  sound: [
    { t: FLASH / FPS, kind: 'zap', gain: 0.3, pitch: 1.3 },
    { t: 5 / FPS, kind: 'zap', gain: 0.2, pitch: 1.8 },
    { t: 13 / FPS, kind: 'zap', gain: 0.15, pitch: 2.2 },
  ],
};

// A point on the body: angle a round it, r from the middle (0) to the outline (1).
const onBody = (a, r) => [CX + Math.cos(a) * RX * r, CY + Math.sin(a) * RY * r];
// Where slot j's arc touches down in life L: a step further round the body each life, so the arc that starts there
// leaps on from where the last one ended and the arcs crawl over the body.
const hop = (j, L, s) => {
  L = ((L % LIVES) + LIVES) % LIVES;
  return onBody(TAU * (rand(j, 99, s) + (TURNS[j] * L) / LIVES) + (rand(j, L, s + 1) - 0.5) * 0.5, 0.45 + 0.55 * rand(j, L, s + 2));
};

// The arc of slot j in its life L: from its touch-down to the next (or `span` on), leaping out from the body in two
// sharp kinks, and a short fork.
function arc(j, L, s, span = 1) {
  const r = k => rand(j * 31 + L, k + 50 * span, s), A = hop(j, L, s), B = hop(j, L + span, s);
  const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (nx * ((A[0] + B[0]) / 2 - CX) + ny * ((A[1] + B[1]) / 2 - CY) < 0) (nx = -nx), (ny = -ny); // away from the body
  const bow = 1.5 + 1.5 * r(1), kink = 1 + 1.5 * r(2), sk = r(3) < 0.5 ? -1 : 1;
  const m1 = [A[0] + dx * 0.35 + nx * (bow + sk * kink), A[1] + dy * 0.35 + ny * (bow + sk * kink)];
  const m2 = [A[0] + dx * 0.65 + nx * (bow - sk * kink), A[1] + dy * 0.65 + ny * (bow - sk * kink)];
  const main = [A, m1, m2, B], at = r(4) < 0.5 ? m1 : m2, fl = 2 + 1.5 * r(5);
  const fork = [at, [at[0] + (nx + (r(6) - 0.5)) * fl, at[1] + (ny + (r(7) - 0.5)) * fl]];
  return { main, fork, skip: r(15) < 0.15 };
}

// Light along a path, each segment dimmer at its ends so the joints add up to one light.
function glowPath(p, pts, r, c, k) {
  for (let i = 1; i < pts.length; i++) p.glowLine(...pts[i - 1], ...pts[i], r, c, (t, d) => k * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * t)));
}

const shift = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);

// Every arc alive on frame fi: { a, fresh }.
function live(fi, s) {
  const out = [];
  for (let j = 0; j < SLOTS; j++) {
    const k = fi + j, L = Math.floor(k / LIFE) % LIVES, age = k % LIFE, a = arc(j, L, s);
    if (fi === FLASH || fi === FLASH + 1) out.push({ a: arc(j, L, s, 3), fresh: fi === FLASH });
    else if (!a.skip && age < 2) out.push({ a, fresh: age === 0 });
  }
  return out;
}

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed, fi = Math.floor((t / DURATION) * FRAMES + 1e-6) % FRAMES;
  const n = live(fi, s).filter(l => l.fresh).length, flash = fi === FLASH ? 1 : fi === FLASH + 1 ? 0.5 : 0;
  p.glow(CX, CY, 16 + 4 * flash, C[5], 0.06 + 0.05 * n + 0.3 * flash);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION, fi = Math.floor(ph * FRAMES + 1e-6) % FRAMES;
  for (const { a, fresh } of live(fi, s)) {
    glowPath(p, a.main, 3, C[5], fresh ? 0.25 : 0.12);
    p.polyline(shift(a.main.slice(1, -1), 1), C[2]); // a dark underside, so it holds on a light background
    p.polyline(a.fork, u => C[u > 0.5 ? (fresh ? 4 : 3) : fresh ? 6 : 4]);
    p.polyline(a.main, C[fresh ? 7 : 5]);
    for (const [x, y] of [a.main[0], a.main.at(-1)]) {
      p.px(x, y, C[7]);
      p.light(x, y, C[6], fresh ? 0.5 : 0.25);
    }
  }
  // static fizzing on the outline: single pixels that blink on and off
  for (let j = 0; j < 5; j++) {
    if (rand(j, fi, s + 7) > 0.3) continue;
    const [x, y] = onBody(TAU * rand(j, fi, s + 8), 0.9 + 0.3 * rand(j, fi, s + 9));
    p.px(x, y, C[rand(j, fi, s + 10) < 0.3 ? 7 : 5]);
  }
  // sparks spitting off the body: thrown out, falling away as they cool, sliding to a stop on the floor
  for (let j = 0; j < 8; j++) {
    const k = 1 + (j % 2), v = (ph * k + rand(j, s, 20)) % 1, life = 0.25;
    if (v > life) continue;
    const u = v / life, tau = (v * DURATION) / k, [x0, y0] = onBody(TAU * rand(j, Math.floor(ph * k + rand(j, s, 20)) % k, s), 0.9);
    const vx = (x0 - CX) * (2 + 2 * rand(j, s, 21)), vy = -25 - 30 * rand(j, s, 22);
    const pos = q => [x0 + vx * q, Math.min(0, y0 + vy * q + 200 * q * q)];
    p.line(...pos(Math.max(0, tau - 0.04)), ...pos(tau), q => C[q > 0.5 ? (u < 0.4 ? 7 : 6) : u < 0.6 ? 5 : 4]);
    p.light(...pos(tau), C[6], 0.4 * (1 - u));
  }
}
