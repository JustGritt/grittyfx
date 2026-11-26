import { Rng, Particles, Lights, Bits, FIRE, DUST, rand } from '../../core/index.js';

export const meta = {
  name: 'Shell blast',
  desc: 'An artillery shell landing in dirt: a hard flash, a tall column of earth and smoke thrown straight up, clods raining back, a dust skirt rolling out and a smouldering scorch',
  tags: ['explosion', 'military', 'artillery', 'shell', 'mortar', 'blast', 'dirt', 'debris', 'smoke'],
  size: [120, 122],
  origin: [60, 98],
  duration: 2,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, fire: 8, smoke: 8 },
  options: { palette: 'dust', fire: 'fire', smoke: 'smoke', seed: 1 },
  act: { hits: [{ t: 0, freeze: 0.09, shake: 6 }] },
  stage: { ground: 0 },
  sound: [
    { t: 0, kind: 'thump', pitch: 0.4 }, // the heavy blow
    { t: 0, kind: 'crack', gain: 0.8, pitch: 0.25 }, // its rumble
    { t: 0, kind: 'crack', gain: 0.6, pitch: 1 }, // the sharp front
    { t: 0.62, kind: 'thump', gain: 0.2, pitch: 2.6 }, // clods pattering down
    { t: 0.74, kind: 'thump', gain: 0.16, pitch: 3 },
    { t: 0.83, kind: 'thump', gain: 0.22, pitch: 2.3 },
    { t: 0.95, kind: 'thump', gain: 0.14, pitch: 3.2 },
    { t: 1.08, kind: 'thump', gain: 0.1, pitch: 2.8 },
  ],
};

const TAU = Math.PI * 2;
const G = 300;
const H = 70; // how high the column's head is thrown
const out = (t, k) => (t > 0 ? 1 - Math.exp(-t / k) : 0); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// A volume lit from up-left: a highlight on the big ones only (small ones lit would make a bunch of grapes), the body,
// a rim one step darker down-right, soft at the edge.
function puff(p, C, { x, y, r, a, tone }) {
  if (a <= 0.01 || r < 0.5) return;
  const lit = r > 4.5 ? r * 0.55 : -1;
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < lit) return C[Math.min(C.length - 1, tone + 1)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.9 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.7, d));
}

// The column of earth, from t alone: puffs punched straight up, the head slowest to stall and fanning into a crown,
// then falling back and thinning, the head first. h is 0 at the foot, 1 at the head.
function column(t, s) {
  const list = [];
  for (let j = 0; j < 28; j++) {
    const h = Math.min(1, (j / 27) ** 0.8 + 0.04 * rand(j, s)), crown = smooth(0.5, 1, h);
    const spread = (((j * 0.618 + rand(0, s, 9)) % 1) - 0.5) * 2 + (rand(j, s, 1) - 0.5) * 0.3; // spread evenly, so the crown fans out instead of forking
    const tau = 0.04 + 0.09 * h, xs = spread * (2 + 3 * (1 - h) + 15 * crown);
    const f0 = 0.55 - 0.2 * h, sink = Math.max(0, t - f0);
    const y = -(3 + (H - 3) * h) * out(t, tau) + 45 * sink * sink;
    const size = h < 0.5 ? 6 - 4 * h : 3 + 4 * rand(j, s, 2) * crown + 1.5 * crown;
    const r = size * (0.35 + 0.65 * out(t, 0.05)) * (1 + 0.5 * smooth(0.2, 1.3, t));
    list.push({ x: xs * out(t, tau * 1.6), y: Math.min(y, -r * 0.7), r, a: 0.95 * (1 - smooth(f0, f0 + 0.6, t)), tone: h > 0.6 ? 3 : 2, h });
  }
  return list.sort((p, q) => q.h - p.h); // the head behind, the stem in front
}

// Smoke left in the column: it comes up as the earth flies, rises slowly and swells, and is what is left once the dirt
// has fallen.
function smoke(t, s) {
  const list = [];
  for (let j = 0; j < 11; j++) {
    const h = 0.35 + 0.65 * (j / 10), t0 = 0.15 + 0.2 * rand(j, s, 3), u = (t - t0) / (1.3 + 0.3 * rand(j, s, 4));
    if (u <= 0 || u >= 1) continue;
    const x = (rand(j, s, 5) - 0.5) * (6 + 24 * h) + 5 * u * u;
    list.push({ x, y: -(6 + (H - 8) * h) * out(t, 0.12) - 16 * u, r: (4.5 + 2.5 * rand(j, s, 6)) * (1 + 1.1 * u), a: 0.8 * Math.min(1, u / 0.15) * (1 - u) ** 1.3, tone: u < 0.45 ? 3 : 2 });
  }
  return list;
}

// Smoke as one body: each pixel takes its densest puff, so overlaps don't outline the puffs; the lobes show by their
// highlights.
function smokeBody(p, S, list) {
  if (!list.length) return;
  const x0 = Math.floor(Math.min(...list.map(q => q.x - q.r))), x1 = Math.ceil(Math.max(...list.map(q => q.x + q.r)));
  const y0 = Math.floor(Math.min(...list.map(q => q.y - q.r))), y1 = Math.ceil(Math.max(...list.map(q => q.y + q.r)));
  let dense = 0; // c runs before a for each pixel: c finds the densest puff, a uses its density
  p.shade(x0, y0, x1 - x0, y1 - y0, (x, y) => {
    let best = null;
    dense = 0;
    for (const q of list) {
      const dx = x + 0.5 - q.x, dy = y + 0.5 - q.y, k = q.a * smooth(1, 0.45, Math.hypot(dx, dy) / q.r);
      if (k > dense) (dense = k), (best = { q, dx, dy });
    }
    if (!best) return 0;
    const { q, dx, dy } = best;
    return S[Math.hypot(dx + q.r * 0.3, dy + q.r * 0.35) < q.r * 0.55 ? q.tone + 1 : q.tone];
  }, () => dense);
}

// The crown's jets: spikes of earth flung out of the head, behind the crown so only their tips show past it; they
// droop and break up as the crown falls.
function jets(p, D, t, s) {
  const fade = 1 - smooth(0.3, 0.6, t);
  if (t < 0.03 || fade <= 0) return;
  const head = -H * 0.82 * out(t, 0.1);
  for (let j = 0; j < 7; j++) {
    const a = (j / 6 - 0.5) * 2 + (rand(j, s, 20) - 0.5) * 0.3; // from straight up
    const L = (19 + 16 * rand(j, s, 21)) * out(t - 0.03, 0.08), droop = 40 * Math.max(0, t - 0.2) ** 2;
    const x1 = Math.sin(a) * L, y1 = head - Math.cos(a) * L + droop, at = k => [x1 * k, head + (y1 - head) * k];
    p.beam(0, head, ...at(0.8), 3, D[2], fade);
    p.line(...at(0.8), x1, y1, D[3], fade);
  }
}

// The skirt: puffs that roll out along the floor both ways, curling up as they go, the lead ones farthest and
// biggest, darker ones behind; a smaller second roll as the column falls back on itself.
function skirt(t, s, back) {
  const list = [];
  const wave = (n, t0, reach, size, life, seed) => {
    for (const side of [-1, 1]) {
      for (let j = 0; j < n; j++) {
        const lead = j / (n - 1), k = seed + side * 20 + j, b = rand(k, s, 2) < 0.35;
        const u = (t - t0) / (life * (0.75 + 0.45 * lead));
        if (b !== back || u <= 0 || u >= 1) continue;
        const d = (2 + reach * lead * (0.8 + 0.35 * rand(k, s))) * out(t - t0, 0.1 + 0.18 * lead) + 6 * (t - t0);
        const r = (size * (0.7 + 0.6 * rand(k, s, 1)) + 2.5 * lead) * (0.4 + 0.6 * out(t - t0, 0.08)) * (1 + 0.5 * u);
        const lift = (b ? 3 : 0) + 4 * lead * smooth(0, 0.5, u);
        list.push({ x: side * d, y: -r * 0.7 - lift, r, a: 0.9 * (1 - smooth(0.35, 1, u)), tone: b ? 2 : 3 });
      }
    }
  };
  wave(8, 0.02, 34, 3, 1.05, 0);
  wave(5, 0.5, 20, 3, 0.95, 7);
  return list.sort((p, q) => p.r - q.r);
}

export function create(o) {
  const rng = new Rng(o.seed), D = o.palette, F = o.fire, S = o.smoke, s = o.seed;
  const parts = new Particles({ rng, palette: F, dust: D, ground: -1 });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: -1.5, // so a clod lying still sits on the floor, not half in it
    onLand: b => {
      if (b.vy < 50) return;
      for (let i = 0; i < 2; i++) parts.spawn(DUST, b.x, -1, rng.range(-20, 20), rng.range(-10, -3), rng.range(0.3, 0.45), { size: rng.range(1.5, 2.2) });
    },
  });

  lights.add(0, -18, 40, F[7], 1, 0.1);
  lights.add(0, -8, 28, F[5], 0.6, 0.35, { delay: 0.06 });

  // fire licking out of the crater for a blink
  for (let i = 0; i < 6; i++) {
    const a = rng.range(-0.7, 0.7);
    parts.spawn(FIRE, rng.range(-5, 5), -3, Math.sin(a) * 50, -rng.range(30, 90), rng.range(0.07, 0.11), { size: rng.range(4, 6), delay: 0.02 });
  }
  // clods arcing out and raining back
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, e = rng.range(1.1, 1.4), v = rng.range(80, 125);
    bits.spawn(side * rng.range(0, 3), -6, side * Math.cos(e) * v, -Math.sin(e) * v, { c: D[i < 3 ? 1 : rng.int(2, 3)], size: rng.range(2.5, 4), life: rng.range(1.4, 1.75), delay: 0.03 });
  }
  // grains: dirt flung up in streaks and showering back down
  const grains = [];
  for (let i = 0; i < 40; i++) {
    const a = rng.range(-0.12, 0.12), v = rng.range(120, 205); // no higher than the column's head
    grains.push({ x: rng.range(-3, 3), y: -4, vx: Math.sin(a) * v, vy: -Math.cos(a) * v, c: D[rng.int(2, 4)], delay: rng.range(0.02, 0.08) });
  }
  // the scorch: embers left in the crater
  const embers = Array.from({ length: 6 }, (_, i) => ({ x: Math.round(rng.range(-8, 8)), y: rng.chance(0.5) ? -1 : -2, j: i }));
  // the flash's spikes: [angle from straight up, length]
  const spikes = Array.from({ length: 7 }, (_, i) => [(i / 6 - 0.5) * 2.3 + rng.range(-0.1, 0.1), i === 3 ? 34 : rng.range(14, 24)]);

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
      for (const g of grains) {
        if (g.delay > 0) {
          g.delay -= dt;
          continue;
        }
        g.vy += G * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y >= -1) g.dead = true;
      }
      for (let i = grains.length - 1; i >= 0; i--) if (grains[i].dead) grains.splice(i, 1);
    },
    drawBack(p) {
      smokeBody(p, S, smoke(t, s));
      for (const q of skirt(t, s, true)) puff(p, D, q);
    },
    draw(p) {
      lights.draw(p);
      const floor = smooth(0.06, 0.1, t) * Math.max(0, 1 - (t - 0.1) / 0.8) ** 2;
      if (floor > 0) p.glowLine(-26, -1, 26, -1, 6, F[5], 0.45 * floor);
      // the scorch, smouldering until it cools
      const cool = 1 - smooth(1.45, 1.95, t);
      if (t > 0.05 && cool > 0) {
        p.line(-11, -0.5, 11, -0.5, u => D[Math.abs(u - 0.5) < 0.3 ? 0 : 1], cool);
        for (const side of [-1, 1]) p.line(side * 12, -1.5, side * 15, -1.5, D[2], cool);
        for (const e of embers) {
          if (rand(e.j, Math.floor(t * 10), s) < 0.6) p.px(e.x, e.y, F[t < 1 ? 5 : 4]);
          p.light(e.x, e.y, F[5], 0.3 * cool);
        }
        const rise = smooth(0.6, 0.9, t);
        for (let j = 0; j < 3; j++) { // threads of smoke off the scorch, curling as they rise
          const x0 = (j - 1) * 6 + (rand(j, s, 11) - 0.5) * 3, len = (10 + 8 * rand(j, s, 12)) * rise, ph = rand(j, s, 13);
          let px = x0, py = -1;
          for (let i = 1; i <= 8; i++) {
            const v = i / 8, x = x0 + Math.sin(TAU * (v * 0.8 + ph) - t * 5) * 2.5 * v, y = -1 - len * v;
            p.line(px, py, x, y, S[v < 0.5 ? 5 : 4], 0.8 * cool * rise * (1 - v));
            [px, py] = [x, y];
          }
        }
      }
      for (const g of grains) { // behind the column, so they show as its ragged edge and the dirt raining off it
        if (g.delay > 0) continue;
        p.line(g.x - g.vx * 0.018, g.y - g.vy * 0.018, g.x, g.y, g.c);
      }
      jets(p, D, t, s);
      for (const q of column(t, s)) puff(p, D, { ...q, tone: q.tone + (t < 0.07 ? 2 : 0) });
      for (const q of skirt(t, s, false)) puff(p, D, q);
      bits.draw(p);
      parts.draw(p);
      if (t < 2 / 30) { // the hard flash: a white dome on the crater, spikes of fire thrown out of it
        const k = t < 1 / 30 ? 1 : 0.7, hot = t < 1 / 30 ? 7 : 6;
        p.ellipse(0, 0, 12 * k, 10 * k, (dx, dy, d) => dy < 0 && F[d > 0.8 ? hot - 1 : hot]); // cut at the floor
        for (const [a, len] of spikes) {
          const x = Math.sin(a) * len * k, y = -Math.cos(a) * len * k - 3;
          p.beam(0, -3, x * 0.6, (y + 3) * 0.6 - 3, 4 * k, F[hot]);
          p.line(x * 0.6, (y + 3) * 0.6 - 3, x, y, F[hot - 1]);
        }
      }
    },
  };
}
