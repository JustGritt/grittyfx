// Frames, compositing and live effects.
import { Painter } from './painter.js';
import { fit, hex, paletteTable } from './color.js';

/** Simulations step at a fixed 120 Hz, so they look the same at any frame rate. */
export const STEP = 1 / 120;
const FADE_OUT = 0.3;

/** A frame: per pixel, a color index and alpha in `color`, a light index and intensity in `light` (bytes). */
export function createFrame(w, h, ox = 0, oy = 0) {
  return { w, h, ox, oy, color: new Uint8Array(w * h * 2), light: new Uint8Array(w * h * 2) };
}

export function clearFrame(frame) {
  frame.color.fill(0);
  frame.light.fill(0);
  return frame;
}

/**
 * Resolves a frame to RGBA through a palette table: rgb = pal[ci] * ca + pal[li] * lk * gain, a = ca.
 * Over `bg` (a hex string, [r, g, b], or an RGBA image the frame's size) the result is opaque. Without one it is
 * straight alpha for a canvas or a PNG, and light where there is no color becomes color with alpha (exact over black).
 */
export function composite(frame, palette, out = new Uint8ClampedArray(frame.w * frame.h * 4), bg = null, gain = 1) {
  const { color, light } = frame;
  if (typeof bg === 'string') bg = hex(bg);
  for (let i = 0, n = frame.w * frame.h; i < n; i++) {
    const ci = color[i * 2] * 4, ca = color[i * 2 + 1] / 255, li = light[i * 2] * 4, lk = (light[i * 2 + 1] / 255) * gain;
    let r = palette[ci] * ca + palette[li] * lk;
    let g = palette[ci + 1] * ca + palette[li + 1] * lk;
    let b = palette[ci + 2] * ca + palette[li + 2] * lk;
    let a = 1;
    if (bg) {
      const k = bg.length > 4 ? i * 4 : 0; // one color, or this pixel of an image
      r += bg[k] * (1 - ca);
      g += bg[k + 1] * (1 - ca);
      b += bg[k + 2] * (1 - ca);
    } else {
      a = Math.max(ca, Math.min(1, Math.max(r, g, b) / 255));
      if (a > 0) (r /= a), (g /= a), (b /= a);
    }
    out[i * 4] = Math.min(255, Math.round(r));
    out[i * 4 + 1] = Math.min(255, Math.round(g));
    out[i * 4 + 2] = Math.min(255, Math.round(b));
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

/** The headings of a top view's rows, 45 degrees apart clockwise from east (y down, so S is +90 degrees). */
export const HEADINGS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

/**
 * An effect's canvas in a view: { size, origin, directions }. Side is meta.size and meta.origin, one direction. Top is
 * meta.top's size and origin (centered when left out) and directions (8 for a directional effect, else 1); without a
 * size, a square around the origin that holds the side canvas turned to any heading.
 */
export function layout(meta, view = 'side') {
  if (view !== 'top') return { size: meta.size, origin: meta.origin, directions: 1 };
  const { size, origin, directions = 1 } = meta.top ?? {};
  if (size) return { size, origin: origin ?? size.map(v => v >> 1), directions };
  const [w, h] = meta.size, [ox, oy] = meta.origin, corners = [[ox, oy], [w - ox, oy], [ox, h - oy], [w - ox, h - oy]];
  // one px of slack: turned, shapes are sampled at other points than in the side view
  const r = 1 + Math.ceil(Math.max(...corners.flatMap(([x, y]) => [x, y, (x + y) / Math.SQRT2])));
  return { size: [2 * r, 2 * r], origin: [r, r], directions };
}

/**
 * A live effect from an effect module. Options merge over `meta.options`; each ramp named in `meta.ramps`
 * ({ name: steps }) is resampled to its length and laid into the effect's palette table, and the effect sees it as
 * an array of indices. Pass `view: 'top'` for its top view (see layout). Set `flip`, `angle` (radians, clockwise) and
 * `lightK` on the result to place it.
 */
export function createFx(mod, opts = {}) {
  const { meta } = mod, o = { ...meta.options, ...opts }, ramps = {};
  for (const [name, steps] of Object.entries(meta.ramps ?? {})) ramps[name] = fit(o[name], steps);
  const pal = paletteTable(ramps);
  Object.assign(o, pal.index);
  const sim = mod.create?.(o), last = pal.ramps.reduce((n, r) => r.from + r.steps - 1, 0);
  let steps = 0, stopAt = null;
  const fade = () => (stopAt === null ? 1 : Math.max(0, 1 - (fx.t - stopAt) / FADE_OUT));
  const fx = {
    meta, o, palette: pal.table, ramps: pal.ramps,
    t: 0, flip: false, angle: 0, lightK: 1,
    update(dt) {
      fx.t += dt;
      if (sim) for (const target = Math.floor(fx.t / STEP + 1e-6); steps < target; steps++) sim.update(STEP);
    },
    /** Draws the front (or "back") layer at the current time; returns the painter, which counts bad writes. */
    draw(frame, layer = 'front') {
      const p = new Painter(frame).place(frame.ox, frame.oy, fx.flip, fx.angle);
      p.fade = fade();
      p.lightK = fx.lightK;
      p.maxIndex = last;
      const back = layer === 'back';
      if (sim) (back ? sim.drawBack : sim.draw)?.call(sim, p);
      else (back ? mod.drawBack : mod.draw)?.(p, meta.loop ? fx.t % meta.duration : fx.t, o);
      return p;
    },
    /** Fades out over 0.3 s. */
    stop() {
      stopAt ??= fx.t;
    },
    done() {
      return fade() <= 0 || (!meta.loop && fx.t >= meta.duration);
    },
  };
  return fx;
}
