// Plays a grittyfx bundle on a 2D canvas. The reference playback the Godot and Unity players match.
//
//   const fx = createPlayer(await loadBundle('fx/hit-spark.json'), { flip, gain, angle, onHit, onFinished }).play();
//   each frame: fx.update(dt); fx.draw(ctx, x, y);   // the pivot lands on (x, y)
//
// - loadBundle(url): fetches the JSON, the data sheet and the palette, decoded with decodePng (never a 2D canvas,
//   which would premultiply the data sheet's bytes away wherever the light channel is 0).
// - createPlayer(bundle, opts) -> player:
//   play()            starts at t = 0; hits on frame 0 fire now
//   update(dt)        advances; fires onHit(index, freeze, shake) for each hit frame shown or skipped over, in order;
//                     onFinished() fires once, at the end of a one-shot ("remove" stops drawing, "hold" keeps the
//                     last frame) or when a stop() fade is over
//   stop()            fades out over 0.3 s, then finishes and stops drawing
//   recolor(v)        a whole 256-entry RGBA palette (1024 bytes), or ramps by name ({ palette: 'ice', smoke: [...] })
//                     resampled like fit(); affects this player only
//   draw(ctx, x, y)   color layer (source-over) then light layer ('lighter'), nearest filtering, mirrored about the
//                     pivot when `flip` is set. Exact over an opaque background; on a transparent canvas light
//                     becomes color with alpha like composite(), a little more opaque where it falls on color
//   frame()           the current frame as { w, h, ox, oy, color, light } RGBA layers (DOM-free), or null
//   angle             the heading in radians, screen space (y down: Math.atan2(dy, dx), south is +PI/2). A top-down
//                     bundle with `directions` rows shows the nearest: round(angle / 45 degrees) mod 8, rows E, SE,
//                     S, SW, W, NW, N, NE. One-direction bundles ignore it
//   index, fade, t, active, finished, flip, gain, angle, palette, onHit, onFinished
import { fit } from '../src/core/color.js';

const FADE_OUT = 0.3;

async function inflate(chunks) {
  try {
    const stream = new Blob(chunks).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new Error('decodePng: bad or truncated image data'); // the stream's own error has no message
  }
}

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Decodes an 8-bit RGBA, non-interlaced PNG (bytes) to { w, h, rgba }, byte for byte. */
export async function decodePng(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), idat = [];
  if (bytes.length < 8 || v.getUint32(0) !== 0x89504e47) throw new Error('decodePng: not a PNG');
  for (let at = 8, len = 0, type = ''; type !== 'IEND'; at += 12 + len) {
    if (at + 12 > bytes.length || at + 12 + (len = v.getUint32(at)) > bytes.length) throw new Error('decodePng: truncated');
    type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === 'IDAT') idat.push(bytes.subarray(at + 8, at + 8 + len));
  }
  const w = v.getUint32(16), h = v.getUint32(20);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0) throw new Error('decodePng: only 8-bit RGBA, non-interlaced');
  const raw = await inflate(idat), stride = w * 4, rgba = new Uint8Array(h * stride);
  if (raw.length < h * (stride + 1)) throw new Error('decodePng: truncated image data');
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = y * (stride + 1) + 1, o = y * stride;
    if (ft > 4) throw new Error(`decodePng: row ${y} has unknown filter ${ft}`);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[o + x - 4] : 0, b = y ? rgba[o - stride + x] : 0, c = x >= 4 && y ? rgba[o - stride + x - 4] : 0;
      rgba[o + x] = raw[src + x] + (ft === 1 ? a : ft === 2 ? b : ft === 3 ? (a + b) >> 1 : ft === 4 ? paeth(a, b, c) : 0); // wraps mod 256
    }
  }
  return { w, h, rgba };
}

/** Fetches a bundle from its JSON's URL: { json, data: { w, h, rgba }, palette (1024 bytes), sound (URL or undefined) }. */
export async function loadBundle(url) {
  const get = async u => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`loadBundle: ${u}: HTTP ${r.status}`);
    return r;
  };
  const base = new URL(url, globalThis.location?.href), json = await (await get(base)).json(), g = json.meta.grittyfx;
  const png = async f => decodePng(new Uint8Array(await (await get(new URL(f, base))).arrayBuffer()));
  const [data, palette] = await Promise.all([png(g.data), png(g.palette)]);
  return { json, data, palette: palette.rgba, sound: g.sound && new URL(g.sound, base).href };
}

export function createPlayer(bundle, { flip = false, gain = 1, angle = 0, onHit = null, onFinished = null } = {}) {
  const { json, data } = bundle, g = json.meta.grittyfx, n = g.frames, hits = g.act?.hits ?? [], dirs = g.directions ?? 1;
  const loops = g.loop || g.end === 'loop', [w, h] = g.frameSize;
  let shown = -1, stopAt = null, cache = {};

  const frameAt = () => Math.floor(p.t * g.fps + 1e-6); // the epsilon absorbs float sums like 10 x 0.1 < 1
  const finish = remove => {
    if (remove) p.active = false;
    if (!p.finished) (p.finished = true), p.onFinished?.();
  };
  // Fires the hits of every frame reached since the last call (one cycle at most for a loop), then the end.
  const step = () => {
    const f = frameAt(), last = loops ? f : Math.min(f, n - 1);
    for (let k = Math.max(shown + 1, last - n + 1); k <= last; k++) hits.forEach((hit, i) => hit.frame === k % n && p.onHit?.(i, hit.freeze, hit.shake));
    shown = Math.max(shown, last);
    if (!loops && f >= n) finish(g.end !== 'hold');
    if (stopAt !== null && p.t - stopAt >= FADE_OUT - 1e-9) finish(true);
  };
  const build = i => {
    const { x: fx, y: fy } = json.frames[i].frame, pal = p.palette, k = (g.light_gain ?? 1) * p.gain, src = data.rgba;
    const color = new Uint8ClampedArray(w * h * 4), light = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = ((fy + y) * data.w + fx + x) * 4, d = (y * w + (p.flip ? w - 1 - x : x)) * 4;
        const ci = src[s] * 4, li = src[s + 2] * 4, lk = (src[s + 3] / 255) * k;
        color.set([pal[ci], pal[ci + 1], pal[ci + 2], src[s + 1]], d);
        const l = [0, 1, 2].map(c => Math.min(255, Math.round(pal[li + c] * lk))), a = Math.max(...l);
        // Coverage = brightest channel, straight rgb: the canvas premultiplies it back to l exactly, so 'lighter' adds
        // l over any background, and over a transparent one lit pixels keep composite()'s alpha instead of going opaque.
        if (a) light.set([...l.map(c => (c * 255) / a), a], d);
      }
    }
    // Mirroring about the pivot: local x maps to -x - 1, so the flipped image's left edge sits w - px left of it.
    return { w, h, ox: p.flip ? w - g.pivot[0] : g.pivot[0], oy: g.pivot[1], color, light };
  };

  const p = {
    bundle, flip, gain, angle, onHit, onFinished,
    palette: Uint8Array.from(bundle.palette),
    t: 0, active: false, finished: false,
    play() {
      Object.assign(p, { t: 0, active: true, finished: false });
      shown = -1;
      stopAt = null;
      if (bundle.sound && globalThis.Audio) new Audio(bundle.sound).play().catch(() => {});
      step();
      return p;
    },
    update(dt) {
      if (!p.active) return;
      p.t += dt;
      step();
    },
    stop() {
      if (p.active) stopAt ??= p.t;
    },
    get fade() {
      return stopAt === null ? 1 : Math.max(0, 1 - (p.t - stopAt) / FADE_OUT);
    },
    /** The frame shown now, or -1 when nothing is. */
    get index() {
      return !p.active ? -1 : loops ? frameAt() % n : Math.min(frameAt(), n - 1);
    },
    recolor(v) {
      if (ArrayBuffer.isView(v) || Array.isArray(v)) {
        if (v.length !== 1024) throw new Error(`recolor: a palette has 256 RGBA entries (1024 values), got ${v.length}`);
        p.palette = Uint8Array.from(v);
        return p;
      }
      const pal = Uint8Array.from(p.palette);
      for (const [name, colors] of Object.entries(v)) {
        const r = g.ramps.find(r => r.name === name);
        if (!r) throw new Error(`recolor: no ramp "${name}" (this effect has ${g.ramps.map(r => r.name).join(', ')})`);
        fit(colors, r.steps).forEach((c, j) => pal.set([c[0], c[1], c[2], c[3] ?? 255], (r.from + j) * 4));
      }
      p.palette = pal;
      return p;
    },
    frame() {
      const i = p.index;
      if (i < 0) return null;
      if (cache.palette !== p.palette || cache.gain !== p.gain || cache.flip !== p.flip) cache = { palette: p.palette, gain: p.gain, flip: p.flip, frames: [] };
      const k = (((Math.round((p.angle * dirs) / (2 * Math.PI)) % dirs) + dirs) % dirs) * n + i; // row by row in the sheet
      return (cache.frames[k] ??= build(k));
    },
    draw(ctx, x, y) {
      const f = p.frame();
      if (!f) return;
      f.canvases ??= [f.color, f.light].map(px => {
        const c = new OffscreenCanvas(f.w, f.h);
        c.getContext('2d').putImageData(new ImageData(px, f.w, f.h), 0, 0);
        return c;
      });
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = p.fade; // scales color alpha and light alike, so a fade needs no rebuild
      ctx.drawImage(f.canvases[0], x - f.ox, y - f.oy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(f.canvases[1], x - f.ox, y - f.oy);
      ctx.restore();
    },
  };
  return p;
}
