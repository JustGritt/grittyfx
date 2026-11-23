import { Rng, Particles, SPARK, EMBER, rand } from '../../core/index.js';

export const meta = {
  name: 'Lightning strike',
  desc: 'A glint and a creeping leader, then a jagged branching bolt with a white hero frame, re-strikes, ground sparks and afterglow',
  tags: ['magic', 'lightning', 'electric', 'strike', 'spell'],
  size: [72, 104],
  origin: [36, 92],
  duration: 0.8,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  act: { hits: [{ t: 0.2, freeze: 0.07, shake: 3 }] },
  sound: [
    { t: 0.08, kind: 'zap', gain: 0.3, pitch: 1.6 }, // the leader creeping down
    { t: 0.2, kind: 'crack' }, // the bolt
    { t: 0.2, kind: 'zap', gain: 0.6 },
    { t: 0.2, kind: 'thump', gain: 0.8, pitch: 0.5 },
    { t: 0.22, kind: 'crack', gain: 0.5, pitch: 0.4 }, // thunder
    { t: 0.3, kind: 'crack', gain: 0.5, pitch: 1.3 }, // the re-strike
  ],
};

const TAU = Math.PI * 2;
const TOP = 92; // the bolt comes in at the top edge
const HIT = 0.2;
const F = 1 / 30;

// A jagged path from the top edge down to the anchor, and branches that fork off it and die in the air.
function bolt(rng) {
  const n = 13, x0 = rng.range(-8, 8), main = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, end = i === 0 || i === n;
    main.push([x0 * (1 - u) + (end ? 0 : rng.range(-4.5, 4.5)), -TOP * (1 - u) + (end ? 0 : rng.range(-2, 2))]);
  }
  const branches = [];
  for (let b = 0; b < 3; b++) {
    const side = b % 2 ? 1 : -1, pts = [main[rng.int(2, n - 4)]];
    for (let s = rng.int(3, 5); s > 0; s--) {
      const [x, y] = pts[pts.length - 1];
      pts.push([x + side * rng.range(2, 6), y + rng.range(3, 7)]);
    }
    branches.push(pts);
  }
  return { main, branches };
}

const shift = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

// Light along a path. Each segment is dimmer at its ends, so the overlaps at the joints add up to one light, not knots.
function glowPath(p, pts, r, c, k) {
  for (let i = 1; i < pts.length; i++) {
    p.glowLine(...pts[i - 1], ...pts[i], r, c, (t, d) => k * (1 - d) ** 2 * (0.5 + 0.5 * Math.sin(Math.PI * t)));
  }
}

// A flat ellipse on the ground, broken in places; front is the half nearer the viewer.
function ellipse(p, rx, ry, front, c, gap) {
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 !== front || gap(i)) continue;
    p.line(Math.cos(a0) * rx, Math.sin(a0) * ry, Math.cos(a1) * rx, Math.sin(a1) * ry, c);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed, B = bolt(rng);
  // the bolt's light keeps inside the canvas: it starts below the top edge
  const lit = [[B.main[0][0], -TOP + 10], ...B.main.slice(2)];
  const parts = new Particles({ rng, palette: C, ground: 0 });
  for (let i = 0; i < 18; i++) {
    const a = rng.range(Math.PI * 1.06, Math.PI * 1.94), v = rng.range(50, 110);
    parts.spawn(SPARK, Math.cos(a) * 2, -1, Math.cos(a) * v * 0.6, Math.sin(a) * v, rng.range(0.2, 0.38), { delay: HIT });
  }
  for (let i = 0; i < 10; i++) {
    parts.spawn(EMBER, rng.range(-7, 7), -1, rng.range(-18, 18), rng.range(-45, -20), rng.range(0.3, 0.42), { delay: HIT + rng.range(0.03, 0.15) });
  }

  let n = 0, t = 0;
  const frame = () => Math.floor((t - HIT) / F + 1e-9);
  // the shock on the ground: a broken ring that runs out fast and dims
  const ring = (p, front) => {
    const v = (t - HIT) / 0.22;
    if (v < 0 || v >= 1) return;
    const rx = 4 + 18 * (1 - (1 - v) ** 3), f = frame();
    ellipse(p, rx, rx * 0.28, front, C[(front ? 7 : 6) - Math.floor(v * 4)], i => rand(i, f, s) < 0.2 + v * 0.5);
  };

  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the hero frame lands exactly on HIT
      parts.update(dt);
    },
    drawBack(p) {
      const sk = t - HIT, f = frame();
      if (sk < 0) {
        const u = t / HIT, flick = rand(Math.floor(t / F), s) < 0.5 ? 0.6 : 1;
        p.glow(0, -1, 4 + 6 * u, C[5], (0.2 + 0.4 * u) * flick);
        const x0 = B.main[0][0]; // the charge flickers along the top edge
        if (t > 0.04) p.glowLine(x0 - 10, -TOP + 7, x0 + 10, -TOP + 7, 7, C[4], 0.3 * flick);
      } else if (f === 0) {
        glowPath(p, lit, 9, C[7], 0.6);
        p.glow(0, -4, 15, C[7], 1);
      } else {
        // the light outlives the bolt: an afterimage that fades where it stood
        const k = [0.6, 0.25, 0.6][f - 1] ?? 0.6 * Math.max(0, 1 - (sk - 4 * F) / 0.4) ** 2;
        if (k > 0) glowPath(p, lit, 9, C[5], k);
        const after = Math.max(0, 1 - sk / 0.56) ** 2; // the ground glows on after the bolt is gone
        p.glowLine(-12, -1, 12, -1, 8, C[5], 0.6 * after);
      }
      ring(p, false);
    },
    draw(p) {
      const sk = t - HIT, f = frame();
      if (sk < 0) {
        // anticipation: a glint on the ground grows and flickers while a dim leader steps down from the top
        const u = t / HIT, arm = Math.round(1 + 2.5 * u * u), hot = Math.floor(t / F) % 2;
        for (let d = 1; d <= arm; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) p.px(dx, dy - 1, C[d === arm ? 5 : hot ? 7 : 6]);
        p.px(0, -1, C[7]);
        const lu = (t - 0.08) / (HIT - 0.08);
        if (lu > 0) {
          const m = Math.ceil((Math.floor(lu * 5 + 1) / 5) * (B.main.length - 1));
          p.polyline(B.main.slice(0, m + 1), C[3]);
          p.px(...B.main[m], C[6]);
        }
        return;
      }
      if (f === 0) {
        for (const dx of [-1, 0, 1]) p.polyline(shift(B.main, dx), C[7]);
        for (const b of B.branches) p.polyline(b, C[7]);
        p.circle(0.5, -0.5, 5, C[7]);
      } else if (f <= 3 || sk < 4 * F + 0.2) {
        // bright, a dim flicker, a re-strike, then the bolt thins and the branches die back
        const v = f <= 3 ? 0 : (sk - 4 * F) / 0.2, dim = f === 2;
        if (!dim && v < 0.35) for (const dx of [-1, 1]) p.polyline(shift(B.main, dx), C[5]);
        p.polyline(B.main, dim ? C[5] : C[v < 0.2 ? 7 : 6 - Math.floor(v * 3)]);
        for (const b of B.branches) {
          if (v < 0.5) p.polyline(b.slice(0, Math.max(2, Math.round(b.length * (1 - v * 1.5)))), dim ? C[3] : C[5 - Math.floor(v * 3)]);
        }
        if (v < 0.4) p.circle(0.5, -0.5, 3 * (1 - v), C[dim ? 5 : 7]);
      }
      ring(p, true);
      if (f > 0 && sk < 0.5) {
        const v = sk / 0.5; // the struck spot cools and crumbles away
        p.line(-2, -1, 3, -1, u => C[(Math.abs(u - 0.5) < 0.2 ? 6 : 5) - Math.floor(v * 3)], Math.min(1, (1 - v) / 0.4));
      }
      if (sk < 0.3) {
        // crackles: short jagged arcs that flicker over the ground every frame
        for (let k = 0; k < 2; k++) {
          const r = j => rand(f, k * 7 + j, s);
          let x = (r(0) - 0.5) * 16, y = -1;
          const pts = [[x, y]], dir = r(1) < 0.5 ? -1 : 1;
          for (let j = 0; j < 3; j++) pts.push([(x += dir * (2 + r(j + 2) * 3)), (y -= r(j + 5) * 3)]);
          p.polyline(pts, C[sk < 0.15 ? 6 : 5]);
        }
      }
      parts.draw(p);
    },
  };
}
