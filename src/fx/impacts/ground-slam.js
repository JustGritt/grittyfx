import { Rng, Particles, Lights, Bits, SPARK, DUST } from '../../core/index.js';

const smooth = (e0, e1, x) => {
  const u = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
};
const L = 62; // the far front's run, from the bite to the target's feet
const B = 28; // the near front's, back past the wielder's feet, where it dies
const HIT = 9 / 30; // the far front reaches the target
const BACK = 0.24; // the near front dies
const FLAT = 0.4; // the floor seen from a low angle: depth squashed to this
const F = 1 / 30;

export const meta = {
  name: 'Ground slam',
  desc: 'A blade driven into the floor: a white flash, sparks and cracks where it bites, then a shockwave of rolled-up dust and grit runs both ways along the floor, skimming it, the far side bursting under the target',
  tags: ['impact', 'slam', 'shockwave', 'ground', 'melee', 'crack', 'dust', 'debris'],
  size: [136, 48],
  origin: [44, 34],
  duration: 1.1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, debris: 6, dust: 6 },
  options: { palette: 'fire', debris: 'stone', dust: 'dust', seed: 1 },
  act: { hits: [{ t: HIT, freeze: 0.1, shake: 4 }] },
  stage: { at: 'target', x: -L, ground: 0, pose: 'slam', cast: 'knight' }, // bitten into the floor in front of the knight, the far front at the goblin's feet
  sound: [
    { t: 0, kind: 'crack', gain: 0.9, pitch: 1.2 }, // steel on stone
    { t: 0, kind: 'thump', gain: 0.8, pitch: 0.65 },
    { t: 0, kind: 'crack', gain: 0.45, pitch: 0.35 }, // the wave's rumble
    { t: HIT, kind: 'thump', gain: 0.9, pitch: 0.8 }, // the burst under the target
    { t: HIT, kind: 'crack', gain: 0.7, pitch: 0.75 },
    { t: 0.55, kind: 'crack', gain: 0.12, pitch: 2.4 }, // grit landing
  ],
};

const far = t => (t < HIT ? L * (t / HIT) ** 0.8 : L + 5 * smooth(0, 0.3, t - HIT)); // fast off the mark, steady, then breaking over the target's toes
const near = t => -B * (1 - (1 - Math.min(1, t / BACK)) ** 2); // the same start, braking to a stop
const farAt = x => HIT * (x / L) ** 1.25; // when each front passes x
const nearAt = x => BACK * (1 - Math.sqrt(1 - Math.min(1, -x / B)));
const farV = x => (0.8 * L) / HIT / Math.max(0.15, x / L) ** 0.25; // the far front's speed at x
// Each crest: how tall (px), how high its puffs ride and how far they spread (x its height), and how solid it is. Up
// at once; the far one rears up the target's front as it hits, then spreads, swells and settles there; the near one
// sinks as it brakes.
const farCrest = t => (t < HIT ? [(7 + 3 * (t / HIT)) * Math.min(1, t / (2 * F)) ** 0.7, 1, 1, 1]
  : [10 + 2 * smooth(0, 0.1, t - HIT), 1.3 - 0.8 * smooth(0, 0.3, t - HIT), 1 - smooth(0.05, 0.5, t - HIT), 1 + 0.6 * smooth(0, 0.35, t - HIT)]);
const nearCrest = t => [7 * Math.min(1, t / (2 * F)) * (1 - (0.4 * t) / BACK), 1 - 0.6 * smooth(0.5, 1, t / BACK), 1 - smooth(0.6, 1, t / BACK), 1];

// The crest's puffs as [behind the front, lift, radius, tone, back], in units of its height: the lead puff biggest and
// brightest, one riding on it like a breaking wave, smaller ones rolling behind, a darker one tossed up at the back.
const PUFFS = [[0.48, 0, 0.5, 3], [0.82, 0.5, 0.36, 3], [1.2, 0, 0.42, 2], [1.65, 0.12, 0.32, 2], [1.05, 0.72, 0.3, 1, true]];

// A puff lit from up-left: a highlight, the body, a darker rim down-right while it is dense, soft at the edge (as in
// landing-dust).
function puff(p, U, x, y, r, a, tone) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return U[Math.min(5, tone + 2)];
    return U[a > 0.5 && Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.65, d));
}

// The crest: grit and dust rolled up into a wave running along the floor toward dir, its front at xf, churning as it
// goes (each puff bobbing on its own phase); its leading face lit by a thin bright lip, skim lines streaking the floor
// ahead of it while it runs. `lit` lights the lip (white on the hit).
function crest(p, t, dir, xf, [H, lift, a, spread], U, lit, back, running) {
  if (H < 1.5 || a <= 0) return;
  PUFFS.forEach(([behind, up, size, tone, b], j) => {
    if (!!b !== back) return;
    const r = size * H * (1 + 0.08 * Math.sin(t * 40 + j * 2)) * (1 + 0.5 * (1 - a));
    const x = xf - dir * (behind * spread * H + 0.6 * Math.sin(t * 31 + j * 1.7)), y = -r - up * lift * H + 0.5 * Math.sin(t * 37 + j);
    puff(p, U, x, y, r, 0.95 * a, Math.min(3, tone + (a > 0.6 ? 1 : 0)));
    if (j === 0 && running) { // the lip over the lead puff's leading face
      const ang = v => (dir > 0 ? v : Math.PI - v);
      p.arc(x + 0.5, y + 0.5, r + 0.3, ang(-Math.PI / 2 - 0.3), ang(0.5), 1.6, lit);
    }
  });
  if (back || !running) return;
  p.line(xf - dir * 9, -0.5, xf + dir * 3, -0.5, v => U[v > 0.6 ? 5 : 4], v => v);
  p.line(xf - dir * 4, -H * 0.45, xf + dir * 2, -H * 0.6, v => U[v > 0.5 ? 5 : 4], v => v);
}

// The cracks the blade splits: a line wandering out each way over the floor, a fork off each, every line knowing how
// far along the crack it starts so it grows out of its parent.
function cracks(rng) {
  const lines = [];
  const grow = (x, z, base, len, from) => {
    const pts = [[x, z]], at = [from];
    for (let d = 0, a = base; d < len; ) {
      const s = rng.range(2, 3.5);
      a = base + (a - base) * 0.3 + rng.range(-0.9, 0.9);
      x += Math.cos(a) * s;
      z = Math.max(-8, Math.min(8, z + Math.sin(a) * s));
      pts.push([x, z]);
      at.push(from + (d += s));
    }
    lines.push({ pts: pts.map(([x, z]) => [x, z * FLAT]), at });
    return { pts, at };
  };
  for (const base of [0, Math.PI]) {
    const main = grow(0, 0, base + rng.range(-0.25, 0.25), rng.range(10, 14), 0);
    const k = Math.min(rng.int(1, 3), main.pts.length - 1);
    grow(...main.pts[k], base + rng.pick([-1, 1]) * rng.range(0.9, 1.3), rng.range(3, 6), main.at[k]);
  }
  return lines;
}

// A crack line grown out to `reach`, its last segment cut at the tip.
function grown({ pts, at }, reach) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length && at[i - 1] < reach; i++) {
    const u = Math.min(1, (reach - at[i - 1]) / (at[i] - at[i - 1])), [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    out.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);
  }
  return out;
}

// The bite: a white star flat along the floor with a spike up the blade, then a shrinking hot one.
function flash(p, t, C) {
  if (t < F) {
    p.ellipse(0.5, -0.5, 12, 2.2, C[7]);
    p.circle(0.5, -1.5, 3.2, C[7]);
    p.beam(0.5, -1, 0.5, -12, 2, C[7]);
    for (const [dx, dy] of [[1, -1], [-1, -1]]) p.line(0, -1, dx * 7, -1 + dy * 6, C[7]);
  } else if (t < 0.2) {
    const u = (t - F) / (0.2 - F), l = 10 * (1 - u) ** 1.5;
    p.ellipse(0.5, -0.5, 1 + 8 * (1 - u) ** 2, 1.5 * (1 - u) + 0.5, C[u < 0.3 ? 7 : 6]);
    p.line(0, -1, 0, -1 - l, C[u < 0.3 ? 7 : 5]);
    for (const dx of [-1, 1]) p.line(0, -1, dx * l * 1.4, -1, C[u < 0.3 ? 6 : 5]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, D = o.debris, U = o.dust;
  const parts = new Particles({ rng, palette: C, dust: U, ground: 0 }), lights = new Lights();
  const bits = new Bits({ rng, ground: 0, gravity: 560 });
  const lines = cracks(rng);

  // the bite: the flash, steel sparks skittering low both ways, stone chips and a puff of dust
  lights.add(0, -3, 16, C[7], 1, 0.14);
  lights.add(0, -2, 14, C[5], 0.6, 0.3, { delay: F });
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, a = rng.range(0.15, 0.95), v = rng.range(70, 150);
    parts.spawn(SPARK, side * 2, -1, side * Math.cos(a) * v, -Math.sin(a) * v, rng.range(0.18, 0.38));
  }
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    bits.spawn(side * rng.range(0, 3), -1, side * rng.range(15, 55), -rng.range(90, 150), { c: D[rng.int(1, 3)], size: rng.range(1.8, 2.8), shard: i % 3 === 2, life: rng.range(0.5, 0.7), delay: F });
  }
  for (let i = 0; i < 5; i++) parts.spawn(DUST, rng.range(-3, 3), -1, rng.range(-20, 20), -rng.range(6, 14), rng.range(0.35, 0.5), { size: rng.range(1.8, 2.6), delay: F, back: i % 2 === 0 });

  // dust shed off each crest's foot as it passes, flung ahead and dragging behind; grit hopping up under the far one
  for (let x = 5; x < L - 3; x += rng.range(3, 8)) {
    const at = farAt(x), v = farV(x);
    parts.spawn(DUST, x, -rng.range(0.5, 3), v * rng.range(0.15, 0.6), -rng.range(3, 22), rng.range(0.3, 0.6), { size: rng.range(1.1, 2.5), delay: at, back: rng.chance(0.4) });
    if (rng.chance(0.5)) bits.spawn(x, -1, rng.range(0, 40), -rng.range(50, 100), { c: D[rng.int(2, 4)], size: rng.range(1, 2), life: rng.range(0.35, 0.45), delay: at });
  }
  for (let x = -4; x > -B + 4; x -= rng.range(4, 8)) {
    parts.spawn(DUST, x, -rng.range(0.5, 2), -rng.range(15, 50), -rng.range(3, 14), rng.range(0.3, 0.45), { size: rng.range(1.1, 1.9), delay: nearAt(x), back: rng.chance(0.5) });
  }

  // the burst under the target
  lights.add(L, -6, 20, C[7], 1, 0.22, { delay: HIT });
  for (let i = 0; i < 9; i++) {
    const a = rng.range(-Math.PI * 0.8, -Math.PI * 0.2), v = rng.range(70, 140);
    bits.spawn(L + rng.range(-3, 3), -1, Math.cos(a) * v * 0.4, Math.sin(a) * v, { c: D[rng.int(1, 4)], size: rng.range(1.5, 2.8), life: rng.range(0.55, 0.75), delay: HIT });
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    parts.spawn(DUST, L + side * rng.range(1, 6), -1, side * rng.range(20, 55), -rng.range(8, 24), rng.range(0.45, 0.65), { size: rng.range(1.6, 2.6), delay: HIT + rng.range(0, 0.05), back: i % 3 === 0 });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the burst lands on its frame
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      parts.draw(p, 'back');
      // the cracks: white hot for a blink, cooling fast to a dark split with a lit lip, fading at the end
      const reach = 14 * (1 - (1 - Math.min(1, t / 0.08)) ** 3), a = Math.min(1, (1.05 - t) / 0.3);
      if (a > 0) {
        const hot = t < F ? 7 : t < 2 * F ? 6 : t < 4 * F ? 4 : 0;
        const split = (pts, c, dy = 0) => p.polyline(pts.map(([x, y]) => [x, y + dy]), c, a);
        for (const l of lines) {
          const pts = grown(l, reach);
          if (pts.length < 2) continue;
          if (hot) split(pts, C[hot]);
          else split(pts, D[3], -1), split(pts, D[0]);
        }
        p.ellipse(0.5, 0.5, 2.5, 1, hot ? C[hot] : D[0], a); // the cut the blade left
      }
      crest(p, t, -1, near(t), nearCrest(t), U, U[5], true);
      crest(p, t, 1, far(t), farCrest(t), U, U[5], true);
    },
    draw(p) {
      const hit = t >= HIT && t < HIT + F;
      lights.draw(p);
      if (t < BACK) p.glowLine(near(t) + 8, -1, near(t), -1, 5, U[5], 0.3);
      if (t < HIT) p.glowLine(far(t) - 8, -1, far(t), -1, 5, U[5], 0.3);
      crest(p, t, -1, near(t), nearCrest(t), U, U[5], false, t < BACK);
      crest(p, t, 1, far(t), farCrest(t), U, hit ? C[7] : U[5], false, t < HIT + F);
      if (t >= HIT && t < HIT + 3 * F) { // the floor bursting under the target: a white flat flash, grit spat up
        const u = (t - HIT) / (3 * F);
        if (hit) p.ellipse(L + 0.5, -0.5, 11, 2, C[7]);
        for (const [dx, h] of [[-7, 9], [-3, 14], [1, 11], [5, 15], [9, 8]]) {
          const top = -h * (0.5 + 0.5 * u), tail = top + h * 0.6 * (1 - u);
          p.line(L + dx + u * dx * 0.3, tail, L + dx + u * dx * 0.5, top, v => (v > 0.5 ? C[hit ? 7 : 6] : U[5]));
        }
      }
      bits.draw(p);
      parts.draw(p);
      flash(p, t, C);
    },
  };
}
