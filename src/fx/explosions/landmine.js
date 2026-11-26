import { Rng, Particles, Lights, Bits, FIRE, SMOKE, DUST, rand } from '../../core/index.js';

const CLICK_F = 18, BOOM_F = 25; // the frames it clicks and goes off on
const CLICK = CLICK_F / 30, BOOM = BOOM_F / 30;

export const meta = {
  name: 'Landmine',
  desc: 'A mine half buried in the floor, only its dome and pressure plate showing; a click, a jolt, light seeping round its rim, then the ground erupts: a fan of dirt and fire bursting straight up out of the floor, clods and grit thrown high and raining back, the plate tumbling, a dust cloud rolling out over a smoking crater',
  tags: ['explosion', 'military', 'landmine', 'mine', 'charge', 'trap', 'placed', 'eruption', 'dirt', 'debris', 'fire', 'blast'],
  size: [132, 126],
  origin: [66, 96],
  duration: 2.8,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, fire: 8, metal: 5 },
  options: { palette: 'dust', fire: 'fire', metal: ['#1a1e12', '#30361f', '#4a5230', '#687246', '#8c9662'], seed: 1 },
  act: { hits: [{ t: BOOM, freeze: 0.1, shake: 7 }] },
  stage: { ground: 0, x: -12, pose: null }, // just in front of the goblin, clear of its green feet; nobody acts
  sound: [
    { t: CLICK, kind: 'crack', gain: 0.22, pitch: 3.2 }, // the click
    { t: BOOM, kind: 'thump', gain: 1, pitch: 0.4 }, // the ground heaving
    { t: BOOM, kind: 'crack', gain: 0.85, pitch: 0.25 }, // its rumble
    { t: BOOM, kind: 'crack', gain: 0.6, pitch: 0.9 }, // the sharp front
    { t: BOOM + 0.55, kind: 'thump', gain: 0.22, pitch: 2.6 }, // clods raining back
    { t: BOOM + 0.68, kind: 'thump', gain: 0.18, pitch: 3 },
    { t: BOOM + 0.8, kind: 'thump', gain: 0.2, pitch: 2.3 },
    { t: BOOM + 0.95, kind: 'thump', gain: 0.14, pitch: 3.2 },
    { t: BOOM + 1.12, kind: 'thump', gain: 0.1, pitch: 2.8 },
  ],
};

const TAU = Math.PI * 2;
const out = (t, k) => (t > 0 ? 1 - Math.exp(-t / k) : 0); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const SPREAD = 0.45; // the fan's half angle from straight up, radians
const H = 64; // how high the fan throws its dirt

// The mine, x from -7, rows down to the floor: the plate (2 rows), the dome, the rim the dirt covers. Metal: h l m d k
// light to dark, lit from up-left. The dirt heaped round it: D c e f light to dark.
const PLATE = ['hlm', 'mdk'];
const DOME = ['....hhllmmd....', '...hllllmmmdd..', '..hlmmmmmmmddk.', '..lmmmmmmmmddk.'];
const DIRT = ['.Dc.........ef.', 'DDcccceeeeeefff'];

function rows(p, ink, list, y0, x0 = -7) {
  list.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && p.px(x0 + i, y0 + j, ink[ch])));
}

// The mine sitting in the floor: jolted up a px on the click, the plate pushed down from then on, light seeping out
// round its rim (k) just before it goes.
function mine(p, M, D, F, f, k) {
  const ink = { h: M[4], l: M[3], m: M[2], d: M[1], k: M[0], D: D[5], c: D[4], e: D[3], f: D[2] };
  const up = f === CLICK_F ? 1 : 0, pressed = f >= CLICK_F;
  rows(p, ink, pressed ? PLATE.slice(0, 1) : PLATE, (pressed ? -5 : -6) - up, -1);
  rows(p, ink, DOME, -4 - up);
  if (k > 0) {
    p.glow(0.5, -2, 14, F[5], 0.5 * k);
    for (const x of [-5, -4, 4, 5]) p.px(x, -1.5, F[k > 0.6 ? 7 : 6]); // cracks of light through the dirt
  }
  rows(p, ink, DIRT, -2);
}

// A volume lit from up-left: a highlight on the big ones only, the body, a rim one step darker down-right.
function puff(p, C, { x, y, r, a, tone }) {
  if (a <= 0.01 || r < 0.5) return;
  const lit = r > 5.5 ? r * 0.55 : -1; // small ones lit would make a bunch of grapes
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < lit) return C[Math.min(C.length - 1, tone + 1)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.9 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.7, d));
}

// The fan of dirt, u seconds after it goes, from u alone: clumps thrown up all over a V from the crater, the far ones
// the biggest and slowest to stall, then falling back and thinning. h is how far out along its line.
function fan(u, s) {
  const list = [];
  for (let j = 0; j < 48; j++) {
    const a = (((j * 0.618 + rand(0, s, 9)) % 1) - 0.5) * 2 * SPREAD; // spread evenly over the V, never in lanes
    const h = 0.1 + 0.9 * ((j * 0.382 + rand(j, s, 2)) % 1);
    const R = H * (1 - 0.15 * Math.abs(a) / SPREAD) * (0.85 + 0.25 * rand(j, s, 3)), d = R * h * out(u, 0.04 + 0.08 * h);
    const f0 = 0.28 + 0.15 * (1 - h), sink = Math.max(0, u - f0);
    const r = (1.8 + 3.2 * h) * (0.5 + 0.5 * out(u, 0.04)) * (1 + 0.6 * smooth(0.1, 1, u));
    const y = -Math.cos(a) * d + 70 * sink * sink;
    list.push({ x: Math.sin(a) * d * (1 + 0.5 * sink), y: Math.min(y, -r * 0.6), r, a: 0.95 * (1 - smooth(f0 + 0.05, f0 + 0.6, u)), tone: h > 0.55 ? 3 : 2, h });
  }
  return list.sort((p, q) => q.h - p.h); // the tips behind, the roots in front
}

// The lanes' streaks: dirt shooting up each lane, its root letting go as the clumps fly on, gone once they stall.
function jets(p, D, u, s) {
  const fade = 1 - smooth(0.12, 0.3, u);
  if (u <= 0 || fade <= 0) return;
  for (let lane = 0; lane < 7; lane++) {
    const a = (lane / 6 - 0.5) * 2 * SPREAD + (rand(lane, s, 30) - 0.5) * 0.1, L = H * (1 - 0.35 * Math.abs(a) / SPREAD) * out(u, 0.06);
    const root = L * smooth(0.05, 0.3, u), dx = Math.sin(a), dy = -Math.cos(a);
    p.beam(dx * root, -1 + dy * root, dx * L * 0.8, -1 + dy * L * 0.8, 2.5, D[2], fade);
    p.line(dx * L * 0.8, -1 + dy * L * 0.8, dx * L, -1 + dy * L, D[3], fade); // thinning to its tip
  }
}

// The flame punching up the middle of the fan, v from 0 to 1 over its life: a ragged tongue from the crater, white at
// its root, that shoots up, then shrinks and cools down the ramp.
function tongue(p, F, v, s) {
  const top = 18 + 26 * out(v, 0.25) * (1 - 0.6 * v * v), hot = Math.round(7 - 2.5 * v);
  p.shade(-7, -top - 1, 14, top, (x, y) => {
    const h = (-0.5 - y) / top, row = Math.floor(-y), w = 6 * (1 - v * 0.4) * (1 - h) ** 0.8 * (0.75 + 0.5 * rand(row, Math.floor(v * 4), s));
    const d = Math.abs(x + 0.5) / Math.max(w, 0.01);
    return h >= 0 && h <= 1 && d < 1 ? F[Math.max(3, hot - (d > 0.6 ? 2 : d > 0.3 ? 1 : 0) - (h > 0.6 ? 1 : 0))] : 0;
  });
}

export function create(o) {
  const rng = new Rng(o.seed), D = o.palette, F = o.fire, M = o.metal, s = o.seed;
  const parts = new Particles({ rng, palette: F, smoke: D.slice(1, 6), dust: D, ground: -1 }); // its smoke is the dirt's dark haze
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: -1.5,
    onLand: b => {
      if (b.vy < 50 || b.age > 1.2) return; // a hard landing, early enough for its dust to settle
      for (let i = 0; i < 2; i++) parts.spawn(DUST, b.x, -1, rng.range(-20, 20), rng.range(-10, -3), rng.range(0.3, 0.45), { size: rng.range(1.5, 2.2) });
    },
  });
  const grains = [];

  function blast() {
    lights.add(0, -14, 38, F[7], 1, 0.08); // white, then the fire's own light once it has faded
    lights.add(0, -10, 30, F[5], 0.75, 0.45, { delay: 0.08 });
    for (let i = 0; i < 10; i++) { // fire bursting up the middle of the fan, burning out fast
      const a = rng.range(-0.3, 0.3), v = rng.range(110, 190);
      parts.spawn(FIRE, rng.range(-3, 3), -2, Math.sin(a) * v, -Math.cos(a) * v, rng.range(0.14, 0.3), { size: rng.range(3.5, 6), delay: 1 / 30 });
    }
    for (let i = 0; i < 5; i++) { // smoke left hanging in the fan as the dirt comes down
      parts.spawn(SMOKE, rng.range(-10, 10), -10 - 8 * i, rng.range(-8, 8), -rng.range(10, 25), rng.range(0.9, 1.2), { size: rng.range(3.5, 5), delay: rng.range(0.25, 0.45), back: true });
    }
    for (let i = 0; i < 46; i++) { // grit flung up in streaks, raining back
      const a = rng.range(-SPREAD, SPREAD), v = rng.range(110, 195) * (1 - 0.4 * Math.abs(a) / SPREAD); // the steep ones fly highest
      grains.push({ x: rng.range(-3, 3), y: -3, vx: Math.sin(a) * v, vy: -Math.cos(a) * v, c: D[rng.int(2, 4)], delay: rng.range(0.02, 0.09) });
    }
    for (let i = 0; i < 12; i++) { // clods thrown high
      const side = i % 2 ? 1 : -1;
      bits.spawn(side * rng.range(0, 3), -4, side * rng.range(8, 40), -rng.range(110, 175), { c: D[i < 3 ? 1 : rng.int(2, 3)], size: rng.range(2.5, 4), life: rng.range(1.5, 1.85), delay: 1 / 30 });
    }
    bits.spawn(0, -5, 18, -185, { c: M[3], size: 3.5, life: 1.85, delay: 1 / 30 }); // the plate
    for (const side of [-1, 1]) { // the dust cloud rolling out along the floor, and again as the dirt comes down
      for (let i = 0; i < 7; i++) {
        parts.spawn(DUST, side * rng.range(2, 10), -2, side * rng.range(30, 95), -rng.range(4, 18), rng.range(0.95, 1.4), { size: rng.range(3, 5), delay: rng.range(0.04, 0.16) });
      }
      for (let i = 0; i < 5; i++) {
        parts.spawn(DUST, side * rng.range(4, 26), -2, side * rng.range(10, 40), -rng.range(4, 12), rng.range(0.8, 1.05), { size: rng.range(3, 4.5), delay: rng.range(0.45, 0.65), back: i % 2 === 0 });
      }
    }
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      if (n === BOOM_F * 4) blast();
      if (n === CLICK_F * 4) for (const x of [-5, 5]) parts.spawn(DUST, x, -2, x * 3, -6, 0.25, { size: 1.2 }); // the jolt shakes dust off its rim
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
      for (const g of grains) {
        if (g.delay > 0) {
          g.delay -= dt;
          continue;
        }
        g.vy += 300 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y >= -1) g.dead = true;
      }
      for (let i = grains.length - 1; i >= 0; i--) if (grains[i].dead) grains.splice(i, 1);
    },
    drawBack(p) {
      parts.draw(p, 'back');
    },
    draw(p) {
      const f = Math.floor(n / 4), k = n - BOOM_F * 4, u = k / 120; // counted in steps, so the hero frame is one frame
      lights.draw(p);
      if (f < BOOM_F) {
        mine(p, M, D, F, f, f >= BOOM_F - 2 ? (f - BOOM_F + 3) / 2 : 0);
      } else {
        const glow = smooth(0.06, 0.1, u) * Math.max(0, 1 - (u - 0.1) / 0.6) ** 2;
        if (glow > 0) p.glowLine(-24, -1, 24, -1, 6, F[5], 0.45 * glow);
        const cool = 1 - smooth(1.6, 1.95, u); // the crater, smouldering until it cools
        if (u > 1 / 30 && cool > 0) {
          p.line(-8, -0.5, 8, -0.5, x => D[Math.abs(x - 0.5) < 0.3 ? 0 : 1], cool);
          for (const side of [-1, 1]) p.line(side * 9, -1.5, side * 12, -1.5, D[3], cool);
          for (let j = 0; j < 5; j++) {
            const x = Math.round((rand(j, s, 40) - 0.5) * 14);
            if (rand(j, Math.floor(t * 10), s) < 0.6) p.px(x, -1, F[u < 1 ? 5 : 4]);
            p.light(x, -1, F[5], 0.3 * cool);
          }
        }
      }
      for (const g of grains) if (g.delay <= 0) p.line(g.x - g.vx * 0.018, g.y - g.vy * 0.018, g.x, g.y, g.c);
      jets(p, D, u, s);
      if (k >= 4) for (const q of fan(u, s)) puff(p, D, { ...q, tone: q.tone + (u < 0.1 ? 2 : 0) });
      if (k >= 4 && k < 20) tongue(p, F, (k - 4) / 16, s);
      bits.draw(p);
      parts.draw(p);
      if (k >= 0 && k < 4) { // the hero frame: white, bursting up out of the floor in a fan
        p.ellipse(0, -1, 9, 8, (dx, dy) => dy < 0 && F[7]);
        for (const [a, l, w] of [[-0.42, 30, 3], [-0.18, 40, 3], [0, 48, 4], [0.2, 38, 3], [0.44, 28, 3]]) p.beam(0, -3, Math.sin(a) * l, -3 - Math.cos(a) * l, w, F[7]);
        p.beam(-22, -1, 22, -1, 2, F[7]);
      }
    },
  };
}
