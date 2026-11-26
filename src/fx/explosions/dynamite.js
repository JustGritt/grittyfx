import { Rng, Particles, Lights, Bits, SPARK, SMOKE, FIRE, EMBER, DUST, rand } from '../../core/index.js';

const BOOM = 1.2; // the bundle goes off
const STEP = 1 / 120, BOOM_N = Math.round(BOOM / STEP), F = 4; // update steps: to the blast, a frame's worth

export const meta = {
  name: 'Dynamite',
  desc: 'A bundle of three red sticks lying on the floor, its fuse lit: a spark crawls down the fuse spitting sparks, then the bundle goes off in a white flash and a fireball, paper shreds fluttering down through the smoke and dirt flung along the floor',
  tags: ['explosion', 'military', 'dynamite', 'charge', 'trap', 'placed', 'fuse', 'demolition', 'blast', 'fire', 'smoke', 'debris'],
  size: [128, 132],
  origin: [64, 102],
  duration: 3.1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, smoke: 8, dust: 6, sticks: 5 },
  options: { palette: 'fire', smoke: 'smoke', dust: 'dust', sticks: ['#2a080c', '#5e1216', '#9c1e1c', '#d0362a', '#f07058'], seed: 1 },
  act: { hits: [{ t: BOOM, freeze: 0.1, shake: 6 }] },
  stage: { ground: 0, x: -12, pose: null }, // lying at the goblin's feet; nobody acts, the fuse is already lit
  sound: [
    { t: 0, kind: 'crackle', gain: 0.45, pitch: 2.2 }, // the fuse fizzing, then the fire burning off
    { t: BOOM, kind: 'thump', gain: 1, pitch: 0.45 }, // the boom
    { t: BOOM, kind: 'crack', gain: 0.85, pitch: 0.28 }, // its rumble
    { t: BOOM, kind: 'crack', gain: 0.7, pitch: 1.1 }, // the sharp front
    { t: BOOM + 0.55, kind: 'crack', gain: 0.12, pitch: 2.6 }, // dirt landing
    { t: BOOM + 0.75, kind: 'crack', gain: 0.08, pitch: 2.9 },
  ],
};

const TAU = Math.PI * 2;
const CY = -10; // the fireball's center
const clamp01 = v => Math.max(0, Math.min(1, v));

// The sticks, back to front: [left x, right x, top row]. Each nearer one lies 2 px lower and 1 px further left, so the
// bundle is seen from above and a little from its left end.
const STICKS = [[-5, 6, -7], [-6, 5, -5], [-7, 4, -3]];
const BANDS = [-3, 2]; // the tape round the bundle
// The fuse, from the front stick's end out to its tip, and how far along it each point is.
const FUSE = [[-7.5, -1.5], [-9.5, -2.5], [-11, -4], [-11.5, -6], [-11, -8], [-9.5, -9.5]];
const LEN = FUSE.slice(1).reduce((a, q, i) => [...a, a[i] + Math.hypot(q[0] - FUSE[i][0], q[1] - FUSE[i][1])], [0]);
const BURN = BOOM - 0.13; // the spark reaches the bundle, then a beat of quiet

// The point the fuse has burnt down to at t, from the tip (u = 0) to the bundle (u = 1).
function sparkAt(t) {
  const d = LEN.at(-1) * (1 - clamp01(t / BURN));
  const i = Math.max(0, LEN.findIndex(l => l >= d) - 1), k = (d - LEN[i]) / (LEN[i + 1] - LEN[i] || 1);
  return { i, x: FUSE[i][0] + (FUSE[i + 1][0] - FUSE[i][0]) * k, y: FUSE[i][1] + (FUSE[i + 1][1] - FUSE[i][1]) * k };
}

// The bundle lying on the floor, lit from up-left: each stick a lit top row over a shaded one (the front stick a body
// row between), a paper end on the left, the dark end on the right, two bands of tape round it, its shadow.
function bundle(p, R, S, W) {
  for (let i = -8; i <= 5; i++) p.blend(i, 0, S[0], Math.abs(i + 1.5) > 5 ? 0.25 : 0.5);
  STICKS.forEach(([x0, x1, y], j) => {
    const rows = j === 2 ? [R[3], R[2], R[1]] : [R[3], R[1]];
    rows.forEach((c, k) => p.line(x0, y + k + 0.5, x1, y + k + 0.5, c));
    p.px(x1 + 1, y + 0.5, R[1]);
    if (j === 2) p.px(x1 + 1, y + 1.5, R[0]);
    rows.forEach((_, k) => p.px(x0, y + k + 0.5, W[k ? 3 : 5])); // the paper end
    for (const b of BANDS) rows.forEach((_, k) => p.px(b, y + k + 0.5, S[k ? 1 : 3]));
  });
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, R = o.sticks, DARK = S.slice(0, 5);
  const parts = new Particles({ rng, palette: C, smoke: S.slice(0, 6), dust: W, ground: 0 });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: -1,
    onLand: b => {
      if (b.vy < 60 || b.age > 0.9) return;
      parts.spawn(DUST, b.x, -1, rng.range(-20, 20), rng.range(-12, -4), rng.range(0.3, 0.45), { size: rng.range(1.5, 2.2) });
    },
  });
  const shreds = []; // the sticks' paper, torn up: light, so it flutters down through the smoke

  function blast() {
    lights.add(0, CY, 40, C[7], 1, 0.09); // white, then the fireball's own light once it has faded: no seam between them
    lights.add(0, CY, 40, C[5], 0.85, 0.9, { delay: 0.09 });
    for (let i = 0; i < 13; i++) { // the fireball: puffs in their own sectors, burning off into smoke
      const a = ((i + rng.range(0, 1)) / 13) * TAU, d = rng.range(0, 7), v = rng.range(30, 80);
      parts.spawn(FIRE, Math.cos(a) * d, CY + Math.sin(a) * d * 0.7, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 35, rng.range(0.35, 0.6), {
        size: rng.range(6, 9), delay: 1 / 30, smoke: i % 2 ? 0 : rng.range(0.8, 1),
      });
    }
    for (let i = 0; i < 4; i++) {
      parts.spawn(FIRE, rng.range(-5, 5), CY - rng.range(0, 5), rng.range(-12, 12), -rng.range(60, 95), rng.range(0.35, 0.5), {
        size: rng.range(4.5, 7), delay: rng.range(0.07, 0.2), smoke: rng.range(0.8, 1),
      });
    }
    for (let i = 0; i < 6; i++) {
      const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), d = rng.range(3, 11);
      parts.spawn(SMOKE, Math.cos(a) * d, CY + Math.sin(a) * d, Math.cos(a) * 20, -rng.range(25, 60), rng.range(1, 1.25), {
        size: rng.range(6, 9), delay: rng.range(0.18, 0.4), ramp: DARK, back: true,
      });
    }
    for (let i = 0; i < 20; i++) {
      const a = rng.range(Math.PI * 1.03, Math.PI * 1.97), v = rng.range(80, 160);
      parts.spawn(SPARK, 0, CY + 3, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.25, 0.5), { delay: 1 / 30 });
    }
    for (let i = 0; i < 10; i++) {
      parts.spawn(EMBER, rng.range(-12, 12), CY + rng.range(-8, 5), rng.range(-25, 25), rng.range(-50, -15), rng.range(0.7, 1.1), { delay: rng.range(0.1, 0.45) });
    }
    for (const side of [-1, 1]) { // dirt blown out along the floor
      for (let i = 0; i < 7; i++) {
        parts.spawn(DUST, side * rng.range(4, 10), -1, side * rng.range(50, 140), -rng.range(2, 10), rng.range(0.55, 0.85), {
          size: rng.range(2.5, 4), delay: 1 / 30 + i * 0.012,
        });
      }
    }
    for (let i = 0; i < 12; i++) { // clods of dirt
      const side = i % 2 ? 1 : -1;
      bits.spawn(side * rng.range(0, 5), -3, side * rng.range(20, 60), -rng.range(60, 120), {
        c: i < 3 ? R[2] : W[rng.int(1, 3)], size: rng.range(1.5, 3), life: rng.range(1.1, 1.5), delay: 1 / 30, // the first: what is left of the sticks
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI * (0.08 + 0.84 * ((i + rng.range(0, 1)) / 18)), v = rng.range(110, 200);
      shreds.push({
        x: rng.range(-4, 4), y: CY + 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 1.1, ph: rng.range(0, TAU), w: rng.range(8, 13),
        life: rng.range(1.4, 1.8), age: -1 / 30, tan: i % 4 === 3,
      });
    }
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      if (n < BOOM_N && t < BURN) { // the fuse spitting sparks, a wisp of smoke off it
        const s = sparkAt(t);
        if (rng.chance(0.3)) {
          const a = rng.range(-Math.PI, 0), v = rng.range(25, 65);
          parts.spawn(SPARK, s.x, s.y, Math.cos(a) * v, Math.sin(a) * v - 10, rng.range(0.06, 0.16));
        }
        if (n % 14 === 0) parts.spawn(SMOKE, s.x, s.y - 1, rng.range(-4, 4), -rng.range(8, 16), rng.range(0.3, 0.45), { size: rng.range(0.6, 0.9), ramp: S.slice(2, 6) });
      }
      if (n === BOOM_N) blast();
      for (const q of shreds) {
        if ((q.age += dt) < 0 || q.rest) continue;
        const drag = q.age < 0.25 ? 2.5 : 6; // thrown by the blast, then caught by the air
        q.vy += 200 * dt;
        q.vx *= 1 - drag * dt;
        q.vy *= 1 - drag * dt;
        q.x += (q.vx + Math.sin(q.ph + q.age * q.w) * 22) * dt;
        q.y += q.vy * dt;
        if (q.y >= -1) (q.y = -1), (q.rest = true);
      }
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      const k = t - BOOM - 1 / 30; // the scorch where it lay, cooling
      if (k > 0 && t < 2.9) {
        const heat = k < 0.08 ? 6 : k < 0.18 ? 5 : k < 0.3 ? 4 : k < 0.45 ? 3 : 0, a = clamp01((2.9 - t) / 0.4);
        p.ellipse(0.5, -0.5, 10, 1.5, heat ? C[heat - 1] : S[0], a);
        if (heat) p.ellipse(0.5, -0.5, 5, 1.2, C[heat], a);
      }
    },
    draw(p) {
      lights.draw(p);
      if (t < BOOM) {
        bundle(p, R, S, W);
        const s = sparkAt(t), lit = t < BURN;
        const rest = lit ? [[s.x, s.y], ...FUSE.slice(0, s.i + 1).reverse()] : [];
        if (rest.length > 1) p.polyline(rest.reverse(), S[3]); // the fuse left to burn
        else if (!lit) p.px(FUSE[0][0], FUSE[0][1], S[1]); // burnt into the bundle: a charred stub
        if (lit) { // the spark, flickering
          const f = Math.floor(t * 30), flick = rand(f, o.seed, 7);
          p.glow(s.x, s.y, 7, C[5], 0.45 + 0.3 * flick);
          if (flick > 0.45) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.px(s.x + dx, s.y + dy, C[5]);
          p.px(s.x, s.y, C[7]);
        }
      }
      const floor = clamp01((t - BOOM - 0.1) / 0.06) * Math.max(0, 1 - (t - BOOM - 0.1) / 1) ** 2;
      if (floor > 0) p.glowLine(-36, -1, 36, -1, 7, C[5], 0.5 * floor);
      bits.draw(p);
      parts.draw(p);
      for (const q of shreds) { // a strip of paper, flipping as it flutters: lit face, then its dark back
        if (q.age < 0 || q.age >= q.life) continue;
        const w = Math.sin(q.ph + q.age * q.w), a = Math.min(1, (q.life - q.age) / 0.25), c = q.tan ? W[w > 0 ? 5 : 3] : R[w > 0 ? 4 : 2];
        if (q.rest || Math.abs(w) > 0.5) p.line(q.x - 1, q.y, q.x + 1, q.y, c, a);
        else p.line(q.x, q.y - 1, q.x + (w > 0 ? 1 : -1), q.y + 1, c, a);
      }
      flash(p, t, C, W);
    },
  };
}

// The white hero frame: a dome cut by the floor with spikes thrown out of it, then shrinking as a shock ring runs out
// along the floor.
function flash(p, t, C, W) {
  const u = (t - BOOM) * 30; // in frames
  if (u < 0 || u >= 8) return;
  if (u < 1) {
    p.ellipse(0, CY + 4, 14, 13, (dx, dy) => CY + 4 + dy < 0 && C[7]);
    for (const [deg, l, w] of [[-160, 22, 2], [-122, 26, 3], [-90, 32, 3], [-58, 24, 3], [-24, 20, 2]]) {
      const a = (deg * Math.PI) / 180;
      p.beam(0, CY, Math.cos(a) * l, CY + Math.sin(a) * l, w, C[7]);
    }
    p.ellipse(0.5, -1, 30, 1.5, C[7]);
    return;
  }
  const v = u / 8, e = 1 - (1 - v) ** 3;
  if (u < 3) p.ellipse(0, CY + 4, 11 * (1 - u / 3), 10 * (1 - u / 3), (dx, dy) => CY + 4 + dy < 0 && C[7]);
  const rx = 16 + 40 * e, ry = Math.min(4, rx * 0.1);
  p.shade(-rx - 2, -ry - 3, 2 * rx + 4, 2 * ry + 4, (x, y) => {
    const dx = (x + 0.5) / rx, dy = (y + 1.5) / ry, d = Math.hypot(dx, dy);
    return Math.abs(d - 1) < 0.08 + 0.1 * (1 - v) && Math.sin(Math.atan2(dy * 3, dx) * 5 + 1) > -0.6 ? W[dy > 0 ? 5 : 3] : 0;
  }, 1 - v * v);
}
