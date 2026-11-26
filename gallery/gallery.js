// The gallery, three pages: the effects playing live from their modules, filtered by category (?cat=), or one large
// with ?fx=<id> (the preview page, with its sound); the moves (?page=moves, one with ?move=<id>); the characters to
// download (?page=characters). With either character on, the cast acts the effects out on a monster.
import { PAL, hex, fit, createFx, createFrame, clearFrame, composite, layout, HEADINGS, synth, SAMPLE_RATE } from '../src/core/index.js';
import { createStage, role } from '../src/stage/stage.js';
import { MOVES } from '../src/stage/moves.js';
import { CAST, CASTERS, KEYS, bounds } from '../src/stage/actors.js';
import { PALETTES } from '../src/stage/cast.js';

const MONSTERS = Object.keys(CAST).filter(n => !CASTERS[n]); // who takes the hits: everyone who doesn't cast
const BG = { ground: '#1b1d26', dark: '#1b1d26', mid: '#575b6b', light: '#d8d5cd' }; // the stage colors in index.html
const STONE = ['#454a5e', '#2b2e3c', '#22242f', '#15161d'].map(hex); // the floor's lit edge, top course, deeper courses, mortar
const GAP = 0.8; // a one-shot rests this long, empty, before it plays again
const SHAKE = 0.2; // seconds a hit's shake takes to die down
const EDGE = 4; // px of backdrop past the stage's sides and bottom, the most a hit shakes it
const DEPTH = 64; // screen px of floor below the actors' feet, the same in every card: room for what an effect draws below
const CROP = 6; // px a card may cut off each side of a stage too wide for it, its empty margin: so one wide stage doesn't halve every card's zoom
const JIGGLE = [[1, 0], [-1, 1], [1, -1], [-1, 0]];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const form = document.getElementById('controls'), f = form.elements, main = document.getElementById('main');
const params = new URLSearchParams(location.search), only = params.get('fx'), move = params.get('move');
const asked = params.get('page'), page = move ? 'moves' : !only && ['moves', 'characters'].includes(asked) ? asked : ''; // '' is the effects
const players = [];
const audio = { ctx: null, on: false }; // sound plays on the preview page only, once its button is pressed
let custom = null; // the last valid custom ramp
let cat = params.get('cat') ?? ''; // the grid's category filter, '' for all
let refresh = () => {}; // the preview page's parts that follow the settings

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

const swatches = colors => colors.map(c => {
  const s = el('span');
  s.style.background = `rgb(${c.slice(0, 3)})`;
  return s;
});

// Settings live in the form and the URL, so a preview link keeps them. The palettes are radios, each with its colors.
const pop = document.getElementById('palettes'), pick = document.querySelector('.pick');
const palName = p => (p === 'custom' ? 'Custom…' : p ? p[0].toUpperCase() + p.slice(1) : "Effect's own");
pop.append(...['', ...Object.keys(PAL), 'custom'].map(value =>
  el('label', { className: 'tile' }, el('input', { type: 'radio', name: 'palette', value, checked: !value }),
    el('span', { className: 'ramp' }, ...swatches((PAL[value] ?? []).map(hex))), palName(value))));
HEADINGS.forEach((name, d) => f.view.add(new Option(`Top ${name}`, d))); // effects without a top view stay side
for (const n of MONSTERS) f.foe.add(new Option(n[0].toUpperCase() + n.slice(1), n));
for (const [k, v] of params) {
  if (k === 'flip' || k === 'hitstop' || k === 'caster' || k === 'target') f[k].checked = v === '1';
  else if (['palette', 'custom', 'seed', 'bg', 'view', 'foe'].includes(k)) f[k].value = v;
}
f.custom.value ||= '#0b1a2e #14506a #1ca0a0 #6ff0c0 #f2fff6';
if (!BG[f.bg.value]) f.bg.value = 'ground';
f.foe.value ||= 'goblin'; // an unknown foe in the URL
document.querySelector(`a[data-page="${page}"]`).setAttribute('aria-current', only || move ? 'true' : 'page');
if (page) document.title = `${page[0].toUpperCase()}${page.slice(1)} · grittyfx`;

function query(extra = {}) {
  const q = new URLSearchParams(extra), pal = f.palette.value;
  if (cat) q.set('cat', cat);
  if (pal) q.set('palette', pal);
  if (pal === 'custom') q.set('custom', f.custom.value);
  if (f.seed.value) q.set('seed', f.seed.value);
  if (f.view.value) q.set('view', f.view.value);
  if (f.flip.checked) q.set('flip', 1);
  if (!f.caster.checked) q.set('caster', 0);
  if (!f.target.checked) q.set('target', 0);
  if (f.foe.value !== 'goblin') q.set('foe', f.foe.value);
  if (f.bg.value !== 'ground') q.set('bg', f.bg.value);
  if (!f.hitstop.checked) q.set('hitstop', 0);
  return String(q) ? `?${String(q).replaceAll('%2F', '/')}` : './';
}

/** The link to a page's list: its grid of effects, moves or characters. */
const home = (p = page) => query(p ? { page: p } : {});

function readCustom() {
  try {
    const colors = f.custom.value.trim().split(/[\s,]+/);
    colors.forEach(c => hex(c)); // throws on a bad color
    custom = colors;
    f.custom.removeAttribute('aria-invalid');
  } catch {
    f.custom.setAttribute('aria-invalid', 'true');
  }
}

function showSettings() {
  const pal = f.palette.value, colors = pal === 'custom' ? custom ?? [] : PAL[pal] ?? [];
  document.getElementById('custom-field').hidden = pal !== 'custom';
  document.getElementById('ramp').replaceChildren(...swatches(colors.map(hex)));
  document.getElementById('palette-name').textContent = palName(pal).replace('…', '');
  document.body.dataset.bg = f.bg.value;
  refresh();
  for (const a of document.querySelectorAll('a[data-fx]')) a.href = query({ fx: a.dataset.fx });
  for (const a of document.querySelectorAll('a[data-move]')) a.href = query({ move: a.dataset.move });
  for (const a of document.querySelectorAll('a[data-page]')) a.href = home(a.dataset.page);
  for (const a of document.querySelectorAll('a.back')) a.href = home();
}

/** The stage's backdrop, w x h RGBA: its color, and on 'ground' a stone floor from row `floor` down. */
function backdrop(kind, w, h, floor) {
  const out = new Uint8ClampedArray(w * h * 4), sky = hex(BG[kind]);
  for (let y = 0; y < h; y++) {
    const g = y - floor, course = Math.floor((g - 1) / 6); // bricks 16 x 5 px, every other course offset by half
    for (let x = 0; x < w; x++) {
      const mortar = g % 6 === 0 || (x + (course % 2) * 8) % 16 === 0;
      out.set(kind !== 'ground' || g < 0 ? sky : g === 0 ? STONE[0] : mortar ? STONE[3] : STONE[course ? 2 : 1], (y * w + x) * 4);
    }
  }
  return out;
}

/** Whether effects are acted out: either character is shown. */
const acting = () => f.caster.checked || f.target.checked;

/** The options every effect is created with: the chosen palette and seed over its own. */
function options() {
  const o = {}, pal = f.palette.value === 'custom' ? custom : f.palette.value;
  if (pal) o.palette = pal;
  if (f.seed.value !== '') o.seed = Math.trunc(Number(f.seed.value));
  return o;
}

/** The effect's ramps as it plays now, for the preview's details: name, colors, where they come from. */
function rampRows(meta) {
  const o = { ...meta.options, ...options() };
  return Object.entries(meta.ramps ?? {}).flatMap(([k, n]) => [
    el('span', { textContent: k }),
    el('span', { className: 'ramp' }, ...swatches(fit(o[k], n))),
    el('span', { className: 'note', textContent: typeof o[k] === 'string' ? o[k] : 'custom' }),
  ]);
}

/** Copyable lines that use the effect with the current palette and seed: live in JS, exported, or baked to a sheet. */
function useRows(id) {
  const o = options(), name = id.split('/')[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const js = v => (Array.isArray(v) ? `[${v.map(js).join(', ')}]` : typeof v === 'string' ? `'${v}'` : String(v));
  const args = Object.keys(o).length ? `, { ${Object.entries(o).map(([k, v]) => `${k}: ${js(v)}`).join(', ')} }` : '';
  const bake = (o.palette ? ` --opts '${JSON.stringify({ palette: o.palette })}'` : '') + (o.seed !== undefined ? ` --seed ${o.seed}` : '');
  return [
    ['js', `import { createFx } from 'grittyfx';\nimport * as ${name} from 'grittyfx/fx/${id}';\nconst fx = createFx(${name}${args});`],
    ['godot', `node tools/export.mjs ${id} --godot <project>`],
    ['unity', `node tools/export.mjs ${id} --unity <project>`],
    ['sheet', `node tools/render.mjs ${id} --sheet${bake}`],
  ].flatMap(([k, code]) => [
    el('dt', { textContent: k }),
    el('dd', {}, el('pre', {}, el('code', { textContent: code })), el('button', { type: 'button', className: 'copy', textContent: 'copy' })),
  ]);
}

/**
 * Starts a cue's sound `late` seconds in: { at, end, stop, meta }, all times on the player's clock. A loop that stops
 * (on the stage) fades out from `end` to `stop`, as its pixels do. Hit-stop freezes the pixels but not the sound, as
 * in a game.
 */
function play(cue, late) {
  const s = synth(cue.meta, options().seed);
  if (!s) return null;
  const ctx = audio.ctx, buf = ctx.createBuffer(1, s.length, SAMPLE_RATE), src = ctx.createBufferSource(), gain = ctx.createGain();
  buf.copyToChannel(Float32Array.from(s), 0);
  Object.assign(src, { buffer: buf, loop: !!cue.meta.loop });
  src.connect(gain).connect(ctx.destination);
  const t0 = ctx.currentTime - late; // when the cue's time 0 was, on the audio clock
  src.start(0, cue.meta.loop ? late % buf.duration : late); // a loop resumed many turns in, in step
  if (cue.meta.loop && cue.stop < Infinity) {
    gain.gain.setValueAtTime(1, t0 + cue.end - cue.at);
    gain.gain.linearRampToValueAtTime(0, t0 + cue.stop - cue.at);
    src.stop(t0 + cue.stop - cue.at);
  }
  return src;
}

/**
 * Plays one effect on a canvas at its own frame rate, like its baked sheet, or acted out on the stage when a character
 * is on (a move, given as `steps`, always is). With hit-stop on, each hit freezes it for `freeze` seconds and shakes
 * the view by `shake` pixels: the effect's hits in meta.act, or the stage's. The preview's bar pauses it and steps
 * through its frames.
 */
function player(mod, canvas, big, id, steps) {
  const meta = mod?.meta, ctx = canvas.getContext('2d'), bar = big && canvas.closest('.preview').querySelector('.scrub');
  const [toggle, slider, readout] = bar ? ['.play', '.time', '.frame'].map(s => bar.querySelector(s)) : [];
  // w x h is the effect or the stage, drawn at (X, Y) on a canvas that fills the card; `under` is its piece of backdrop
  let fx, st, fps, hits, duration, loop, clock, base, next, freeze, shake, shown, w, h, ox, img, frame, floor, X = 0, Y = 0, under, cues = [], sounds = [];
  let frames, paused = false;
  const pl = {
    canvas, big, zoom: 1, error: null,
    get w() { return w; }, get h() { return h; }, get floor() { return floor; },
    // From the top, or from `at` seconds in (paused, from the frame shown).
    restart(at = paused ? clock - base : 0) {
      // A chosen top view wins over the cast, which acts side views only: the effect plays alone, at the chosen heading,
      // live, so any angle works; the canvas follows the view's size.
      const top = !steps && f.view.value !== '' && meta.views?.includes('top');
      const acted = steps ?? (!top && acting() && [{ mod, id }]);
      st = acted && createStage(acted, options(), { caster: f.caster.checked, target: f.target.checked }, { foe: f.foe.value });
      const view = top ? 'top' : 'side', v = st ? null : layout(meta, view);
      const [sw, sh] = st ? st.size : v.size;
      // the floor: under the actors' feet, else as far under the anchor as the effect is acted; a top view has none
      const fl = st ? st.floor : view === 'side' ? v.origin[1] + role(meta, id).ground : Infinity;
      if (w !== sw || h !== sh || floor !== fl) {
        const resized = !!img;
        [w, h, floor] = [sw, sh, fl];
        img = new ImageData(w, h);
        if (resized) pl.fit(), relayout(); // fit now, before the next tick draws; then every card to the new sizes
      }
      if (st) ({ fps, hits, duration, loop } = st);
      else {
        [fps, hits, duration, loop] = [meta.fps ?? 30, meta.act?.hits ?? [], meta.duration, meta.loop];
        frame = createFrame(w, h, (ox = v.origin[0]), v.origin[1]);
        fx = createFx(mod, { ...options(), view });
        fx.angle = v.directions > 1 ? (f.view.value * Math.PI) / 4 : 0; // a radial top view has one heading
      }
      frames = Math.max(1, Math.ceil(duration * fps - 1e-6));
      clock = Math.min(at, (frames - 1) / fps);
      base = freeze = 0;
      next = hits.filter(hit => hit.t < clock - 1e-6).length;
      shake = null;
      shown = -1;
      // a stage only goes forward: through every frame before, so the loops in it stop and fade on time
      if (st) for (let k = 0; k < Math.floor(clock * fps + 1e-6); k++) st.draw(k / fps, img.data, under, f.flip.checked);
      if (slider) (slider.max = frames - 1), slider.style.setProperty('--n', Math.max(1, frames - 1)); // --n: the timeline's ticks
      pl.listen();
    },
    // Each effect's sound from where it starts: the effect's from 0, a stage's from each act's start; none paused.
    listen() {
      pl.hush();
      if (big && audio.on && !paused) {
        cues = st ? st.plan.acts.map(a => ({ at: a.start, end: a.end, stop: a.stop, meta: a.mod.meta })) : [{ at: 0, end: Infinity, stop: Infinity, meta }];
        cues.sort((a, b) => a.at - b.at);
      }
    },
    /** Holds the frame shown (or the one `at` seconds in; after a one-shot, in its rest, its last), or plays on from it. */
    pause(on, at) {
      paused = on;
      toggle?.setAttribute('aria-pressed', on);
      if (on) pl.restart(at);
      else pl.listen();
    },
    hush() {
      sounds.forEach(s => s.stop());
      sounds = [];
      cues = [];
    },
    redraw() {
      shown = -1;
    },
    // Zooms the effect to fit, and fills the stage with the canvas and its backdrop (hidden, it waits to be shown). A
    // card takes the zoom and floor every card shares (relayout), or less if it only fits at less; the preview, its own.
    fit() {
      const stage = canvas.parentElement;
      if (!stage.clientWidth) return;
      const z = (pl.zoom = big ? Math.max(1, Math.floor(Math.min((stage.clientWidth - 24) / w, (innerHeight * 0.45) / h, 12))) : Math.min(cards.zoom, fitting(w, stage.clientWidth)));
      if (big) stage.style.setProperty('--fit', `${h * z + 24}px`); // 24: the stage's padding
      // EDGE px past the sides and the bottom, so a shake shows no gap. The floor `depth` screen px above the bottom,
      // level from card to card; without one, the effect in the middle.
      const depth = big ? DEPTH : cards.below;
      const vw = Math.ceil(stage.clientWidth / z), vh = Math.ceil(stage.clientHeight / z), W = Math.max(w, vw) + 2 * EDGE, H = Math.max(h, vh) + EDGE;
      const room = H - EDGE - h;
      [canvas.width, canvas.height, X] = [W, H, (W - w) >> 1];
      Y = Math.max(0, Math.min(room, Number.isFinite(floor) ? room + h - Math.ceil(depth / z) - floor : room >> 1));
      Object.assign(canvas.style, { width: `${W * z}px`, left: `${-((W - vw) >> 1) * z}px`, bottom: `${-EDGE * z}px` }); // centered, cropped alike both sides
      const back = backdrop(f.bg.value, W, H, Y + floor);
      ctx.putImageData(new ImageData(back, W, H), 0, 0);
      under = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) under.set(back.subarray(((Y + y) * W + X) * 4, ((Y + y) * W + X + w) * 4), y * w * 4);
      shown = -1;
    },
    tick(dt) {
      if (paused) shake = null; // time stands still, on the frame shown
      else if (freeze > 0) freeze -= dt;
      else {
        const hit = hits[next];
        if (hit && clock + dt >= base + hit.t) {
          clock = base + hit.t;
          next++;
          if (f.hitstop.checked) (freeze = hit.freeze ?? 0), (shake = { px: hit.shake ?? 0, left: SHAKE, n: 0 });
        } else clock += dt;
        if (loop && next === hits.length && clock >= base + duration) (base += duration), (next = 0);
        if (!loop && clock >= duration + GAP) pl.restart();
      }
      while (cues.length && clock >= cues[0].at) {
        const cue = cues.shift(), s = play(cue, clock - cue.at);
        if (s) sounds.push(s);
      }
      let dx = 0, dy = 0;
      if (shake && (shake.left -= dt) > 0 && !calm.matches) {
        const k = Math.ceil((shake.px * shake.left) / SHAKE) * pl.zoom, [sx, sy] = JIGGLE[shake.n++ % 4];
        (dx = sx * k), (dy = sy * k);
      }
      canvas.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';

      const t = Math.floor(clock * fps + 1e-6) / fps;
      if (t === shown) return;
      shown = t;
      if (st) st.draw(t, img.data, under, f.flip.checked);
      else {
        fx.flip = f.flip.checked;
        frame.ox = fx.flip ? w - ox : ox; // mirror the anchor so the flipped effect stays in frame
        fx.update(t - fx.t);
        clearFrame(frame);
        fx.draw(frame, 'back');
        fx.draw(frame, 'front');
        composite(frame, fx.palette, img.data, under);
      }
      ctx.putImageData(img, X, Y);
      if (bar) {
        const k = Math.min(frames - 1, Math.floor((clock - base) * fps + 1e-6)); // the rest after a one-shot: its last frame
        slider.value = k;
        slider.style.setProperty('--p', k / Math.max(1, frames - 1));
        slider.ariaValueText = readout.textContent = `frame ${k + 1} of ${frames}, ${(k / fps).toFixed(2)} s`;
      }
    },
    fail(e) {
      pl.hush();
      pl.error = e;
      broken(canvas.parentElement, e);
    },
  };
  if (bar) {
    toggle.addEventListener('click', () => pl.pause(!paused));
    slider.addEventListener('input', e => {
      e.stopPropagation(); // not a setting: the document's listener would restart it
      pl.pause(true, slider.valueAsNumber / fps);
    });
    bar.hidden = false;
  }
  return pl;
}

const cards = { zoom: 2, below: DEPTH }; // what every card on a page shares, set by relayout()
let pending = 0;

/** The largest zoom, up to 3, at which a stage `w` px wide fits `width` screen px, but for CROP px a side. */
const fitting = (w, width) => Math.max(1, Math.min(3, Math.floor(width / Math.max(1, w - 2 * CROP))));

/**
 * Lays every card out alike, so they match across the page: one zoom, the largest at which every stage fits a card
 * (fitting), and one stage height that holds them all with their floors on one line, `below` px above the bottom. A
 * stage that only fits at 1x takes it in its own card, rather than every card with it. Then refits every player.
 * Batched to once a frame, as cards arrive one by one.
 */
function relayout() {
  pending ||= requestAnimationFrame(() => {
    pending = 0;
    const ps = players.filter(pl => !pl.big && !pl.error), width = Math.max(0, ...[...document.querySelectorAll('.grid .stage')].map(s => s.clientWidth));
    if (ps.length && width) {
      cards.zoom = Math.min(3, ...ps.map(pl => fitting(pl.w, width)).filter(z => z > 1));
      const z = pl => Math.min(cards.zoom, fitting(pl.w, width)), floored = ps.filter(pl => Number.isFinite(pl.floor));
      cards.below = Math.max(DEPTH, ...floored.map(pl => (pl.h - pl.floor) * z(pl)));
      const height = Math.max(...floored.map(pl => pl.floor * z(pl) + cards.below), ...ps.map(pl => pl.h * z(pl))) + 24; // 24: headroom
      document.querySelectorAll('.grid').forEach(g => g.style.setProperty('--fit', `${height}px`));
    }
    players.forEach(pl => pl.error || pl.fit());
  });
}

function broken(stage, e) {
  console.error(e);
  stage.replaceChildren(el('p', { className: 'error', textContent: String(e) }));
}

const describe = meta => [meta.loop ? 'loop' : 'one-shot', `${meta.size[0]}×${meta.size[1]}`, `${meta.duration} s`]
  .concat(meta.act?.hits?.length ? ['hits'] : [], meta.views?.includes('top') ? ['top view'] : []);

/** Imports an effect, captions `root` and plays it in root's canvas; a broken effect shows its error there instead. */
async function show(entry, root, big) {
  const canvas = root.querySelector('canvas'), name = root.querySelector(big ? 'h1' : 'h3 a');
  const label = meta => {
    name.textContent = meta.name;
    root.querySelector('.desc').textContent = meta.desc ?? '';
    root.querySelector('.facts').replaceChildren(
      ...describe(meta).map((s, i) => el('li', { className: i ? '' : 'kind', textContent: s })),
      el('li', {}, el('code', { textContent: entry.id })),
    );
  };
  if (entry.meta) label(entry.meta); // the list's copy of the meta captions the card while its module loads
  else name.textContent = entry.id;
  if (!big) (name.href = query({ fx: entry.id })), (name.dataset.fx = entry.id);
  try {
    const mod = await import(`../src/fx/${entry.id}.js`), { meta } = mod, kind = meta.loop ? 'loop' : 'one-shot';
    label(meta);
    canvas.setAttribute('aria-label', `${meta.name}, ${kind}`);
    if (big) {
      document.title = `${meta.name} · grittyfx`;
      const hits = (meta.act?.hits ?? []).map(x => `${+x.t.toFixed(3)} s (freeze ${x.freeze ?? 0} s, shake ${x.shake ?? 0} px)`);
      const ramps = el('span', { className: 'ramps' }), use = root.querySelector('.use');
      const rows = [
        ['id', entry.id], ['size', `${meta.size.join(' × ')} px`], ['anchor', meta.origin.join(', ')],
        ['plays', kind], ['duration', `${meta.duration} s at ${meta.fps ?? 30} fps`], ['ramps', ramps],
        ['hits', hits.join(', ') || 'none'], ['tags', (meta.tags ?? []).join(', ')],
        ['stage', (({ at, pose, cast, ground }) => `${at}, anchor ${ground} px up, ${pose ? `${cast}: ${pose}` : 'not acted'}`)(role(meta, entry.id))],
        ['source', el('a', { href: `../src/fx/${entry.id}.js`, textContent: `src/fx/${entry.id}.js` })],
      ];
      root.querySelector('.meta').append(...rows.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', {}, v)]));
      use.hidden = false;
      refresh = () => {
        ramps.replaceChildren(...rampRows(meta));
        use.querySelector('.meta').replaceChildren(...useRows(entry.id));
      };
      refresh();
    }
    const pl = player(mod, canvas, big, entry.id);
    pl.restart();
    pl.fit();
    players.push(pl);
    relayout();
  } catch (e) {
    broken(root.querySelector('.stage'), e);
  }
}

/** A move from src/stage/moves.js, acted out in root's canvas. */
async function showMove(id, root, big) {
  const m = MOVES[id], canvas = root.querySelector('canvas'), name = root.querySelector(big ? 'h1' : 'h3 a');
  name.textContent = m.name;
  if (!big) (name.href = query({ move: id })), (name.dataset.move = id);
  root.querySelector('.desc').textContent = m.desc;
  canvas.setAttribute('aria-label', `${m.name}, acted out`);
  const steps = m.steps.map(s => `${s.fx}${s.on ? ` on ${s.on}` : ''}`);
  if (big) {
    document.title = `${m.name} · grittyfx`;
    root.querySelector('.meta').append(...[['move', id], ['steps', steps.join(', then ')]].flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: v })]));
  } else root.querySelector('.facts').append(...steps.map(s => el('li', {}, el('code', { textContent: s }))));
  try {
    const pl = player(null, canvas, big, id, await Promise.all(m.steps.map(async s => ({ ...s, id: s.fx, mod: await import(`../src/fx/${s.fx}.js`) }))));
    pl.restart();
    pl.fit();
    players.push(pl);
    relayout();
  } catch (e) {
    broken(root.querySelector('.stage'), e);
  }
}

/**
 * A cast member's card: its frames as a sheet at 1x (cells the size of its biggest frame, feet at the same spot in
 * each, row by row in pose order), shown zoomed, to download as a PNG or as the Aseprite file it comes from.
 */
function castCard(who) {
  const [x0, y0, x1, y1] = bounds(who), w = x1 - x0, h = y1 - y0;
  const frames = Object.entries(CAST[who]).flatMap(([pose, fs]) => fs.map(f => ({ pose, f })));
  const cols = Math.ceil(Math.sqrt(frames.length)), rows = Math.ceil(frames.length / cols);
  const canvas = el('canvas', { width: cols * w, height: rows * h, role: 'img', ariaLabel: `${who}, every pose` });
  const g = canvas.getContext('2d'), img = g.createImageData(canvas.width, canvas.height);
  frames.forEach(({ f }, n) => f.rows.forEach((line, j) => [...line].forEach((ch, i) => {
    const k = KEYS.indexOf(ch), X = (n % cols) * w + f.x - x0 + i, Y = Math.floor(n / cols) * h + f.y - y0 + j;
    if (k >= 0) img.data.set(hex(PALETTES[who][k]), (Y * canvas.width + X) * 4);
  })));
  g.putImageData(img, 0, 0);
  // one zoom for the whole cast, so their sizes compare; a sheet too wide for the narrowest card (320 px less its
  // padding) spans two, and shrinks to fit when the grid has one column
  const wide = canvas.width * 2 > 296;
  Object.assign(canvas.style, { position: 'static', width: `${canvas.width * 2}px`, maxWidth: '100%', height: 'auto' });
  let n = 0;
  const order = Object.entries(CAST[who]).map(([pose, fs]) => `${pose} ${fs.map(() => ++n).join(', ')}`);
  return el('li', { className: wide ? 'card wide' : 'card' },
    el('div', { className: 'stage' }, canvas),
    el('div', { className: 'info' },
      el('h3', { textContent: who[0].toUpperCase() + who.slice(1) }),
      el('p', { className: 'desc', textContent: `Frames left to right, row by row: ${order.join('; ')}.` }),
      el('ul', { className: 'facts' },
        el('li', { className: 'kind' }, el('a', { href: canvas.toDataURL('image/png'), download: `${who}.png`, textContent: 'PNG' })),
        el('li', {}, el('a', { href: `../src/stage/cast/${who}.aseprite`, download: `${who}.aseprite`, textContent: '.aseprite' })),
        el('li', { textContent: `${w}×${h} cells` }),
        el('li', { textContent: `feet at ${-x0}, ${-y0}` })),
    ));
}

const note = (...kids) => main.replaceChildren(el('p', { className: 'note', role: 'status' }, ...kids));
const head = (text, n) => el('h2', {}, text, el('small', { textContent: n }));
const clone = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

/** The preview page for `id`, linked to the ones before and after it in `ids` (round the ends); key is 'fx' or 'move'. */
function preview(ids, id, key, nameOf) {
  const root = clone('preview-tpl'), i = ids.indexOf(id), n = ids.length;
  root.querySelector('.pager').hidden = n < 2;
  root.querySelectorAll('.pager a').forEach((a, k) => {
    const other = ids[(i + (k ? 1 : -1) + n) % n];
    a.dataset[key] = other;
    a.textContent = k ? `${nameOf(other)} ›` : `‹ ${nameOf(other)}`;
    a.setAttribute('aria-label', `${k ? 'Next' : 'Previous'}: ${nameOf(other)}`);
  });
  if (key === 'move') root.querySelector('.back').textContent = '← all moves';
  else if (cat) root.querySelector('.back').textContent = `← all ${cat} effects`;
  root.querySelector('.desc').after(form); // as on every page: its title first, then the settings for its stage
  form.hidden = false; // now, not once the effect has loaded, so the stage doesn't jump down
  main.replaceChildren(root);
  return root;
}

/** Hides the grid's cards outside the chosen category. */
const filter = () => document.querySelectorAll('li[data-cat]').forEach(li => (li.hidden = !!cat && li.dataset.cat !== cat));

async function start() {
  let list;
  try {
    const res = await fetch('fx-list.json');
    if (!res.ok) throw new Error(res.status);
    list = await res.json();
  } catch {
    return note('No effect list (fx-list.json). Run ', el('code', { textContent: 'node tools/serve.mjs' }), ' and open the URL it prints.');
  }
  if (move) {
    if (!MOVES[move]) return note('No move called ', el('code', { textContent: move }), '. ', el('a', { className: 'back', href: './', textContent: 'See them all.' }));
    await showMove(move, preview(Object.keys(MOVES), move, 'move', id => MOVES[id].name), true);
  } else if (only) {
    const entry = list.find(e => e.id === only);
    if (!entry) return note('No effect called ', el('code', { textContent: only }), '. ', el('a', { className: 'back', href: './', textContent: 'See them all.' }));
    // step through the category the grid was filtered to, else through them all
    const all = list.map(e => e.id), mine = all.filter(id => id.startsWith(`${cat}/`)), ids = mine.includes(only) ? mine : all;
    if (ids === all) cat = '';
    await show(entry, preview(ids, only, 'fx', id => list.find(e => e.id === id).meta?.name ?? id), true);
  } else if (page === 'characters') {
    const heroes = Object.keys(CASTERS);
    main.replaceChildren(
      el('section', {}, head('Characters', heroes.length),
        el('p', { className: 'desc', textContent: 'The cast that acts the effects out, free to use in your own games (MIT, like the code).' }),
        el('ul', { className: 'grid' }, ...heroes.map(castCard))),
      el('section', {}, head('Monsters', MONSTERS.length),
        el('p', { className: 'desc', textContent: 'The targets that take the hits: pick one under Cast. Free to use as well.' }),
        el('ul', { className: 'grid' }, ...MONSTERS.map(castCard))));
  } else if (page === 'moves') {
    const ids = Object.keys(MOVES), ul = el('ul', { className: 'grid' });
    main.replaceChildren(el('section', {}, head('Moves', ids.length),
      el('p', { className: 'desc', textContent: 'Effects played in a row as one attack, acted out by the cast.' }), form, ul));
    for (const id of ids) {
      const card = clone('card-tpl');
      ul.append(card);
      showMove(id, card, false);
    }
  } else {
    if (!list.length) return note('No effects yet.');
    const counts = {};
    for (const { id } of list) counts[id.split('/')[0]] = (counts[id.split('/')[0]] ?? 0) + 1;
    if (!counts[cat]) cat = '';
    const chips = el('fieldset', { className: 'chips', ariaLabel: 'Category' }, ...[['', list.length], ...Object.entries(counts)].map(([c, n]) =>
      el('label', {}, el('input', { type: 'radio', name: 'cat', value: c, checked: c === cat }), el('span', {}, `${c || 'all'} `, el('small', { textContent: n })))));
    const ul = el('ul', { className: 'grid' });
    main.replaceChildren(el('section', {}, head('Effects', list.length), chips, form, ul));
    for (const entry of list) {
      const card = clone('card-tpl');
      card.dataset.cat = entry.id.split('/')[0];
      ul.append(card);
      show(entry, card, false);
    }
    filter();
  }
  form.hidden = !main.contains(form); // the settings sit under a page's title; the character sheets have none
  // View only where a top view can play: not for moves, nor on the page of an effect without one
  f.view.closest('.field').hidden = page === 'moves' || (!!only && !list.find(e => e.id === only)?.meta?.views?.includes('top'));
  showSettings();
}

form.addEventListener('submit', e => e.preventDefault());
document.addEventListener('input', e => { // the form's settings and the grid's category chips
  if (e.target === f.custom) readCustom();
  if (e.target.name === 'cat') (cat = e.target.value), filter();
  showSettings();
  history.replaceState(null, '', move ? query({ move }) : only ? query({ fx: only }) : home());
  const restart = ['palette', 'custom', 'seed', 'view', 'caster', 'target', 'foe'].includes(e.target.name);
  for (const pl of players) if (!pl.error) restart ? pl.restart() : pl.redraw();
  // shown again (fit while hidden), or a new backdrop
  if ([f.caster, f.target].includes(e.target) || ['cat', 'bg'].includes(e.target.name)) relayout();
});
main.addEventListener('click', e => {
  const sound = e.target.closest('.sound'), copy = e.target.closest('.copy');
  if (sound) {
    audio.ctx ??= new AudioContext();
    audio.ctx.resume();
    audio.on = !audio.on;
    sound.setAttribute('aria-pressed', audio.on);
    players.forEach(pl => pl.error || pl.restart()); // from the top, so the sound starts with the pixels
  }
  if (copy) {
    const done = text => () => {
      copy.textContent = text;
      setTimeout(() => (copy.textContent = 'copy'), 1500);
    };
    navigator.clipboard.writeText(copy.previousElementSibling.textContent).then(done('copied'), done('failed'));
  }
});
document.addEventListener('visibilitychange', () => audio.ctx?.[document.hidden ? 'suspend' : 'resume']()); // the pixels pause too
document.getElementById('replay').addEventListener('click', () => players.forEach(pl => pl.error || (pl.pause(false), pl.restart())));
document.getElementById('dice').addEventListener('click', () => {
  f.seed.value = 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9999); // short enough to read out and share
  f.seed.dispatchEvent(new Event('input', { bubbles: true }));
});
// The palettes open under their button; a click picks one and closes them, arrow keys recolor as they browse.
pop.addEventListener('toggle', e => {
  if (e.newState !== 'open') return;
  const r = pick.getBoundingClientRect();
  Object.assign(pop.style, { top: `${r.bottom + 6}px`, left: `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`, maxHeight: `${innerHeight - r.bottom - 14}px` });
});
pop.addEventListener('click', e => e.detail && requestAnimationFrame(() => pop.hidePopover())); // detail 0: a key moved it
pop.addEventListener('keydown', e => e.key === 'Enter' && pop.hidePopover());
addEventListener('scroll', () => pop.matches(':popover-open') && pop.hidePopover(), { passive: true }); // it would drift from its button
addEventListener('resize', relayout);

readCustom();
showSettings();
start();
let last = performance.now();
requestAnimationFrame(function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const pl of players) {
    if (pl.error || pl.canvas.closest('[hidden]')) continue;
    try {
      pl.tick(dt);
    } catch (e) {
      pl.fail(e);
    }
  }
  requestAnimationFrame(loop);
});
