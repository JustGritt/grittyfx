import { Rng, Particles, Lights, SMOKE, SPARK, EMBER, rand } from '../../core/index.js';

const HIT = 0.3;

export const meta = {
  name: 'Dark nova',
  desc: 'Darkness is pulled in to the caster\'s feet, then bursts out as a ring of shadow tendrils and dark motes along the ground under a violet rim light',
  tags: ['nova', 'shadow', 'dark', 'magic', 'spell', 'blast'],
  size: [104, 68],
  origin: [52, 48],
  duration: 1.4,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [100, 100] },
  ramps: { palette: 8, rim: 8 },
  options: { palette: 'shadow', rim: 'arcane', seed: 1 },
  act: { hits: [{ t: HIT, freeze: 0.06, shake: 3 }] },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.5, pitch: 0.4 }, // the pull, peaking on the hit
    { t: HIT, kind: 'thump', gain: 0.9, pitch: 0.55 },
    { t: HIT, kind: 'crack', gain: 0.6, pitch: 0.35 }, // a low rumble under it
    { t: HIT, kind: 'chime', gain: 0.25, pitch: 0.5 },
    { t: HIT + 0.05, kind: 'whoosh', gain: 0.35, pitch: 0.6 }, // tendrils thrown out
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30;
const SQ = 0.3; // the ground ellipse's height over its width, seen at a slant
const N = 13; // tendrils

// The ring's radius: it races out from the feet and slows.
const ringR = t => 5 + 31 * (1 - (1 - Math.min(1, Math.max(0, (t - HIT) / 0.45))) ** 3);

// A tapered stroke along pts, colored by how far along it each pixel is (s, 0 at the base), lit along one side.
function stroke(p, pts, width, color, lit, side) {
  const n = pts.length - 1;
  for (let i = 1; i <= n; i++) p.beam(...pts[i - 1], ...pts[i], width((i - 0.5) / n), t => color((i - 1 + t) / n));
  if (!lit) return;
  const edge = pts.map(([x, y], i) => {
    const o = Math.max(0, width(i / n) / 2 - 0.5);
    return [x + side[0] * o, y + side[1] * o];
  });
  p.polyline(edge.slice(0, -1), lit);
}

// A tendril at time t: its age u, how far it has grown, its colors. null before it starts and after it is gone.
function phase(k, t, S, R) {
  const u = (t - HIT - k.delay) / k.life;
  if (u <= 0 || u >= 1) return null;
  const grow = u < 0.12 ? 1 - (1 - u / 0.12) ** 2 : 1, cool = Math.floor(u * 4);
  return {
    u, grow,
    len: k.h * grow * (0.3 + 0.7 * (1 - u) ** 0.7), // it sinks back as it fades
    width: s => (3.6 * (1 - s) ** 0.8 + 0.6) * (1 - 0.45 * u),
    // the base, lit by the ring, hottest; a dark body; a violet tip while it is fresh
    color: s => (u < 0.08 ? R[s < 0.5 ? 7 : 6] : s < 0.15 ? S[Math.max(3, 5 - cool)] : s > 0.85 && u < 0.4 ? R[4] : S[s < 0.55 ? 3 : 2]),
    lit: u < 0.08 ? 0 : u < 0.3 ? R[5] : S[Math.max(3, 7 - cool)],
  };
}

function tendrils(rng) {
  return Array.from({ length: N }, (_, i) => ({
    a: ((i + rng.range(0.2, 0.8)) / N) * TAU,
    h: rng.range(12, 21),
    curl: rng.range(0.5, 1) * (rng.chance(0.5) ? 1 : -1),
    ph: rng.range(0, TAU),
    rr: rng.range(0.8, 1),
    delay: rng.range(0, 0.06),
    life: rng.range(0.6, 0.85),
  }));
}

// The shock ring, broken in places that change every frame.
function brokenRing(p, t, s, draw) {
  const v = (t - HIT) / 0.45, f = Math.floor((t - HIT) / F);
  if (v < 0 || v >= 1) return;
  for (let i = 0; i < 48; i++) if (rand(i, f, s) >= 0.1 + v * 0.6) draw((i / 48) * TAU, ((i + 1) / 48) * TAU, v);
}

export function create(o) {
  if (o.view === 'top') return createTop(o);
  const rng = new Rng(o.seed), S = o.palette, R = o.rim, s = o.seed;
  const parts = new Particles({ rng, palette: R, smoke: S, ground: 0 });
  const lights = new Lights();
  const ks = tendrils(rng);
  const specks = Array.from({ length: 12 }, (_, i) => ({ a: ((i + rng.range(0, 1)) / 12) * TAU, r: rng.range(26, 38), h: rng.range(0, 10) }));

  lights.add(0, -6, 22, R[7], 1, 0.12, { delay: HIT });
  lights.add(0, -8, 18, R[5], 0.5, 0.6, { delay: HIT + 0.1 });
  for (let i = 0; i < 14; i++) { // dark puffs that roll out low along the ground
    const a = ((i + rng.range(0, 1)) / 14) * TAU, v = rng.range(45, 85);
    parts.spawn(SMOKE, Math.cos(a) * 5, Math.sin(a) * 5 * SQ - 1, Math.cos(a) * v, Math.sin(a) * v * SQ - 4, rng.range(0.6, 0.9), {
      size: rng.range(2.5, 4), delay: HIT + rng.range(0, 0.05), back: Math.sin(a) < 0,
    });
  }
  for (let i = 0; i < 16; i++) { // dark motes skittering out over the ground
    const a = rng.range(0, TAU), v = rng.range(60, 110);
    parts.spawn(SPARK, Math.cos(a) * 3, -1, Math.cos(a) * v, rng.range(-50, -15), rng.range(0.3, 0.5), { delay: HIT, ramp: S, back: Math.sin(a) < 0 });
  }
  for (let i = 0; i < 8; i++) { // violet motes that linger and drift up
    const a = rng.range(0, TAU), d = rng.range(10, 26);
    parts.spawn(EMBER, Math.cos(a) * d, Math.sin(a) * d * SQ - 2, rng.range(-10, 10), rng.range(-30, -12), rng.range(0.45, 0.7), { delay: HIT + rng.range(0.1, 0.3) });
  }

  let n = 0, t = 0;
  const ring = (p, front) => {
    const rx = ringR(t);
    brokenRing(p, t, s, (a0, a1, v) => {
      if (Math.sin((a0 + a1) / 2) > 0 !== front) return;
      p.line(Math.cos(a0) * rx, Math.sin(a0) * rx * SQ, Math.cos(a1) * rx, Math.sin(a1) * rx * SQ, R[(front ? 7 : 6) - Math.floor(v * 4)]);
    });
  };
  const drawTendrils = (p, front) => {
    for (const k of ks) {
      if (Math.sin(k.a) > 0 !== front) continue;
      const q = phase(k, t, S, R);
      if (!q) continue;
      const r = ringR(t) * k.rr, bx = Math.cos(k.a) * r, by = Math.sin(k.a) * r * SQ, dir = Math.cos(k.a) < 0 ? -1 : 1;
      const lean = (0.1 + 0.5 * q.u) * Math.abs(Math.cos(k.a)); // flung outward as the ring carries it
      const pts = Array.from({ length: 7 }, (_, j) => {
        const u = j / 6, h = q.len;
        const whip = Math.sin(TAU * (u * 0.9 - t * 2.2) + k.ph) * 2.6 * u; // a wave running up it
        return [bx + dir * (lean * u * h + k.curl * u * u * h * 0.35) + whip, by - u * h * (1 - 0.3 * lean)];
      });
      stroke(p, pts, q.width, q.color, q.lit, [-dir, 0]);
    }
  };

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the hero frame lands exactly on HIT
      parts.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      lights.draw(p);
      if (t < HIT) {
        const u = t / HIT;
        p.glow(0, -2, 6 + 10 * u, R[5], 0.2 + 0.5 * u * u);
      } else if (t >= HIT + F) {
        const v = Math.max(0, 1 - (t - HIT) / 0.9) ** 2, rx = ringR(t);
        p.glowLine(-rx, -1, rx, -1, 8, R[5], 0.45 * v); // rim light along the ground where the ring runs
      }
      ring(p, false);
      parts.draw(p, 'back');
      drawTendrils(p, false);
    },
    draw(p) {
      if (t < HIT) {
        // the pull: specks streak in faster and faster, a dark pool gathers at the feet
        const u = t / HIT, e = u * u;
        for (const q of specks) {
          const r = q.r * (1 - e), x = Math.cos(q.a) * r, y = Math.sin(q.a) * r * SQ - q.h * (1 - e);
          const len = 2 + 4 * u;
          p.line(x, y, x + Math.cos(q.a) * len, y + Math.sin(q.a) * len * SQ - (q.h * len) / q.r, j => (j < 0.4 ? R[5] : S[5]));
        }
        const cr = 36 * (1 - e) + 4; // a faint ring drawn in over the ground
        for (let i = 0; i < 40; i++) {
          const a0 = (i / 40) * TAU, a1 = ((i + 1) / 40) * TAU;
          if (i % 4 !== 3) p.line(Math.cos(a0) * cr, Math.sin(a0) * cr * SQ, Math.cos(a1) * cr, Math.sin(a1) * cr * SQ, u < 0.5 ? S[4] : S[5], 0.4 + 0.6 * u);
        }
        const rx = 2 + 7 * u;
        p.ellipse(0, -0.5, rx, rx * SQ + 0.5, (dx, dy, d) => (d > 0.65 ? R[u > 0.6 ? 5 : 4] : S[0]));
        p.px(0, -1, R[u > 0.6 ? 7 : 6]);
        return;
      }
      if (t < HIT + F) {
        // the hero frame: violet-white light bursts from the feet
        p.ellipse(0, -0.5, 16, 5, (dx, dy, d) => R[d < 0.6 ? 7 : 6]);
        p.circle(0.5, -4, 6, R[7]);
        p.beam(-26, -0.5, 26, -0.5, 2, R[6]);
        return;
      }
      ring(p, true);
      drawTendrils(p, true);
      if (t < HIT + 0.25) {
        const v = (t - HIT) / 0.25; // the dark pool at the feet, spent
        p.ellipse(0, -0.5, 8 * (1 - v) + 1, (8 * (1 - v) + 1) * SQ + 0.5, (dx, dy, d) => (d > 0.7 ? R[3] : S[0]));
      }
      parts.draw(p);
    },
  };
}

// Seen from above: the pull from all round, then tendrils lie out along the floor like a dark pinwheel inside a violet
// ring, while puffs and motes skid outward.
function createTop(o) {
  const rng = new Rng(o.seed), S = o.palette, R = o.rim, s = o.seed;
  const parts = new Particles({ rng, palette: R, smoke: S, top: true });
  const lights = new Lights();
  const ks = tendrils(rng);
  const specks = Array.from({ length: 14 }, (_, i) => ({ a: ((i + rng.range(0, 1)) / 14) * TAU, r: rng.range(26, 40) }));

  lights.add(0, 0, 30, R[7], 1, 0.12, { delay: HIT });
  lights.add(0, 0, 24, R[5], 0.5, 0.6, { delay: HIT + 0.1 });
  for (let i = 0; i < 18; i++) {
    const a = ((i + rng.range(0, 1)) / 18) * TAU, v = rng.range(45, 85);
    parts.spawn(SMOKE, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.6, 0.9), { size: rng.range(2.5, 4), delay: HIT + rng.range(0, 0.05), back: true });
  }
  for (let i = 0; i < 18; i++) {
    const a = rng.range(0, TAU), v = rng.range(60, 110);
    parts.spawn(SPARK, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.3, 0.5), { delay: HIT, ramp: S });
  }
  for (let i = 0; i < 8; i++) {
    const a = rng.range(0, TAU), d = rng.range(10, 26);
    parts.spawn(EMBER, Math.cos(a) * d, Math.sin(a) * d, rng.range(-12, 12), rng.range(-12, 12), rng.range(0.45, 0.7), { delay: HIT + rng.range(0.1, 0.3) });
  }

  let n = 0, t = 0;
  return {
    update(dt) {
      t = ++n * dt;
      parts.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      lights.draw(p);
      if (t < HIT) {
        const u = t / HIT;
        p.glow(0, 0, 6 + 10 * u, R[5], 0.2 + 0.5 * u * u);
      } else if (t >= HIT + F) {
        const v = Math.max(0, 1 - (t - HIT) / 0.9) ** 2, r = ringR(t);
        p.glow(0, 0, r + 8, R[5], d => 0.4 * v * Math.min(1, Math.max(0, 1 - Math.abs(d * (r + 8) - r) / 8)) ** 2); // light along the ring
      }
      const r = ringR(t);
      brokenRing(p, t, s, (a0, a1, v) => {
        for (const d of v < 0.4 ? [r, r - 1] : [r]) p.line(Math.cos(a0) * d, Math.sin(a0) * d, Math.cos(a1) * d, Math.sin(a1) * d, R[6 - Math.floor(v * 4)]);
      });
      parts.draw(p, 'back');
    },
    draw(p) {
      if (t < HIT) {
        const u = t / HIT, e = u * u;
        for (const q of specks) {
          const r = q.r * (1 - e), x = Math.cos(q.a) * r, y = Math.sin(q.a) * r, len = 2 + 4 * u;
          p.line(x, y, x + Math.cos(q.a) * len, y + Math.sin(q.a) * len, j => (j < 0.4 ? R[5] : S[5]));
        }
        const cr = 38 * (1 - e) + 4;
        for (let i = 0; i < 40; i++) {
          const a0 = (i / 40) * TAU, a1 = ((i + 1) / 40) * TAU;
          if (i % 4 !== 3) p.line(Math.cos(a0) * cr, Math.sin(a0) * cr, Math.cos(a1) * cr, Math.sin(a1) * cr, u < 0.5 ? S[4] : S[5], 0.4 + 0.6 * u);
        }
        p.circle(0, 0, 2 + 6 * u, (dx, dy, d) => (d > 0.65 ? R[u > 0.6 ? 5 : 4] : S[0]));
        p.px(0, 0, R[u > 0.6 ? 7 : 6]);
        return;
      }
      if (t < HIT + F) {
        p.circle(0, 0, 12, (dx, dy, d) => R[d < 0.6 ? 7 : 6]);
        p.ring(0, 0, 22, 2, R[6]);
        return;
      }
      for (const k of ks) {
        const q = phase(k, t, S, R);
        if (!q) continue;
        const r0 = ringR(t) * k.rr * 0.75, sweep = k.curl * (0.25 + 0.3 * q.u); // they curl round as they are flung out
        const pts = Array.from({ length: 7 }, (_, j) => {
          const u = j / 6, d = r0 + u * q.len * 1.1;
          const a = k.a + sweep * u * u + (Math.sin(TAU * (u * 0.9 - t * 2.2) + k.ph) * 2.2 * u) / Math.max(8, d);
          return [Math.cos(a) * d, Math.sin(a) * d];
        });
        const side = k.curl > 0 ? [-Math.sin(k.a), Math.cos(k.a)] : [Math.sin(k.a), -Math.cos(k.a)]; // lit on its trailing side, toward the burst
        stroke(p, pts, q.width, q.color, q.lit, side.map(v => -v));
      }
      if (t < HIT + 0.25) {
        const v = (t - HIT) / 0.25;
        p.circle(0, 0, 8 * (1 - v) + 1, (dx, dy, d) => (d > 0.7 ? R[3] : S[0]));
      }
      parts.draw(p);
    },
  };
}
