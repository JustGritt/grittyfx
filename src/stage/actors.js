// The stage's cast, drawn in Aseprite (src/stage/cast/*.aseprite, made into cast.js by tools/cast.mjs): a knight, a
// mage and an archer who act effects out, and a goblin who takes them. Local coordinates as in effects: (0, 0) on the
// floor under the feet, x toward the other actor, y down, 1 unit = 1 px.
import { paletteTable, fit } from '../core/index.js';
import { PALETTE, CAST } from './cast.js';

export { CAST };
const KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; // as tools/cast.mjs writes them

/**
 * The cast's palette table: its colors (`cast`), `glow` (the spell's ramp, 8 steps) that lights a caster's tip, and
 * `ink`: the floor shadow's color, then a hit's white flash.
 */
export function actorPalette(glow = 'holy') {
  return paletteTable({ cast: PALETTE, glow: fit(glow, 8), ink: ['#0e0c14', '#ffffff'] });
}

/**
 * How each caster shows the stage's poses (see POSES in stage.js): the tag drawn for each, and whether its tip glows
 * in the spell's colors. Every pose but idle falls back to idle.
 */
export const CASTERS = {
  knight: { glow: true, look: { ready: 'ready', swing: 'swing', follow: 'swing', gather: 'ready', point: 'swing', raise: 'raise', crouch: 'crouch', air: 'crouch' } },
  mage: { glow: true, look: { ready: 'gather', swing: 'cast', follow: 'cast', gather: 'gather', point: 'cast', raise: 'raise', crouch: 'gather' } },
  archer: { glow: false, look: { ready: 'draw', swing: 'release', follow: 'release', gather: 'draw', point: 'release', raise: 'draw', crouch: 'draw' } },
};

/** `who`'s frame for a pose: its tag's frame `i` (wrapping), idle when it has no drawing for the pose. */
export const frameOf = (who, pose, i = 0) => {
  const tag = CAST[who][CASTERS[who]?.look[pose] ?? pose] ?? CAST[who].idle;
  return tag[i % tag.length];
};

/** The box [x0, y0, x1, y1] (local, x1 and y1 past the last pixel) that holds every frame of `who`. */
export function bounds(who) {
  const fs = Object.values(CAST[who]).flat();
  return [Math.min(...fs.map(f => f.x)), Math.min(...fs.map(f => f.y)), Math.max(...fs.map(f => f.x + f.rows[0].length)), Math.max(...fs.map(f => f.y + f.rows.length))];
}

/** Draws a frame of the cast with its feet at (x, y) local to `frame`'s origin; C is actorPalette().index. */
export function drawFrame(frame, f, C, x = 0, y = 0) {
  const { w, h, color } = frame, X0 = frame.ox + x + f.x, Y0 = frame.oy + y + f.y;
  f.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = KEYS.indexOf(row[i]), X = X0 + i, Y = Y0 + j;
      if (k < 0 || X < 0 || Y < 0 || X >= w || Y >= h) continue;
      color[(Y * w + X) * 2] = C.cast[k];
      color[(Y * w + X) * 2 + 1] = 255;
    }
  });
}

/** Paints every pixel of a frame with color index `c`: the hit frame's white flash. */
export function flash(frame, c) {
  for (let i = 0; i < frame.color.length; i += 2) if (frame.color[i + 1]) frame.color[i] = c;
}
