import { Rng, Particles, Lights, SPARK, DUST } from '../../core/index.js';

export const meta = {
  name: 'Uppercut',
  desc: 'A rising blow from the wielder at the anchor: the blade scoops up off the floor in front, flashes as it cuts up through the target, launches sparks skyward with rising speed lines, and its crescent arcs on overhead and fades',
  tags: ['uppercut', 'launcher', 'melee', 'sword', 'impact', 'arc'],
  size: [60, 68],
  origin: [14, 48],
  duration: 0.4,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [100, 100], directions: 8 },
  ramps: { palette: 8, dust: 5 },
  options: { palette: 'gold', dust: 'dust', seed: 1 },
  act: { windup: 0.15, hits: [{ t: 2 / 30, freeze: 0.08, shake: 2 }] },
  stage: { x: -22 }, // the wielder, 22 px before the target
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.7, pitch: 1.8 }, // the scoop, loudest at the cut
    { t: 0, kind: 'crack', gain: 0.12, pitch: 3 }, // the blade scraping the floor
    { t: 2 / 30, kind: 'crack', gain: 0.8, pitch: 1.9 },
    { t: 2 / 30, kind: 'thump', gain: 0.5, pitch: 1.2 }, // the target thrown up
  ],
};

const HIT = 2 / 30; // the blade cuts up through the target
const R = 22; // the blade tip's path; the target is at (R, 0)
const FLOOR = 11; // below the chest
const W = 10; // the crescent's widest point
// Low in front, under the floor line; at the target; overhead (radians, 0 is straight ahead). The side view cuts it
// off at the floor's front edge, so the blade sweeps up out of the floor.
const A0 = 1.1, AH = -0.1, A1 = -1.5;
const PRE = 0.1; // the swing is under way on the first frame: the blade is coming out of the floor
const LIFT = (2 * (AH - A1)) / ((1.5 * (A0 - AH)) / (HIT + PRE)); // the follow-through, slowing from the cut's speed to a stop
const LAG = 0.07; // the crescent's tail follows the head this far behind
const clamp01 = v => Math.max(0, Math.min(1, v));

// The blade's angle: accelerating up through the target, then slowing as it carries on overhead.
function head(t) {
  if (t < HIT) return A0 + (AH - A0) * clamp01((t + PRE) / (HIT + PRE)) ** 1.5;
  return AH + (A1 - AH) * (1 - (1 - clamp01((t - HIT) / LIFT)) ** 2);
}

// The flash where the blade cuts: a white star driven upward, then a shrinking star.
function flash(p, t, C) {
  const k = t - HIT;
  if (k < 0) return;
  if (k < 1 / 30) {
    p.circle(R + 0.5, 0.5, 3.5, C[7]);
    p.beam(R + 0.5, 6, R + 0.5, -16, 3, C[7]);
    p.beam(R - 8, 0.5, R + 9, 0.5, 2, C[7]);
    for (const [dx, dy, l] of [[1, -1, 7], [-1, -1, 7], [1, 1, 4], [-1, 1, 4]]) p.line(R, 0, R + dx * l, dy * l, C[7]);
  } else if (k < 0.18) {
    const u = (k - 1 / 30) / (0.18 - 1 / 30), l = 10 * (1 - u) ** 1.5;
    p.circle(R + 0.5, 0.5, 2.5 * (1 - u), C[u < 0.3 ? 7 : 6]);
    for (const [dx, dy] of [[0, -1.6], [0, 0.7], [0.9, 0], [-0.9, 0]]) p.line(R, 0, R + dx * l, dy * l, s => C[s < 0.5 ? 6 : 5]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, top = o.view === 'top';
  const parts = new Particles({ rng, palette: C, dust: o.dust, ground: top ? Infinity : FLOOR, top });
  const lights = new Lights();
  lights.add(R, 0, 9, C[7], 1, 0.08, { delay: HIT });
  lights.add(R, -4, 16, C[5], 0.8, 0.28, { delay: HIT });
  for (let i = 0; i < 16; i++) { // launched skyward, a few spraying off forward and back
    const side = i >= 12, a = -Math.PI / 2 + (side ? rng.pick([-1, 1]) * rng.range(0.7, 1.1) : rng.range(-0.45, 0.45));
    const v = (side ? rng.range(50, 80) : rng.range(80, 150)) * (top ? 0.6 : 1); // from above, no gravity slows them
    parts.spawn(SPARK, R, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.15, 0.3), { delay: HIT });
  }
  if (!top) {
    for (let i = 0; i < 5; i++) { // kicked up where the blade comes out of the floor
      parts.spawn(DUST, 19 + rng.range(-2, 2), FLOOR - 1, rng.range(15, 50), -rng.range(15, 35), rng.range(0.22, 0.3), { size: rng.range(1.5, 2.4), delay: i * 0.008 });
    }
  }
  const lanes = [-4, 3, 6].map((x, i) => ({ x: R + x, len: 6 + 3 * i, d: HIT + 0.02 + i * 0.015 })); // speed lines rising

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      const h = head(t), tail = head(t - LAG), back = head(t - 3 * LAG), cool = clamp01((t - HIT) / 0.26);
      // no deeper than the floor's front edge, at s along an arc from a0 to a1 and e across it (the side view; from
      // above there is no floor)
      const up = (a0, a1, s, e = 0, w = 0) => top || Math.sin(a0 + (a1 - a0) * s) * (R + (e * w) / 2) < FLOOR + 6.5;
      // the afterimage: the blade's path lingering as a thin line after the crescent has gone
      if (back - h > 0.03 && cool < 1) p.arc(0, 0, R - 0.5, back, h, 1, s => (up(back, h, s) ? C[4] : 0), 1 - cool);
      if (tail - h > 0.03 && cool < 1) {
        // the crescent, as the slash's: white at its edge and toward the head, fraying into streaks toward its tail
        const k = 2 * W * Math.min(1, (tail - h) / 1.2), w = s => k * Math.sin(Math.PI * s ** 1.5);
        const c = (s, e) => {
          if (e > 0 || !up(tail, h, s, e, w(s)) || (s < 0.45 && Math.floor(-e * w(s) * 0.5) % 2)) return 0;
          return C[Math.max(1, Math.min(7, Math.round(7 * (0.2 + 0.5 * s + 0.45 * (1 + e) - 0.5 * cool))))];
        };
        p.arc(0, 0, R, tail, h, w, c, s => Math.min(1, s / 0.3));
        const gy = Math.sin(h) * R * 0.85;
        p.glow(Math.cos(h) * R * 0.85, top ? gy : Math.min(gy, FLOOR - 6), 10, C[5], 0.5 * (1 - cool));
      }
      for (const l of lanes) {
        const u = (t - l.d) / 0.22;
        if (u < 0 || u >= 1) continue;
        const y = -6 - 30 * (1 - (1 - u) ** 2); // flying up after the target, slowing
        p.line(l.x, y + l.len, l.x, y, s => C[s > 0.6 ? 6 : 4], s => s * (1 - u));
      }
      flash(p, t, C);
      parts.draw(p);
    },
  };
}
