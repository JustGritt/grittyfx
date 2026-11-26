// The stage's cast, drawn in Aseprite (src/stage/cast/*.aseprite, made into cast.js by tools/cast.mjs): a knight, a
// mage, a priest, an archer and a kunoichi who act effects out, and a goblin who takes them. Local coordinates as in
// effects: (0, 0) on the floor under the feet, x toward the other actor, y down, 1 unit = 1 px.
import { paletteTable, fit } from '../core/index.js';
import { PALETTES, CAST } from './cast.js';

export { CAST };
export const KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_{|}~'; // as tools/cast.mjs writes them: keep the two the same

/**
 * The palette table for the actors `who` on stage: each one's colors under its name, `glow` (the spell's ramp, 8 steps)
 * that lights a caster's tip, and `ink`: the floor shadow's color, then a hit's white flash.
 */
export function actorPalette(glow = 'holy', who = Object.keys(CAST)) {
  return paletteTable({ ...Object.fromEntries(who.map(n => [n, PALETTES[n]])), glow: fit(glow, 8), ink: ['#0e0c14', '#ffffff'] });
}

/**
 * How each caster shows the stage's poses (see POSES in stage.js): the tag drawn for each, and whether its tip glows
 * in the spell's colors. Every pose but idle falls back to idle.
 */
export const CASTERS = {
  knight: { glow: true, look: { ready: 'ready', swing: 'swing', follow: 'follow', gather: 'ready', point: 'swing', raise: 'raise', crouch: 'crouch', air: 'crouch' } },
  mage: { glow: true, look: { ready: 'gather', swing: 'cast', follow: 'cast', gather: 'gather', point: 'cast', raise: 'raise', crouch: 'gather' } },
  priest: { glow: true, look: { ready: 'gather', swing: 'cast', follow: 'cast', gather: 'gather', point: 'cast', raise: 'raise', crouch: 'gather' } },
  archer: { glow: false, look: { ready: 'draw', swing: 'release', follow: 'release', gather: 'draw', point: 'release', raise: 'draw', crouch: 'draw' } },
  kunoichi: { glow: false, look: { ready: 'ready', swing: 'slash', follow: 'follow', gather: 'gather', point: 'throw', raise: 'seal', crouch: 'crouch' } },
};

// The stage's newer poses, and the older one each falls back to for a caster with no drawing of its own.
export const LIKE = { aim: 'ready', lunge: 'swing', low: 'crouch', rise: 'raise', spin: 'swing', kneel: 'crouch', open: 'raise', lift: 'raise', slam: 'crouch', dash: 'swing', high: 'air', cling: 'air' };

/** `who`'s frames for a pose, its run: its tag's, else the pose it is like's, else idle's. */
export const runOf = (who, pose) => {
  const tag = p => CAST[who][CASTERS[who]?.look[p] ?? p];
  return tag(pose) ?? tag(LIKE[pose]) ?? CAST[who].idle;
};

/** `who`'s frame for a pose: its run's frame `i` (wrapping). */
export const frameOf = (who, pose, i = 0) => {
  const run = runOf(who, pose);
  return run[i % run.length];
};

/** How long a run plays, in seconds: each frame shows for its ms. */
export const seconds = run => run.reduce((n, f) => n + f.ms, 0) / 1000;

/** A run's frame u seconds in: its first before it starts, its last once it's over, or wrapping round with loop. */
export function frameAt(run, u, loop = false) {
  if (loop) u -= Math.floor(u / seconds(run)) * seconds(run);
  let end = 0;
  for (const f of run) if ((end += f.ms / 1000) > u + 1e-6) return f;
  return run.at(-1);
}

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
