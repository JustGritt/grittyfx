// node tools/render.mjs <id | category | glob>... [--all] [--sheet] [--html] [--aseprite] [--gif] [--mp4] [--zoom N] [--seed N]
//   [--opts '<json>'] [--fps N] [--bg '#hex']
// node tools/render.mjs --stage <move | id | category | glob>... [--all] [--gif] [--mp4] [--flip] [--zoom N] [--seed N]
//   [--opts '<json>'] [--bg '#hex']
// Writes records/<id>/contact.png (sampled frames; --all for every frame), the bundle with --sheet (its .wav too when
// the effect has sound), a page that plays it with --html (opens from disk), <name>.aseprite to edit by hand with
// --aseprite (the side view; export.mjs bundles it back), and a gif or mp4 through ffmpeg. An
// effect with a top view also gets contact_top.png (a row per direction) and its _top bundle. --stage acts the effect,
// or a move from src/stage/moves.js, out with the swordsman and the dummy, hit-stop and shake included:
// records/<id>/stage.png (and stage.gif, stage.mp4), records/moves/<move>/stage.png for a move.
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { composite, hex } from '../src/core/index.js';
import { createStage, realtime, FPS } from '../src/stage/stage.js';
import { MOVES } from '../src/stage/moves.js';
import { encodePng } from './png.mjs';
import { ROOT, matchIds, loadEffect, renderFrames, makeBundle, htmlPage, blit, views, asepriteFile } from './lib.mjs';

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean' }, sheet: { type: 'boolean' }, html: { type: 'boolean' }, aseprite: { type: 'boolean' }, gif: { type: 'boolean' }, mp4: { type: 'boolean' },
    stage: { type: 'boolean' }, flip: { type: 'boolean' },
    zoom: { type: 'string' }, seed: { type: 'string' }, opts: { type: 'string' }, fps: { type: 'string' },
    bg: { type: 'string', default: '#1b1d26' },
  },
});
if (!positionals.length) {
  console.error('usage: node tools/render.mjs <id | category | glob>... [--all] [--sheet] [--html] [--aseprite] [--gif] [--mp4] [--zoom N] [--seed N] [--opts json] [--fps N] [--bg #hex]');
  console.error(`       node tools/render.mjs --stage <move | id>... [--all] [--gif] [--mp4] [--flip] [--zoom N] [--seed N] [--opts json] [--bg #hex] (moves: ${Object.keys(MOVES).join(', ')})`);
  process.exit(1);
}
const zoom = Number(a.zoom ?? (a.stage ? 2 : 3)), fps = a.fps && Number(a.fps);
const opts = { ...(a.opts && JSON.parse(a.opts)), ...(a.seed && { seed: Number(a.seed) }) };

// Sampled RGBA images of w x h, at most `max`; with several directions, one row per direction (n images each).
function contact(images, w, h, all, n = images.length, max = 12) {
  const dirs = images.length / n, k = all ? n : Math.min(n, max);
  const picks = [...new Set(Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / Math.max(1, k - 1))))];
  const cols = dirs > 1 ? picks.length : Math.min(picks.length, Math.max(1, Math.floor(1600 / (w * zoom))));
  const cells = Array.from({ length: dirs }, (_, d) => picks.map(f => d * n + f)).flat();
  const rows = Math.ceil(cells.length / cols), gap = 2 * zoom;
  const W = cols * (w * zoom + gap) + gap, H = rows * (h * zoom + gap) + gap, out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) out.set([70, 70, 78, 255], i * 4);
  cells.forEach((f, i) => blit(out, W, images[f], w, h, gap + (i % cols) * (w * zoom + gap), gap + Math.floor(i / cols) * (h * zoom + gap), zoom));
  return encodePng(W, H, out);
}

function video(dir, images, w, h, rate, ext, name = 'anim') {
  if (spawnSync('ffmpeg', ['-version']).error) return console.error(`--${ext}: ffmpeg not found on PATH; install it to write ${ext} files`);
  const tmp = join(dir, 'frames');
  mkdirSync(tmp, { recursive: true });
  images.forEach((img, i) => writeFileSync(join(tmp, `${String(i).padStart(4, '0')}.png`), encodePng(w, h, img)));
  const scale = `scale=iw*${zoom}:ih*${zoom}:flags=neighbor`;
  const vf = ext === 'gif' ? `${scale},split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none` : `${scale},pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`;
  const out = join(dir, `${name}.${ext}`);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(rate), '-i', join(tmp, '%04d.png'), '-vf', vf, out], { stdio: 'inherit' });
  rmSync(tmp, { recursive: true });
  if (r.status === 0) console.log(out);
}

// The stage as a game shows it: frames in real time, held on hits, the whole view shaken.
async function stage(dir, steps) {
  const st = createStage(await Promise.all(steps.map(async s => ({ ...s, id: s.fx, mod: await loadEffect(s.fx) }))), opts);
  const [w, h] = st.size, bg = hex(a.bg), still = new Uint8ClampedArray(w * h * 4);
  const images = realtime(st.hits, st.duration).map(({ t, dx, dy }) => {
    st.draw(t, still, bg, a.flip);
    const img = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = x - dx, sy = y - dy, inside = sx >= 0 && sy >= 0 && sx < w && sy < h;
        img.set(inside ? still.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4) : [bg[0], bg[1], bg[2], 255], (y * w + x) * 4);
      }
    }
    return img;
  });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'stage.png'), contact(images, w, h, a.all, images.length, 24));
  console.log(join(dir, 'stage.png'));
  if (a.gif) video(dir, images, w, h, FPS, 'gif', 'stage');
  if (a.mp4) video(dir, images, w, h, FPS, 'mp4', 'stage');
}

if (a.stage) {
  for (const name of positionals) {
    if (MOVES[name]) await stage(join(ROOT, 'records', 'moves', name), MOVES[name].steps);
    else for (const id of matchIds([name])) await stage(join(ROOT, 'records', id), [{ fx: id }]);
  }
  process.exit();
}

for (const id of matchIds(positionals)) {
  const mod = await loadEffect(id), dir = join(ROOT, 'records', id);
  mkdirSync(dir, { recursive: true });
  for (const view of views(mod.meta)) {
    const { fx, frames, fps: rate, n, size: [w, h] } = renderFrames(mod, { fps, opts, view }), top = view === 'top' ? '_top' : '';
    const images = frames.map(f => composite(f, fx.palette, new Uint8Array(w * h * 4), a.bg));
    writeFileSync(join(dir, `contact${top}.png`), contact(images, w, h, a.all, n));
    console.log(join(dir, `contact${top}.png`));
    const b = (a.sheet || (a.html && !top)) && makeBundle(id, mod, { fps, opts, view });
    // shortcut: the page plays the side view only; give it a heading control if someone needs top views there.
    if (a.html && !top) {
      const page = join(dir, `${id.split('/').pop()}.html`);
      writeFileSync(page, htmlPage(id, mod.meta, b));
      console.log(page);
    }
    if (a.aseprite && !top) {
      const file = join(dir, `${id.split('/').pop()}.aseprite`);
      writeFileSync(file, asepriteFile(id, mod, { fps, opts }));
      console.log(file);
    }
    if (a.sheet) {
      for (const key of ['data', 'palette', 'sheet']) writeFileSync(join(dir, b.files[key]), b.png[key]);
      if (b.wav) writeFileSync(join(dir, b.files.sound), b.wav);
      writeFileSync(join(dir, b.files.json), `${JSON.stringify(b.json, null, 2)}\n`);
      console.log(Object.values(b.files).map(f => join(dir, f)).join('\n'));
    }
    // shortcut: videos show the side view only; tile the top rows into them if someone needs a top-down video.
    if (a.gif && !top) video(dir, images, w, h, rate, 'gif');
    if (a.mp4 && !top) video(dir, images, w, h, rate, 'mp4');
  }
}
