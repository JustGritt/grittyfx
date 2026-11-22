// Shared by the tools: finding effects, rendering their frames, building bundles.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFx, createFrame, composite } from '../src/core/index.js';
import { encodePng } from './png.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FX = new URL('../src/fx/', import.meta.url);
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;

/** Every effect id ("category/name"), sorted. */
export function listIds() {
  if (!existsSync(FX)) return [];
  return readdirSync(FX, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => readdirSync(new URL(`${d.name}/`, FX)).filter(f => f.endsWith('.js')).map(f => `${d.name}/${f.slice(0, -3)}`))
    .sort();
}

/** Ids matching each pattern: an id, a category, or a glob where * matches anything. */
export function matchIds(patterns) {
  const all = listIds(), out = new Set();
  for (const pat of patterns) {
    const re = new RegExp(`^${pat.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    const hits = all.filter(id => re.test(id) || id.startsWith(`${pat}/`));
    if (!hits.length) throw new Error(`no effect matches "${pat}" (try node tools/list.mjs)`);
    hits.forEach(id => out.add(id));
  }
  return [...out];
}

export const loadEffect = id => import(new URL(`${id}.js`, FX));

/** Steps a live effect to time t and draws its back then front layer into a new frame. */
export function drawAt(fx, t) {
  const [w, h] = fx.meta.size, [ox, oy] = fx.meta.origin, frame = createFrame(w, h, ox, oy);
  fx.update(t - fx.t);
  // shortcut: back and front share one frame, so a bundle can't put a character between them; split when engines need it.
  return { frame, painters: [fx.draw(frame, 'back'), fx.draw(frame, 'front')] };
}

/** Every frame of an effect at `fps`: one period of a loop, or a one-shot up to (not at) its duration. */
export function renderFrames(mod, { fps = mod.meta.fps ?? 30, opts = {} } = {}) {
  const fx = createFx(mod, opts), n = Math.max(1, Math.round(mod.meta.duration * fps)), frames = [];
  for (let i = 0; i < n; i++) frames.push(drawAt(fx, i / fps).frame);
  return { fx, frames, fps };
}

/** Copies a w x h RGBA image into a bigger one at (x, y), each pixel scaled to zoom x zoom. */
export function blit(dst, dw, src, w, h, x, y, zoom = 1) {
  for (let sy = 0; sy < h * zoom; sy++) {
    for (let sx = 0; sx < w * zoom; sx++) {
      const s = (Math.floor(sy / zoom) * w + Math.floor(sx / zoom)) * 4;
      dst.set(src.subarray(s, s + 4), ((y + sy) * dw + x + sx) * 4);
    }
  }
}

/** The bundle: data sheet, palette, baked sheet (PNG buffers) and the Aseprite JSON with meta.grittyfx. */
export function makeBundle(id, mod, { fps, opts } = {}) {
  const { meta } = mod, r = renderFrames(mod, { fps, opts }), { fx, frames } = r;
  const name = id.split('/').pop(), [w, h] = meta.size, n = frames.length;
  const columns = Math.min(n, 8), W = columns * w, H = Math.ceil(n / columns) * h;
  const data = new Uint8Array(W * H * 4), baked = new Uint8Array(W * H * 4);
  frames.forEach((f, i) => {
    const x = (i % columns) * w, y = Math.floor(i / columns) * h, rgba = new Uint8Array(w * h * 4);
    for (let p = 0; p < w * h; p++) rgba.set([f.color[p * 2], f.color[p * 2 + 1], f.light[p * 2], f.light[p * 2 + 1]], p * 4);
    blit(data, W, rgba, w, h, x, y);
    blit(baked, W, composite(f, fx.palette), w, h, x, y);
  });
  const files = { data: `${name}_data.png`, palette: `${name}_pal.png`, sheet: `${name}.png`, json: `${name}.json` };
  const act = meta.act && {
    ...meta.act,
    hits: (meta.act.hits ?? []).map(hit => ({ frame: Math.min(n - 1, Math.round(hit.t * r.fps)), ...hit })),
  };
  const json = {
    frames: frames.map((_, i) => ({
      filename: String(i), // Phaser's createFromAseprite finds frames by index
      frame: { x: (i % columns) * w, y: Math.floor(i / columns) * h, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      duration: Math.round(1000 / r.fps),
    })),
    meta: {
      app: 'grittyfx',
      version: VERSION,
      image: files.sheet,
      format: 'RGBA8888',
      size: { w: W, h: H },
      scale: '1',
      frameTags: [{ name, from: 0, to: n - 1, direction: 'forward' }],
      grittyfx: {
        id, fps: r.fps, frames: n, frameSize: [w, h], columns, pivot: meta.origin,
        loop: !!meta.loop, end: meta.end ?? (meta.loop ? 'loop' : 'remove'),
        data: files.data, palette: files.palette, sheet: files.sheet, ramps: fx.ramps, light_gain: 1,
        view: 'side', directions: 1, mirror: meta.mirror ?? true,
        ...(act && { act }),
      },
    },
  };
  return {
    files,
    json,
    png: { data: encodePng(W, H, data), palette: encodePng(256, 1, fx.palette), sheet: encodePng(W, H, baked) },
  };
}
