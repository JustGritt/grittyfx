import { Rng, Particles, Lights, Bits, SPARK, SMOKE, FIRE, DUST } from '../../core/index.js';

// The red light's blinks, [frame, frames lit]: slow, then faster and faster, then held on as it goes off.
const BLINKS = [[3, 2], [15, 2], [24, 2], [31, 2], [36, 1], [40, 1], [43, 1], [45, 1], [47, 3]];
const BOOM_F = 50, BOOM = BOOM_F / 30; // the frame it goes off on
const BOOM_N = BOOM_F * 4; // in update steps of 1/120 s: 4 a frame

export const meta = {
  name: 'C4',
  desc: 'A C4 brick on the floor, a detonator strapped to it, its red light blinking slow then faster and faster with a beep on each blink, then a sharp blast: a white flash, a shock ring racing out along the floor, a quick fireball and grey smoke',
  tags: ['explosion', 'military', 'c4', 'charge', 'trap', 'placed', 'plastic', 'explosive', 'breach', 'blast', 'shockwave', 'smoke'],
  size: [140, 120],
  origin: [70, 92],
  duration: 3.1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 8, dust: 6, brick: 5, led: 4 },
  options: {
    palette: 'fire', smoke: 'smoke', dust: 'dust', seed: 1,
    brick: ['#38342a', '#5c5646', '#847c64', '#aca286', '#d0c8aa'], led: ['#300608', '#7a0c10', '#e8222a', '#ffa0a0'],
  },
  act: { hits: [{ t: BOOM, freeze: 0.12, shake: 7 }] },
  stage: { ground: 0, x: -12, pose: null }, // stuck at the goblin's feet; nobody acts, the timer is already running
  sound: [
    ...BLINKS.map(([f], i) => ({ t: f / 30, kind: 'chime', gain: i === BLINKS.length - 1 ? 0.5 : 0.38, pitch: i === BLINKS.length - 1 ? 2.6 : 3.2 })), // the beeps
    { t: BOOM, kind: 'crack', gain: 1, pitch: 0.9 }, // the sharp front
    { t: BOOM, kind: 'thump', gain: 0.9, pitch: 0.5 }, // its weight
    { t: BOOM, kind: 'crack', gain: 0.7, pitch: 0.3 }, // the rumble
    { t: BOOM + 0.5, kind: 'crack', gain: 0.1, pitch: 2.8 }, // bits landing
  ],
};

const TAU = Math.PI * 2;
const CY = -10; // the fireball's center
const clamp01 = v => Math.max(0, Math.min(1, v));
const RING = 0.32; // seconds the shock takes to run out along the floor
const REACH = 54, ringAt = v => 12 + REACH * (1 - (1 - v) ** 3); // its reach, v from 0 to 1

// The brick lying on the floor, seen a little from above, lit from up-left: its top face, its front face with a printed
// label, the dark end on the right. The detonator box strapped on top, the light on its face, a red wire looping from
// it down into the brick. lit: the light is on.
function brick(p, B, S, L, lit) {
  for (let i = -7; i <= 6; i++) p.blend(i, 0, S[0], Math.abs(i + 0.5) > 6 ? 0.25 : 0.5);
  const rows = [B[4], B[3], B[2], B[2], B[1]]; // y -5 to -1
  rows.forEach((c, k) => p.line(-6, k - 4.5, 4, k - 4.5, c));
  rows.forEach((c, k) => p.px(5, k - 4.5, k < 2 ? B[2] : B[1])); // the end in shade
  p.px(-6, -4.5, B[3]); // a rounded corner
  for (const x of [-4, -3, -1, 0, 1]) p.px(x, -2.5, B[1]); // the label's print
  for (const x of [-5, 3]) [-4.5, -3.5].forEach(y => p.px(x, y, S[2])); // the strap over the top
  for (const x of [-5, 3]) [-2.5, -1.5].forEach(y => p.px(x, y, S[1]));
  // the detonator: a dark box on the top face
  p.line(-4, -7.5, 0, -7.5, S[4]);
  p.line(-4, -6.5, 0, -6.5, S[2]);
  p.line(-4, -5.5, 0, -5.5, S[1]);
  p.px(1, -6.5, S[1]);
  p.px(-1, -7.5, lit ? L[3] : L[1]); // the light
  if (lit) {
    p.px(-2, -7.5, L[2]);
    p.px(0, -7.5, L[2]);
    p.glow(-0.5, -7, 6, L[2], 0.5);
  }
  p.polyline([[1.5, -6.5], [3, -7.5], [5, -7.5], [6.5, -6.5], [6.5, -4.5], [5.5, -3.5]], L[1]); // the wire
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, B = o.brick, L = o.led;
  const parts = new Particles({ rng, palette: C, smoke: S, dust: W, ground: 0 });
  const lights = new Lights();
  const bits = new Bits({ rng, ground: -1 });

  function blast() {
    lights.add(0, CY, 38, C[7], 1, 0.08); // white, then the fireball's own light once it has faded
    lights.add(0, CY, 34, C[5], 0.8, 0.6, { delay: 0.08 });
    for (let i = 0; i < 11; i++) { // a quick fireball: hot, fast, burning off into grey smoke
      const a = ((i + rng.range(0, 1)) / 11) * TAU, d = rng.range(0, 6), v = rng.range(35, 75);
      parts.spawn(FIRE, Math.cos(a) * d, CY + Math.sin(a) * d * 0.7, Math.cos(a) * v * 0.7, Math.sin(a) * v * 0.6 - 45, rng.range(0.25, 0.42), {
        size: rng.range(6, 9), delay: 1 / 30, smoke: i % 3 ? 0 : rng.range(0.75, 0.9),
      });
    }
    for (let i = 0; i < 7; i++) {
      const a = rng.range(Math.PI * 1.15, Math.PI * 1.85), d = rng.range(2, 9);
      parts.spawn(SMOKE, Math.cos(a) * d, CY + Math.sin(a) * d, Math.cos(a) * 22, -rng.range(30, 60), rng.range(0.95, 1.15), {
        size: rng.range(6, 9), delay: rng.range(0.1, 0.25), ramp: S.slice(1, 7), back: true,
      });
    }
    for (let i = 0; i < 28; i++) { // a hard spray of sparks, flat and fast
      const a = rng.range(Math.PI * 1.02, Math.PI * 1.98), v = rng.range(120, 220);
      parts.spawn(SPARK, 0, CY + 4, Math.cos(a) * v, Math.sin(a) * v * 0.8, rng.range(0.18, 0.38), { delay: 1 / 30 });
    }
    for (const side of [-1, 1]) { // dust kicked up where the shock passes along the floor
      for (let i = 0; i < 7; i++) {
        const d = 14 + 40 * ((i + rng.range(0, 1)) / 7), v = 1 - Math.cbrt(1 - (d - 12) / REACH), big = rng.chance(0.4); // when the ring gets there
        parts.spawn(DUST, side * d, -1, side * rng.range(10, 35), -rng.range(4, big ? 26 : 12), rng.range(0.4, 0.75), {
          size: (big ? rng.range(2.8, 4) : rng.range(1.4, 2.4)) * (1 - 0.35 * (i / 7)), delay: 1 / 30 + v * RING,
        });
      }
    }
    for (let i = 0; i < 9; i++) { // what is left of the brick and the detonator
      const side = i % 2 ? 1 : -1;
      bits.spawn(side * rng.range(0, 4), -4, side * rng.range(25, 60), -rng.range(70, 130), {
        c: i < 3 ? S[2] : B[rng.int(1, 3)], size: rng.range(1.5, 2.5), life: rng.range(0.9, 1.3), delay: 1 / 30, shard: i % 4 === 1,
      });
    }
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      if (n === BOOM_N) blast();
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      const k = t - BOOM - 1 / 30; // the scorch where it lay
      if (k > 0 && t < 3) {
        const heat = k < 0.06 ? 6 : k < 0.14 ? 5 : k < 0.24 ? 4 : k < 0.36 ? 3 : 0, a = clamp01((3 - t) / 0.4);
        p.ellipse(0.5, -0.5, 11, 1.5, heat ? C[heat - 1] : S[0], a);
        if (heat) p.ellipse(0.5, -0.5, 5, 1.2, C[heat], a);
      }
    },
    draw(p) {
      lights.draw(p);
      const f = Math.floor(n / 4);
      if (n < BOOM_N) brick(p, B, S, L, BLINKS.some(([b, on]) => f >= b && f < b + on));
      const floor = clamp01((t - BOOM - 0.08) / 0.05) * Math.max(0, 1 - (t - BOOM - 0.08) / 0.7) ** 2;
      if (floor > 0) p.glowLine(-34, -1, 34, -1, 7, C[5], 0.5 * floor);
      bits.draw(p);
      parts.draw(p);
      flash(p, (n - BOOM_N) / 4, C, W);
    },
  };
}

// u frames after it goes off. The hero frame: a white core cut by the floor, a tall thin spike of light up out of it
// and a flat blade of light along the floor. Then a ring through the air, gone in a few frames, and the shock racing
// out along the floor as a flat ellipse, with the dust it kicks up.
function flash(p, u, C, W) {
  if (u < 0) return;
  if (u < 1) {
    p.ellipse(0, -2, 13, 12, (dx, dy) => -2 + dy < 0 && C[7]);
    p.beam(0, -4, 0, -44, 3, C[7]);
    for (const s of [-1, 1]) {
      p.beam(0, -6, s * 18, -28, 2, C[7]);
      p.line(0, -4, s * 30, -14, C[6]);
    }
    p.beam(-44, -1, 44, -1, 2, C[7]);
    return;
  }
  if (u < 3) p.ellipse(0, -2, 10 * (1 - (u - 1) / 2), 9 * (1 - (u - 1) / 2), (dx, dy) => -2 + dy < 0 && C[7]);
  const air = (u - 1) / 3; // the ring through the air
  if (air < 1) {
    const r = 20 + 30 * (1 - (1 - air) ** 2), c = C[air < 0.4 ? 7 : 6];
    for (let k = 0; k < 2; k++) {
      const rk = r - k, pts = [];
      for (let i = 0; i <= 40; i++) {
        const th = Math.PI + (i / 40) * Math.PI;
        if (Math.sin(th * 3 + 0.6) > -0.85) pts.push([Math.cos(th) * rk, -2 + Math.sin(th) * rk * 0.9]);
        else if (pts.length) (pts.length > 1 && p.polyline(pts, c, 1 - air)), (pts.length = 0);
      }
      if (pts.length > 1) p.polyline(pts, c, 1 - air);
    }
  }
  const v = (u - 1) / (RING * 30);
  if (v >= 1) return;
  const rx = ringAt(v), ry = Math.min(4, rx * 0.09);
  p.shade(-rx - 2, -ry - 3, 2 * rx + 4, 2 * ry + 4, (x, y) => {
    const dx = (x + 0.5) / rx, dy = (y + 1.5) / ry, d = Math.hypot(dx, dy);
    return Math.abs(d - 1) < 0.06 + 0.1 * (1 - v) && Math.sin(Math.atan2(dy * 3, dx) * 6 + 2) > -0.7 ? (dy > 0 ? C[7] : W[5]) : 0;
  }, 1 - v * v);
}
