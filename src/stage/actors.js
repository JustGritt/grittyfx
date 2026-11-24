// The stage's actors: a hooded swordsman who acts effects out and a training dummy that takes the hits, drawn with the
// painter on a palette of their own. Local coordinates as in effects: (0, 0) on the floor between the feet, x toward
// the other actor, y down, 1 unit = 1 px.
import { paletteTable, fit } from '../core/index.js';

/** The actors' palette table; `glow` (the spell's ramp, 8 steps) lights the blade when the swordsman casts. */
export function actorPalette(glow = 'holy') {
  return paletteTable({ stone: 'stone', dust: 'dust', blood: 'blood', shadow: 'shadow', gold: 'gold', holy: 'holy', glow: fit(glow, 8) });
}

/**
 * Poses: x steps forward, lean tips the shoulders forward, crouch drops the hips, lift raises the feet, stride spreads
 * them (px); arm, blade and back are the sword arm's, the sword's and the free arm's angles (radians clockwise from
 * forward, so -pi/2 is straight up); glow lights the blade's tip.
 */
export const POSES = {
  idle: { x: 0, lean: 0, crouch: 0, lift: 0, stride: 0, arm: 1.2, blade: 0.6, back: 1.75, glow: 0 },
  ready: { x: -1, lean: -1, crouch: 1, lift: 0, stride: 1, arm: -2.1, blade: -2.75, back: 0.5, glow: 0 },
  swing: { x: 3, lean: 2, crouch: 2, lift: 0, stride: 3, arm: 0.15, blade: 0.3, back: 2.5, glow: 0 },
  follow: { x: 3, lean: 1, crouch: 1, lift: 0, stride: 3, arm: 0.9, blade: 0.85, back: 2.2, glow: 0 },
  gather: { x: -1, lean: -1, crouch: 1, lift: 0, stride: 1, arm: 2.2, blade: 2.55, back: 0.9, glow: 0.6 },
  point: { x: 1, lean: 1, crouch: 1, lift: 0, stride: 2, arm: 0, blade: 0, back: 0.2, glow: 1 },
  raise: { x: 0, lean: 0, crouch: 0, lift: 0, stride: 1, arm: -1.5, blade: -1.57, back: 1.9, glow: 1 },
  crouch: { x: 0, lean: 1, crouch: 2, lift: 0, stride: 1, arm: 1.3, blade: 0.8, back: 1.2, glow: 0 },
  air: { x: 0, lean: 0, crouch: 0, lift: 9, stride: 0, arm: -0.7, blade: -0.4, back: 2.3, glow: 0 },
};

// The hooded head, from the neck (the row under the map) up: d hood shadow, h hood, H hood lit, s skin, S skin shade,
// e eye. Facing right.
const HEAD = [
  '...hhhh..',
  '.dhHHHhh.',
  'ddhHhhhhh',
  '.dhhSsss.',
  '.dhhSsess',
  '.dhhssss.',
  '..dhhSs..',
];

const at = (x, y, a, l) => [x + Math.cos(a) * l, y + Math.sin(a) * l];

/** The swordsman in pose `q` (see POSES); C holds the actor palette's ramps as indices. */
export function drawHero(p, q, C) {
  const { stone: S, dust: D, blood: B, shadow: T, gold: G } = C, r = Math.round;
  const bx = r(q.x), by = -r(q.lift), lean = r(q.lean), st = r(q.stride);
  const hip = by - 8 + r(q.crouch), sh = hip - 6; // the hips' and shoulders' rows
  const sx = y => bx + Math.round((lean * (hip - y)) / 6); // the torso leans from the hips

  // the free arm, behind the body
  const bs = [sx(sh) - 1, sh + 1], bh = at(...bs, q.back, 5);
  p.line(...bs, ...bh, T[2]);
  p.px(...bh, D[4]);

  // legs: hips to boots, the knee pushed forward by the crouch
  for (const [side, c, boot] of [[-1, T[2], D[1]], [1, T[3], D[2]]]) {
    const hx = bx + side, fx = bx + side * (2 + st) + (side < 0 ? 0 : 0), knee = [(hx + fx) / 2 + r(q.crouch) * 0.7, (hip + by) / 2];
    p.polyline([[hx, hip], knee, [fx, by - 2]], c);
    p.line(hx + 1, hip, knee[0] + 1, knee[1], c);
    p.line(fx - 1, by - 1, fx + 2, by - 1, boot);
    p.line(fx, by - 2, fx + 1, by - 2, boot);
  }

  // the tunic: rows from the hips up, a flared hem and a belt
  for (let y = hip + 1; y >= sh; y--) {
    const x0 = sx(y) - 3, hem = y >= hip;
    for (let x = x0 - hem; x < x0 + 6 + hem; x++) p.px(x, y, x === x0 + 5 + hem ? T[5] : x <= x0 - hem ? T[3] : T[4]);
  }
  p.line(sx(hip - 2) - 3, hip - 2, sx(hip - 2) + 2, hip - 2, D[1]);
  p.px(sx(hip - 2) + 2, hip - 2, G[5]);

  // the scarf: around the neck, its tail streaming back
  const nx = sx(sh);
  p.line(nx - 3, sh, nx + 2, sh, B[4]);
  p.polyline([[nx - 3, sh], [nx - 5, sh + 1], [nx - 7, sh + 1 - (lean < 0 ? 0 : 1)]], B[3]);
  p.px(nx - 4, sh + 1, B[2]);

  HEAD.forEach((row, j) => [...row].forEach((ch, i) => {
    const c = { d: B[2], h: B[3], H: B[5], s: D[6], S: D[5], e: S[0] }[ch];
    if (c) p.px(nx - 4 + i, sh - HEAD.length + j, c);
  }));

  // the sword arm and the sword, in front
  const fs = [nx + 1, sh + 1], hand = at(...fs, q.arm, 5), u = [Math.cos(q.blade), Math.sin(q.blade)];
  p.line(...fs, ...hand, T[5]);
  const tip = at(...hand, q.blade, 9);
  p.line(...at(...hand, q.blade, 2), ...tip, s => (s > 0.85 ? S[7] : S[6]));
  p.line(hand[0] - u[1] * 1.5, hand[1] + u[0] * 1.5, hand[0] + u[1] * 1.5, hand[1] - u[0] * 1.5, G[4]);
  p.px(...at(...hand, q.blade, -1.5), G[5]);
  p.px(...hand, D[5]);
  if (q.glow > 0) {
    p.glow(...tip, 8, C.glow[5], 0.7 * q.glow);
    p.px(...tip, C.glow[7]);
  }
}

/** The training dummy, upright; the stage turns the painter to tilt it. `flash` draws the hit frame. */
export function drawDummy(p, C) {
  const { stone: S, dust: D, blood: B, gold: G } = C;
  p.ellipse(0, 0, 6, 3, (dx, dy) => (dy > 0 ? 0 : dy < -2 ? S[4] : S[3])); // the weighted base
  p.beam(0, -2, 0, -8, 2, D[2]); // the post
  p.line(-8, -16, 7, -16, D[2]); // the crossbar arms, straw at their ends
  p.line(-8, -15, 7, -15, D[1]);
  for (const [x, dy] of [[-9, -1], [-10, 0], [-9, 1], [8, -1], [9, 0], [8, 1]]) p.px(x, -16 + dy, G[dy ? 5 : 6]);
  // the sack body, lit up-left, roped top and bottom, a target on its front
  p.ellipse(0, -14, 5, 6.5, (dx, dy, d) => D[d > 0.8 ? 4 : dx + dy < -3 ? 7 : dx + dy > 3 ? 5 : 6]);
  p.line(-4, -9, 4, -9, D[3]);
  p.line(-4, -19, 4, -19, D[3]);
  p.circle(-2, -14, 2.5, (dx, dy, d) => (d > 0.55 ? B[4] : B[6]));
  p.px(-3, -15, D[7]);
  // the head: a stuffed ball with stitched eyes, a straw tuft on top
  p.circle(0, -24, 4, (dx, dy, d) => D[d > 0.8 ? 4 : dx + dy < -2 ? 7 : 6]);
  for (const [x, y] of [[-4, -26], [-2, -26], [-3, -25], [-4, -24], [-2, -24]]) p.px(x, y, D[2]); // a stitched X eye
  for (const [x, y, c] of [[0, -29, G[5]], [1, -30, G[6]], [-1, -30, G[4]]]) p.px(x, y, c);
}

/** Rings every solid pixel of a frame with a 1 px outline in color index `c`. */
export function outline(frame, c) {
  const { w, h, color } = frame, solid = Uint8Array.from({ length: w * h }, (_, i) => color[i * 2 + 1] > 127);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        color[i * 2] = c;
        color[i * 2 + 1] = 255;
      }
    }
  }
}

/** Paints every pixel of a frame with color index `c`: the hit frame's white flash. */
export function flash(frame, c) {
  for (let i = 0; i < frame.color.length; i += 2) if (frame.color[i + 1]) frame.color[i] = c;
}
