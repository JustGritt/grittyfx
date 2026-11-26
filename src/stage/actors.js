// The stage's cast, drawn in Aseprite (src/stage/cast/*.aseprite, made into cast.js by tools/cast.mjs): a knight, a
// mage, a priest, an archer and a kunoichi who act effects out, and a goblin (or a slime) who takes them. Local coordinates as in
// effects: (0, 0) on the floor under the feet, x toward the other actor, y down, 1 unit = 1 px.
import { paletteTable, fit } from '../core/index.js';
import { PALETTES, CAST } from './cast.js';

export { CAST };
export const KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~'; // as tools/cast.mjs writes them: keep the two the same

/**
 * A character's colors that a tint replaces, dark to bright: the slime's jelly from its outline to its shine, while its
 * eyes, mouth and blush stay.
 */
export const BODY = { slime: ['#091e16', '#173d2a', '#2a6e38', '#3a8f3c', '#4fae42', '#6cc94a', '#d6ffaa'] };

/**
 * `name`'s colors under `tint`: a ramp (a PAL name or colors) fit to its BODY's steps in their place, or
 * { ramp, swap: { '#from': '#to' } } to change other colors too (the slime's pink blush on a warm ramp).
 */
export function tinted(name, tint) {
  const { ramp, swap = {} } = typeof tint === 'string' || Array.isArray(tint) ? { ramp: tint } : tint;
  const body = BODY[name] ?? [], to = ramp && body.length ? fit(ramp, body.length) : [];
  return PALETTES[name].map(c => (ramp && body.includes(c) ? to[body.indexOf(c)] : swap[c] ?? c));
}

/**
 * The palette table for the actors `who` on stage: each one's colors under its name (tinted per `tint`, { name: tint }),
 * `glow` (the spell's ramp, 8 steps) that lights a caster's tip, and `ink`: the floor shadow's color, then a hit's white
 * flash.
 */
export function actorPalette(glow = 'holy', who = Object.keys(CAST), tint = {}) {
  return paletteTable({ ...Object.fromEntries(who.map(n => [n, tint[n] ? tinted(n, tint[n]) : PALETTES[n]])), glow: fit(glow, 8), ink: ['#0e0c14', '#ffffff'] });
}

/**
 * How each caster shows the stage's poses (see POSES in stage.js) it has no tag of the same name for: the tag drawn
 * instead, and whether its tip glows in the spell's colors. Every pose but idle falls back to idle.
 */
export const CASTERS = {
  knight: { glow: true, look: { ready: 'ready', swing: 'swing', follow: 'swing', gather: 'ready', point: 'swing', raise: 'raise', crouch: 'crouch', air: 'crouch' } },
  mage: { glow: true, look: { ready: 'gather', swing: 'cast', follow: 'cast', gather: 'gather', point: 'cast', raise: 'raise', crouch: 'gather' } },
  priest: { glow: true, look: { ready: 'gather', swing: 'cast', follow: 'cast', gather: 'gather', point: 'cast', raise: 'raise', crouch: 'gather' } },
  archer: { glow: false, look: { ready: 'draw', swing: 'release', follow: 'release', gather: 'draw', point: 'release', raise: 'draw', crouch: 'draw' } },
  kunoichi: { glow: false, look: { ready: 'ready', swing: 'slash', follow: 'follow', gather: 'gather', point: 'throw', raise: 'seal', crouch: 'crouch', air: 'crouch' } },
};

/**
 * `who`'s frame for a pose: frame `i` (wrapping) of its own tag of that name once drawn (a knight's `air`), else of the
 * tag CASTERS stands in with, else of idle.
 */
export const frameOf = (who, pose, i = 0) => {
  const tag = CAST[who][pose] ?? CAST[who][CASTERS[who]?.look[pose]] ?? CAST[who].idle;
  return tag[i % tag.length];
};

/** The box [x0, y0, x1, y1] (local, x1 and y1 past the last pixel) that holds every frame of `who`. */
export function bounds(who) {
  const fs = Object.values(CAST[who]).flat();
  return [Math.min(...fs.map(f => f.x)), Math.min(...fs.map(f => f.y)), Math.max(...fs.map(f => f.x + f.rows[0].length)), Math.max(...fs.map(f => f.y + f.rows.length))];
}

/** Draws a frame of the cast with its feet at (x, y) local to `frame`'s origin; c is its character's indices, actorPalette().index[who]. */
export function drawFrame(frame, f, c, x = 0, y = 0) {
  const { w, h, color } = frame, X0 = frame.ox + x + f.x, Y0 = frame.oy + y + f.y;
  f.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = KEYS.indexOf(row[i]), X = X0 + i, Y = Y0 + j;
      if (k < 0 || X < 0 || Y < 0 || X >= w || Y >= h) continue;
      color[(Y * w + X) * 2] = c[k];
      color[(Y * w + X) * 2 + 1] = 255;
    }
  });
}

/** Paints every pixel of a frame with color index `c`: the hit frame's white flash. */
export function flash(frame, c) {
  for (let i = 0; i < frame.color.length; i += 2) if (frame.color[i + 1]) frame.color[i] = c;
}
