import { Rng, Particles, Lights, Bits, SPARK, SMOKE, FIRE, EMBER, DUST } from '../../core/index.js';

export const meta = {
  name: 'Rocket blast',
  desc: 'A rocket going off on the ground: a white flash and a shock ring, a fireball that balloons and rolls up into dark smoke, dust racing out along the floor, burning debris flung high, lingering embers',
  tags: ['explosion', 'rocket', 'military', 'blast', 'fire', 'smoke', 'debris', 'shockwave', 'artillery'],
  size: [168, 128],
  origin: [84, 96],
  duration: 1.8,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [128, 128] },
  ramps: { palette: 8, smoke: 8, dust: 6, debris: 4 },
  options: { palette: 'fire', smoke: 'smoke', dust: 'dust', debris: 'stone', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.12, shake: 7 }] },
  stage: { ground: 0 },
  sound: [
    { t: 0, kind: 'thump', gain: 1, pitch: 0.45 }, // the weight of it
    { t: 0, kind: 'crack', gain: 0.9, pitch: 0.25 }, // the rumble
    { t: 0, kind: 'crack', gain: 0.6, pitch: 1 }, // its sharp front
    { t: 0.05, kind: 'crackle', gain: 0.35, pitch: 0.5 }, // the fireball burning off
    { t: 0.62, kind: 'crack', gain: 0.15, pitch: 2.4 }, // debris landing
    { t: 0.8, kind: 'crack', gain: 0.12, pitch: 2.8 },
    { t: 1.02, kind: 'crack', gain: 0.08, pitch: 2.6 },
  ],
};

const TAU = Math.PI * 2;
const CY = -16; // the fireball's center, above the ground at 0
const HERO = 1 / 30;
const clamp01 = v => Math.max(0, Math.min(1, v));
const RAYS = [[-168, 26, 3], [-128, 22, 2], [-97, 34, 3], [-62, 24, 2], [-25, 30, 3], [8, 20, 2], [172, 18, 2]]; // the flash's rays: degrees, length, width

export function create(o) {
  if (o.view === 'top') return createTop(o);
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, D = o.debris, DARK = S.slice(0, 5);
  const parts = new Particles({ rng, palette: C, smoke: S.slice(0, 6), dust: W, ground: 0 }); // dark smoke: the low steps
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: 0,
    onLand: b => {
      if (b.vy < 60 || b.age > 1) return; // a hard landing, early enough for its dust to settle
      for (let i = 0; i < 2; i++) parts.spawn(DUST, b.x, -1, rng.range(-25, 25), rng.range(-14, -4), rng.range(0.35, 0.55), { size: rng.range(1.5, 2.5) });
    },
  });

  lights.add(0, CY, 46, C[7], 1, 0.16);
  lights.add(0, CY, 42, C[5], 0.9, 1.1, { delay: 0.05 });

  // the fireball: puffs thrown out round the center that burn off into smoke, then a column rolling up out of it
  for (let i = 0; i < 15; i++) {
    const a = ((i + rng.range(0, 1)) / 15) * TAU, d = rng.range(0, 9), v = rng.range(35, 95);
    parts.spawn(FIRE, Math.cos(a) * d, CY + Math.sin(a) * d * 0.8, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 30, rng.range(0.4, 0.7), {
      size: rng.range(7, 11), delay: HERO, smoke: i % 2 ? 0 : rng.range(0.85, 1.05), // half leave smoke: the dark puffs fill the rest
    });
  }
  for (let i = 0; i < 5; i++) {
    parts.spawn(FIRE, rng.range(-6, 6), CY - rng.range(0, 6), rng.range(-15, 15), -rng.range(70, 110), rng.range(0.4, 0.55), {
      size: rng.range(5, 8), delay: rng.range(0.08, 0.25), smoke: rng.range(0.85, 1),
    });
  }
  for (let i = 0; i < 7; i++) {
    const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), d = rng.range(4, 14);
    parts.spawn(SMOKE, Math.cos(a) * d, CY + Math.sin(a) * d, Math.cos(a) * 25, -rng.range(30, 70), rng.range(1.05, 1.3), {
      size: rng.range(7, 10), delay: rng.range(0.2, 0.45), ramp: DARK, back: true,
    });
  }
  for (let i = 0; i < 24; i++) {
    const a = rng.range(Math.PI * 1.02, Math.PI * 1.98), v = rng.range(90, 180);
    parts.spawn(SPARK, 0, CY, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.3, 0.6), { delay: HERO });
  }
  for (let i = 0; i < 16; i++) {
    parts.spawn(EMBER, rng.range(-16, 16), CY + rng.range(-10, 6), rng.range(-30, 30), rng.range(-60, -20), rng.range(0.8, 1.2), { delay: rng.range(0.1, 0.55) });
  }
  // the shock along the floor: dust racing out both ways, low and fast
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      parts.spawn(DUST, side * rng.range(6, 14), -1, side * rng.range(60, 170), -rng.range(2, 12), rng.range(0.6, 0.95), {
        size: rng.range(3, 5), delay: HERO + i * 0.012,
      });
    }
  }
  const hot = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1; // flung high both ways, never far enough to leave the canvas
    const b = bits.spawn(side * rng.range(0, 6), CY + 6, side * rng.range(15, 55), -rng.range(80, 150), {
      c: i < 3 ? C[6] : D[rng.int(1, 3)], size: rng.range(2, 4), life: rng.range(1.2, 1.6), delay: HERO, shard: i % 5 === 4,
    });
    if (i < 3) hot.push(b);
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      for (const b of hot) b.c = C[Math.max(2, 6 - Math.floor(b.age / 0.2))]; // burning chunks cool as they fly and lie
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      // the floor under the blast: white hot, cooling through the ramp to a dark scorch
      const k = t - HERO;
      if (k > 0 && t < 1.75) {
        const heat = k < 0.08 ? 6 : k < 0.16 ? 5 : k < 0.26 ? 4 : k < 0.38 ? 3 : k < 0.5 ? 2 : 0, a = clamp01((1.75 - t) / 0.4);
        p.ellipse(0.5, -1, 12, 1.8, heat ? C[heat - 1] : S[0], a);
        if (heat) p.ellipse(0.5, -1, 6, 1.3, C[heat], a);
      }
    },
    draw(p) {
      lights.draw(p);
      const floor = clamp01((t - 0.12) / 0.06) * Math.max(0, 1 - (t - 0.12) / 1.2) ** 2; // after the flash, so the lights don't fight
      if (floor > 0) p.glowLine(-44, -1, 44, -1, 8, C[5], 0.55 * floor);
      bits.draw(p);
      parts.draw(p);
      flash(p, t, C, W);
    },
  };
}

// The white hero frame, a star of light round it, then a shock ring through the air cut off by the floor and one
// racing out along the floor, seen from low as a flat ellipse.
function flash(p, t, C, W) {
  if (t < HERO) {
    p.circle(0, CY, 15, C[7]);
    for (const [deg, l, w] of RAYS) {
      const a = (deg * Math.PI) / 180;
      p.beam(0, CY, Math.cos(a) * l, CY + Math.sin(a) * l, w, C[7]);
    }
    p.ellipse(0.5, -1, 34, 2, C[7]);
    return;
  }
  const u = (t - HERO) / 0.3;
  if (u >= 1) return;
  const e = 1 - (1 - u) ** 3, gaps = (dx, dy) => Math.sin(Math.atan2(dy, dx) * 5 + 1) > -0.6; // broken into arcs
  if (u < 0.35) p.circle(0, CY, 14 * (1 - u / 0.35), C[7]);
  const v = (t - HERO) / 0.12; // the ring through the air: gone in a few frames
  if (v < 1) rings(p, 0, CY, 22 + 34 * (1 - (1 - v) ** 2), 3.5 * (1 - v) + 0.8, (dx, dy) => CY + dy < -2 && gaps(dx, dy), (k, n) => C[k === n - 1 ? 7 : 6]);
  const rx = 18 + 58 * e, ry = Math.min(5, rx * 0.12);
  p.shade(-rx - 2, -ry - 3, 2 * rx + 4, 2 * ry + 4, (x, y) => {
    const dx = (x + 0.5) / rx, dy = (y + 1.5) / ry, d = Math.hypot(dx, dy); // the ring on the floor, flattened by the low view
    return Math.abs(d - 1) < 0.07 + 0.1 * (1 - u) && gaps(dx, dy * 3) ? W[dy > 0 ? 5 : 3] : 0;
  }, 1 - u * u);
}

// A ring w px wide as concentric 1 px circles, kept where keep(cos, sin) holds: lines cost their length, where ring()
// would visit every pixel of its bounding square. c(k, n) colors circle k of n, inside out.
function rings(p, cx, cy, r, w, keep, c, a = 1) {
  const n = Math.max(1, Math.round(w)), SEG = 96;
  for (let k = 0; k < n; k++) {
    const rk = r - w / 2 + (k + 0.5) * (w / n), run = [];
    for (let i = 0; i <= SEG; i++) {
      const th = (i / SEG) * TAU, x = Math.cos(th), y = Math.sin(th);
      if (keep(x * rk, y * rk)) run.push([cx + x * rk, cy + y * rk]);
      if ((!keep(x * rk, y * rk) || i === SEG) && run.length) (run.length > 1 && p.polyline(run, c(k, n), a)), (run.length = 0);
    }
  }
}

// Seen from above: the fireball swells where it is, sparks, debris and a ring of dust are thrown out all round and skid
// to a stop, and the scorch is a round dark patch.
function createTop(o) {
  const rng = new Rng(o.seed), C = o.palette, S = o.smoke, W = o.dust, D = o.debris, DARK = S.slice(0, 5);
  const parts = new Particles({ rng, palette: C, smoke: S, dust: W, top: true });
  const lights = new Lights(), bits = new Bits({ rng, top: true });

  lights.add(0, 0, 46, C[7], 1, 0.16);
  lights.add(0, 0, 40, C[5], 0.9, 1.1, { delay: 0.05 });
  for (let i = 0; i < 16; i++) { // each in its own sector, so the fireball is round
    const a = ((i + rng.range(0, 1)) / 16) * TAU, d = rng.range(0, 9), v = rng.range(20, 60);
    parts.spawn(FIRE, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.4, 0.7), {
      size: rng.range(6, 10), delay: HERO, smoke: i % 2 ? 0 : rng.range(0.85, 1.05),
    });
  }
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, TAU), d = rng.range(2, 10);
    parts.spawn(SMOKE, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * 15, Math.sin(a) * 15, rng.range(1.05, 1.3), {
      size: rng.range(7, 10), delay: rng.range(0.2, 0.45), ramp: DARK,
    });
  }
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, TAU), v = rng.range(80, 140);
    parts.spawn(SPARK, 0, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.25, 0.4), { delay: HERO });
  }
  for (let i = 0; i < 12; i++) {
    parts.spawn(EMBER, rng.range(-12, 12), rng.range(-12, 12), rng.range(-20, 20), rng.range(-20, 20), rng.range(0.8, 1.2), { delay: rng.range(0.1, 0.55) });
  }
  for (let i = 0; i < 30; i++) { // a ragged ring of dust the blast pushes along the floor, out past the fireball
    const a = ((i + rng.range(0, 1)) / 30) * TAU, d = rng.range(8, 14), v = rng.range(60, 120);
    parts.spawn(DUST, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.55, 0.9), { size: rng.range(3, 5), delay: HERO, back: true });
  }
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, TAU), v = rng.range(70, 120);
    bits.spawn(0, 0, Math.cos(a) * v, Math.sin(a) * v, { c: i < 3 ? C[6] : D[rng.int(1, 3)], size: rng.range(2, 4), life: rng.range(1.2, 1.6), delay: HERO });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      lights.draw(p);
      const k = t - HERO;
      if (k > 0 && t < 1.75) { // the scorch, cooling as in the side view
        const heat = k < 0.08 ? 7 : k < 0.2 ? 6 : k < 0.35 ? 5 : k < 0.55 ? 4 : k < 0.8 ? 3 : 0;
        p.circle(0.5, 0.5, 14, heat ? C[heat] : S[0], clamp01((1.75 - t) / 0.4));
      }
      const floor = clamp01((t - 0.12) / 0.06) * Math.max(0, 1 - (t - 0.12) / 1.2) ** 2;
      if (floor > 0) p.glow(0, 0, 44, C[5], 0.55 * floor);
      const u = (t - HERO) / 0.32; // the shock ring racing out over the floor
      if (u > 0 && u < 1) rings(p, 0.5, 0.5, 14 + 42 * (1 - (1 - u) ** 3), 4 - 3 * u, () => true, () => W[u < 0.3 ? 5 : 4], 1 - u * u);
      parts.draw(p, 'back');
      bits.draw(p);
    },
    draw(p) {
      if (t < HERO) p.circle(0, 0, 18, C[7]); // the white frame
      else if (t < HERO * 4) p.circle(0, 0, 16 * (1 - (t - HERO) / (HERO * 3)), C[7]);
      parts.draw(p);
    },
  };
}
