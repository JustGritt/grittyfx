// The gallery: plays every effect live from its module, filtered by category (?cat=), or one large with ?fx=<id> (the
// preview page, with its sound). With either character on, a knight, a mage or an archer acts them out on a goblin,
// and the moves (?move=<id>) show above them.
import { PAL, hex, fit, createFx, createFrame, clearFrame, composite, layout, HEADINGS, synth, SAMPLE_RATE } from '../src/core/index.js';
import { createStage, role } from '../src/stage/stage.js';
import { MOVES } from '../src/stage/moves.js';

const BG = { ground: '#1b1d26', dark: '#1b1d26', mid: '#575b6b', light: '#d8d5cd' }; // the stage colors in index.html
const STONE = ['#454a5e', '#2b2e3c', '#22242f', '#15161d'].map(hex); // the floor's lit edge, top course, deeper courses, mortar
const GAP = 0.8; // a one-shot rests this long, empty, before it plays again
const SHAKE = 0.2; // seconds a hit's shake takes to die down
const EDGE = 4; // px of backdrop past the stage's sides and bottom, the most a hit shakes it
const DEPTH = 64; // screen px of floor below the actors' feet, the same in every card: room for what an effect draws below
const JIGGLE = [[1, 0], [-1, 1], [1, -1], [-1, 0]];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const form = document.getElementById('controls'), f = form.elements, main = document.getElementById('main');
const params = new URLSearchParams(location.search), only = params.get('fx'), move = params.get('move');
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

// Settings live in the form and the URL, so a preview link keeps them.
for (const name of Object.keys(PAL)) f.palette.add(new Option(name, name), f.palette.length - 1);
HEADINGS.forEach((name, d) => f.view.add(new Option(`top ${name}`, d))); // effects without a top view stay side
for (const [k, v] of params) {
  if (k === 'flip' || k === 'hitstop' || k === 'caster' || k === 'target') f[k].checked = v === '1';
  else if (['palette', 'custom', 'seed', 'bg', 'view'].includes(k)) f[k].value = v;
}
f.custom.value ||= '#0b1a2e #14506a #1ca0a0 #6ff0c0 #f2fff6';
if (!BG[f.bg.value]) f.bg.value = 'ground';

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
  if (f.bg.value !== 'ground') q.set('bg', f.bg.value);
  if (!f.hitstop.checked) q.set('hitstop', 0);
  return String(q) ? `?${String(q).replaceAll('%2F', '/')}` : './';
}

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

const swatches = colors => colors.map(c => {
  const s = el('span');
  s.style.background = `rgb(${c.slice(0, 3)})`;
  return s;
});

function showSettings() {
  const pal = f.palette.value, colors = pal === 'custom' ? custom ?? [] : PAL[pal] ?? [];
  document.getElementById('custom-field').hidden = pal !== 'custom';
  document.getElementById('ramp').replaceChildren(...swatches(colors.map(hex)));
  document.body.dataset.bg = f.bg.value;
  refresh();
  document.getElementById('moves')?.toggleAttribute('hidden', !acting());
  for (const a of document.querySelectorAll('a[data-fx]')) a.href = query({ fx: a.dataset.fx });
  for (const a of document.querySelectorAll('a[data-move]')) a.href = query({ move: a.dataset.move });
  for (const a of document.querySelectorAll('a.back')) a.href = query();
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
  src.start(0, late);
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
 * the view by `shake` pixels: the effect's hits in meta.act, or the stage's.
 */
function player(mod, canvas, big, id, steps) {
  const meta = mod?.meta, ctx = canvas.getContext('2d');
  // w x h is the effect or the stage, drawn at (X, Y) on a canvas that fills the card; `under` is its piece of backdrop
  let fx, st, fps, hits, duration, loop, clock, base, next, freeze, shake, shown, w, h, ox, img, frame, floor, X = 0, Y = 0, under, cues = [], sounds = [];
  const pl = {
    canvas, zoom: 1, error: null,
    restart() {
      const acted = steps ?? (acting() && [{ mod, id }]);
      st = acted && createStage(acted, options(), { caster: f.caster.checked, target: f.target.checked });
      // the top view at the chosen heading, live, so any angle works; the canvas follows the view's size
      const view = !st && f.view.value && meta.views?.includes('top') ? 'top' : 'side', v = st ? null : layout(meta, view);
      const [sw, sh] = st ? st.size : v.size;
      // the floor: under the actors' feet, else as far under the anchor as the effect is acted; a top view has none
      const fl = st ? st.floor : view === 'side' ? v.origin[1] + role(meta, id).ground : Infinity;
      if (w !== sw || h !== sh || floor !== fl) {
        const resized = !!img;
        [w, h, floor] = [sw, sh, fl];
        img = new ImageData(w, h);
        if (resized) pl.fit();
      }
      if (st) ({ fps, hits, duration, loop } = st);
      else {
        [fps, hits, duration, loop] = [meta.fps ?? 30, meta.act?.hits ?? [], meta.duration, meta.loop];
        frame = createFrame(w, h, (ox = v.origin[0]), v.origin[1]);
        fx = createFx(mod, { ...options(), view });
        fx.angle = v.directions > 1 ? (f.view.value * Math.PI) / 4 : 0; // a radial top view has one heading
      }
      clock = base = next = freeze = 0;
      shake = null;
      shown = -1;
      pl.hush();
      // each effect's sound from where it starts: the effect's from 0, a stage's from each act's start
      if (big && audio.on) {
        cues = st ? st.plan.acts.map(a => ({ at: a.start, end: a.end, stop: a.stop, meta: a.mod.meta })) : [{ at: 0, end: Infinity, stop: Infinity, meta }];
        cues.sort((a, b) => a.at - b.at);
      }
    },
    hush() {
      sounds.forEach(s => s.stop());
      sounds = [];
      cues = [];
    },
    redraw() {
      shown = -1;
    },
    // Zooms the effect to fit, and fills the stage with the canvas and its backdrop (hidden, it waits to be shown).
    fit() {
      const stage = canvas.parentElement;
      if (!stage.clientWidth) return;
      const z = (pl.zoom = Math.max(1, Math.floor(Math.min((stage.clientWidth - 24) / w, big ? (innerHeight * 0.6) / h : 3, big ? 12 : 3))));
      stage.style.setProperty('--fit', `${h * z + 24}px`); // 24: the stage's padding
      // EDGE px past the sides and the bottom, so a shake shows no gap. The floor DEPTH screen px above the bottom, level
      // from card to card where the effect fits; without one, the effect in the middle.
      const vw = Math.ceil(stage.clientWidth / z), vh = Math.ceil(stage.clientHeight / z), W = Math.max(w, vw) + 2 * EDGE, H = Math.max(h, vh) + EDGE;
      const room = H - EDGE - h;
      [canvas.width, canvas.height, X] = [W, H, (W - w) >> 1];
      Y = Math.max(0, Math.min(room, Number.isFinite(floor) ? room + h - Math.ceil(DEPTH / z) - floor : room >> 1));
      Object.assign(canvas.style, { width: `${W * z}px`, left: `${-EDGE * z}px`, bottom: `${-EDGE * z}px` });
      const back = backdrop(f.bg.value, W, H, Y + floor);
      ctx.putImageData(new ImageData(back, W, H), 0, 0);
      under = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) under.set(back.subarray(((Y + y) * W + X) * 4, ((Y + y) * W + X + w) * 4), y * w * 4);
      shown = -1;
    },
    tick(dt) {
      if (freeze > 0) freeze -= dt;
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
    },
    fail(e) {
      pl.hush();
      pl.error = e;
      broken(canvas.parentElement, e);
    },
  };
  return pl;
}

function broken(stage, e) {
  console.error(e);
  stage.replaceChildren(el('p', { className: 'error', textContent: String(e) }));
}

const describe = meta => [meta.loop ? 'loop' : 'one-shot', `${meta.size[0]}×${meta.size[1]}`, `${meta.duration} s`]
  .concat(meta.act?.hits?.length ? ['hits'] : []);

/** Imports an effect, captions `root` and plays it in root's canvas; a broken effect shows its error there instead. */
async function show(entry, root, big) {
  const canvas = root.querySelector('canvas'), name = root.querySelector(big ? 'h1' : 'h3 a');
  name.textContent = entry.id;
  if (!big) (name.href = query({ fx: entry.id })), (name.dataset.fx = entry.id);
  try {
    const mod = await import(`../src/fx/${entry.id}.js`), { meta } = mod, kind = meta.loop ? 'loop' : 'one-shot';
    name.textContent = meta.name;
    root.querySelector('.desc').textContent = meta.desc ?? '';
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
    } else {
      root.querySelector('.facts').append(
        ...describe(meta).map((s, i) => el('li', { className: i ? '' : 'kind', textContent: s })),
        el('li', {}, el('code', { textContent: entry.id })),
      );
    }
    const pl = player(mod, canvas, big, entry.id);
    pl.restart();
    pl.fit();
    players.push(pl);
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
  } else root.querySelector('.facts').append(el('li', { className: 'kind', textContent: 'move' }), ...steps.map(s => el('li', {}, el('code', { textContent: s }))));
  try {
    const pl = player(null, canvas, big, id, await Promise.all(m.steps.map(async s => ({ ...s, id: s.fx, mod: await import(`../src/fx/${s.fx}.js`) }))));
    pl.restart();
    pl.fit();
    players.push(pl);
  } catch (e) {
    broken(root.querySelector('.stage'), e);
  }
}

const note = (...kids) => main.replaceChildren(el('p', { className: 'note', role: 'status' }, ...kids));
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
  if (key === 'fx' && cat) root.querySelector('.back').textContent = `← all ${cat} effects`;
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
  } else {
    if (!list.length) return note('No effects yet.');
    const counts = {};
    for (const { id } of list) counts[id.split('/')[0]] = (counts[id.split('/')[0]] ?? 0) + 1;
    if (!counts[cat]) cat = '';
    const chips = el('fieldset', { className: 'chips', ariaLabel: 'Category' }, ...[['', list.length], ...Object.entries(counts)].map(([c, n]) =>
      el('label', {}, el('input', { type: 'radio', name: 'cat', value: c, checked: c === cat }), el('span', {}, `${c || 'all'} `, el('small', { textContent: n })))));
    const ul = el('ul', { className: 'grid' }), moves = el('ul', { className: 'grid' });
    const ids = Object.keys(MOVES), section = el('section', { id: 'moves', hidden: !acting() }, el('h2', { textContent: `${ids.length} moves` }), moves);
    main.replaceChildren(section, el('h2', { textContent: `${list.length} effects` }), chips, ul);
    for (const id of ids) {
      const card = clone('card-tpl');
      moves.append(card);
      showMove(id, card, false);
    }
    for (const entry of list) {
      const card = clone('card-tpl');
      card.dataset.cat = entry.id.split('/')[0];
      ul.append(card);
      show(entry, card, false);
    }
    filter();
  }
  showSettings();
}

form.addEventListener('submit', e => e.preventDefault());
document.addEventListener('input', e => { // the form's settings and the grid's category chips
  if (e.target === f.custom) readCustom();
  if (e.target.name === 'cat') (cat = e.target.value), filter();
  showSettings();
  history.replaceState(null, '', move ? query({ move }) : only ? query({ fx: only }) : query());
  const restart = [f.palette, f.custom, f.seed, f.view, f.caster, f.target].includes(e.target);
  for (const pl of players) if (!pl.error) restart ? pl.restart() : pl.redraw();
  // shown again (fit while hidden), or a new backdrop
  if ([f.caster, f.target].includes(e.target) || ['cat', 'bg'].includes(e.target.name)) players.forEach(pl => pl.error || pl.fit());
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
document.getElementById('replay').addEventListener('click', () => players.forEach(pl => pl.error || pl.restart()));
addEventListener('resize', () => players.forEach(pl => pl.error || pl.fit()));

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
