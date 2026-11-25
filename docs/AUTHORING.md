# Authoring effects

An effect is one file, `src/fx/<category>/<name>.js`, that draws palette indices and light through a painter. The
tools render it, check it and bake it into a bundle that engines recolor at runtime. This guide is the contract, the
drawing API, the workflow and the bar an effect has to clear. The code in `src/core` and `tools/` is the final word.

## Workflow

| step | command | what for |
|---|---|---|
| find | `node tools/list.mjs spark` | Most requests are an existing effect with another palette, seed or option. |
| new | `node tools/new.mjs magic/frost-nova [--loop]` | A simulated one-shot, or a pure loop with `--loop`, that renders and passes the check as generated. |
| render | `node tools/render.mjs magic/frost-nova` | Writes `records/<id>/contact.png`: 12 sampled frames at 3x, and `contact_top.png` (a row per heading) for a top view. `--all` for every frame, `--gif` / `--mp4` (ffmpeg, side view), `--zoom`, `--fps`, `--seed`, `--bg '#hex'`, `--opts '<json>'`. |
| look, fix | | Open the contact sheet and judge it against the [quality bar](#the-quality-bar). Fix the worst thing, render again. **Three rounds minimum**: the first draft never holds up. |
| act out | `node tools/render.mjs --stage magic/frost-nova` | Writes `records/<id>/stage.png`: the effect acted out by the [stage](#stage)'s cast, held on each hit and shaken, as a game shows it. Check where it lands and how its hits feel. `--gif`, `--mp4`, `--all`, `--flip`; a move's name instead of an id plays the move. |
| sound | `node tools/sfx.mjs magic/frost-nova` | Writes `records/<id>/<name>.wav` from the [sound cues](#sound) and prints its length, peak and RMS. Listen to it with the contact sheet open. `--seed`. |
| check | `node tools/check.mjs magic/frost-nova` | The gate. No output but the summary line means it passes. It tries seeds 2 to 16 too; `--seeds N` changes how many. |
| recolor | `node tools/render.mjs magic/frost-nova --opts '{"palette":"poison"}'` | It must still read in another ramp, and on a light `--bg`. |
| bake | `node tools/render.mjs magic/frost-nova --sheet` | The bundle: data sheet, palette, baked sheet, JSON, the `.wav` when it has sound, and the `_top` bundle for a top view. `--html` also writes `<name>.html`, which plays the side view with recolor, flip and hit-stop when opened from disk. |
| catalog | `node tools/catalog.mjs` | Regenerates `docs/CATALOG.md`; `--check` fails when it is stale. |

`records/` is gitignored: renders are for looking, not for committing.

## The contract

### `meta`

```js
export const meta = {
  name: 'Small explosion',
  desc: 'A white flash, a fireball that cools into rolling smoke, ...', // one line, for list.mjs and the catalog
  tags: ['explosion', 'fire', 'smoke'],
  size: [96, 80],    // canvas in px
  origin: [48, 60],  // the anchor inside the canvas: feet, impact point, muzzle
  duration: 1.6,     // seconds; one period for a loop
  loop: false,
  fps: 30,           // frames per second of the baked sheet (30 when left out)
  views: ['side', 'top'],  // 'top' also bakes a top-down bundle, see Top-down
  top: { size: [96, 96] }, // the top view's canvas; { directions: 8 } for a directional effect
  ramps: { palette: 8, smoke: 6 },                    // the ramp options and their step counts
  options: { palette: 'fire', smoke: 'smoke', seed: 1 }, // defaults; any option the effect reads goes here
  act: { hits: [{ t: 0, freeze: 0.05, shake: 4 }] },  // only when it hits, see Act timing
  stage: { ground: 0 }, // only when the stage would place it wrong, see Stage
  sound: [{ t: 0, kind: 'crack', pitch: 0.3 }, { t: 0, kind: 'thump', pitch: 0.6 }], // see Sound
};
```

`name`, `size`, `origin` and `duration` are required. Two optional fields go to the bundle as is: `end` (what a player
does after the last frame, `'loop'` for loops and `'remove'` for one-shots unless set) and `mirror` (`false` when the
effect must not be flipped).

### Ramps and palette indices

Each name in `meta.ramps` is an option holding a ramp: a name from `PAL` in `src/core/color.js` (fire, ember, ice,
water, electric, arcane, holy, heal, poison, shadow, blood, smoke, dust, gold, stone, leaf) or a list of colors.
`createFx` resamples it to its step count (fewer steps pick existing colors, more interpolate), dark to bright, lays
every ramp into one 256-entry palette table (index 0 is "nothing", `palette` first, the others in `meta.ramps`
order), and hands the effect **arrays of indices**: `o.palette[0]` is the darkest step, `o.palette[7]` the brightest
of 8. By convention `const C = o.palette`.

Effects draw indices only, never colors. The bundle stores an index per pixel and the engine maps it through a
palette texture, so swapping the palette recolors an effect per instance on the GPU, with no re-export. A color the
effect computes (a mix of two steps, a tint) has no index: `check.mjs` fails any write that is not an integer index
of the effect's palette. Index 0 or any falsy value draws nothing and never erases.

### Pure and simulated

| | exports | the frame comes from | use it for |
|---|---|---|---|
| pure | `draw(p, t, o)`, optional `drawBack(p, t, o)` | `t` alone, in seconds; a loop gets `t % duration` | loops, anything with a closed form |
| simulated | `create(o)` returning `{ update(dt), draw(p), drawBack?(p) }` | state stepped by `update` | particles, debris, anything with physics |

The runtime steps a simulation at a fixed 120 Hz (`STEP = 1 / 120`) whatever the frame rate, so it looks the same at
any fps. Only `create` and `update` draw random numbers; `draw` may run any number of times and must not change state.
A simulation that needs the time counts it: `t = ++n * dt` in `update`, not `t += dt`, whose sum of 1/120 steps
drifts just below some frame times and puts a `t < HIT` test one frame late. `drawBack` is the layer behind a character; for now
the tools draw it first into the same frame as the front.

### Local coordinates

(0, 0) is the anchor at `meta.origin`. x goes right, y goes down (up is negative), 1 unit is 1 px. Directional effects
(slashes, projectiles, beams) face right; the runtime mirrors and rotates them.

Positions are continuous: integer positions are pixel corners, and pixel (i, j) has its center at (i + 0.5, j + 0.5).
Single-cell calls (`px`, `dot`, `blend`, `light`, line ends) take the cell a position falls in. Shapes take every pixel
whose center is inside them: `circle(0, 0, 2)` is 4 px wide and has no center pixel, `circle(0.5, 0.5, 2)` is 5 px wide
and centered on pixel (0, 0).

### Top-down

Top-down games need an effect per heading, and rotating pixel art in the engine smears it, so the headings are baked.
`views: ['side', 'top']` bakes a second bundle, `<name>_top`, seen from above; an effect without `'top'` is side view
only. There are two kinds:

| kind | `meta.top` | the top view |
|---|---|---|
| directional: projectiles, beams, slashes, dashes | `{ directions: 8 }` | the side drawing turned by the painter, one row per 45 degrees: E, SE, S, SW, W, NW, N, NE. Nothing new to draw. |
| radial: novas, explosions, ground effects | `{ size: [w, h] }` | one row, drawn by the effect itself when `o.view === 'top'` |

- **The view is an option.** The tools create the effect with `view: 'top'` or `'side'`, so `draw(p, t, o)` and
  `create(o)` see `o.view` (live, `createFx(mod, { view: 'top' })`; undefined means side). A radial effect branches on
  it, usually `if (o.view === 'top') return createTop(o);` in `create` (see `explosions/small-explosion`). A
  directional effect may use it for small fixes: the slash's sparks fly flat instead of falling.
- **Seen from above** there is no gravity and no ground line: the floor is the whole canvas. Rings are circles, not
  flattened ellipses; sparks, debris and dust spread over the floor plane; fire and smoke billow up toward the eye, so
  they swell where they are instead of rising. `new Particles({ ..., top: true })` and `new Bits({ ..., top: true })`
  do that (leave `ground` out).
- **The canvas**: `top.size` and `top.origin` (centered when left out). Without a size, it is a square around the
  origin that holds the side canvas turned to any heading, which is safe but often generous: measure what the top view
  draws and set a tighter one (`impacts/slash` uses 80 x 80 instead of 108 x 108).
- **Angles** are screen space, y down, so S is +90 degrees and headings turn clockwise; heading `d` (0 to 7) is the
  painter turned `d * 45` degrees. Players pick row `round(angle / 45 degrees) mod 8` from the game's heading.
- **Diagonals stay on the grid** because the painter turns geometry before rasterising: lines turn their offsets and
  round once, shapes sample each pixel's exact position. `shade` does too, so on a diagonal its `x, y` are not whole
  numbers: shade from positions, not pixel parity.
- **The bundle** is `<name>_top.json`, `_top.png`, `_top_data.png`, `_top_pal.png`, beside the side one, which keeps
  its layout and names. Its `meta.grittyfx` has `view: 'top'`, `directions` (8 or 1), `mirror: false` (a mirrored
  top view would swing the other way) and `frames` counted per direction. The sheet has one row per direction, one
  column per frame; the JSON `frames` list them row by row (frame `i` of direction `d` is `d * frames + i`), and
  `frameTags` name each row `E` ... `NE`. Hits keep their per-frame `frame`, the same in every row.

### One-shots end empty, loops are periodic

A one-shot draws nothing, no color and no light, at `t = duration`: every particle, light and bit has died by then.
A loop's frame at `duration` is its frame at 0; see [periodic loops](#lessons).

### Determinism

Frame N is the same on every machine and every run. Random numbers come from `new Rng(o.seed)` (`next`, `range`,
`int`, `pick`, `chance`) in a simulation, or from `rand(x, k, j)`, a stateless hash, in a pure effect (`rand(j, seed)`
gives particle j the same value on every frame). Noise is `noise2`, `fbm`, `loopNoise` and `tileFbm`. Never
`Math.random()` or `Date`: `check.mjs` greps for them and renders every effect twice to compare.

### What `check.mjs` checks

Drawing outside the canvas, glow included; writes that are not palette indices; a one-shot that does not end empty; a
loop whose last frame jumps to its first; two renders that differ; a frame over 2 ms; `Math.random` or `Date` in the
source; `act` hits outside `[0, duration]`, out of order or negative; sound cues of an unknown kind, outside
`[0, duration]` or with a pitch of 0 or less; a loop's sound that clicks where its end joins its start; a `stage.at`
that is not a stage place. Every view is
checked, a top view at each of its headings (`top SW frame 4: ...`), and seeds 2 to 16 for crashes, drawing outside,
bad colors and the one-shot end (`(seed 3)`, or `seed 3: error`); only the first broken seed is reported.

## The painter

Every call takes local coordinates and palette indices. `c` (an index) and `a` (alpha, 0 to 1) may be functions of
the shape's own coordinates, listed per call, which is how shapes get gradients, rims and highlights. Light calls take
an intensity `k` instead of an alpha and write the light buffer, which is added over the color when composited.

| call | draws | `c`, `a` as functions of |
|---|---|---|
| `px(x, y, c)` | a solid pixel | |
| `dot(x, y, c, a)` | a pixel at alpha `a` by 4x4 Bayer dither: on or off | |
| `blend(x, y, c, a)` | a pixel at true alpha | |
| `line(x0, y0, x1, y1, c, a)` | a 1 px line | `t`, 0 to 1 along it |
| `polyline([[x, y], ...], c, a)` | joined lines that keep their angles | `t` along each segment |
| `beam(x0, y0, x1, y1, w, c, a)` | a thick line, `w` px wide, round ends | `t` along, `d` from the axis 0 to 1 |
| `circle(cx, cy, r, c, a)` | a filled circle | `dx, dy` from the center, `d` 0 to 1 |
| `ellipse(cx, cy, rx, ry, c, a)` | a filled ellipse | `dx, dy, d` |
| `disc(cx, cy, r, c, a)` | a translucent volume (smoke, fire, mist) at true alpha | `dx, dy, d` |
| `ring(cx, cy, r, w, c, a)` | a circle outline `w` px wide | `dx, dy`, `e` across the band, -1 inside to 1 outside |
| `arc(cx, cy, r, a0, a1, w, c, a)` | part of a ring, `a0` to `a1` radians clockwise from +x (`a1 < a0` runs the other way). A number `w` makes a crescent `w * sin(pi t)` wide; a function `w(t)` sets the width | `t` along, `e` across |
| `shade(x, y, w, h, c, a)` | every pixel of a box at true alpha: a per-pixel shader | `x, y` of the pixel (not whole numbers on a diagonal heading); return 0 to skip it |
| `light(x, y, c, k)` | one cell of light | |
| `glow(cx, cy, r, c, k)` | a pool of light, `k * (1 - d)^2`, or `k(d)` | `c(d)` |
| `glowLine(x0, y0, x1, y1, r, c, k)` | light around a segment, falling off over `r` px | `c(t, d)`, `k(t, d)` |

`a` and `k` default to 1. `px`, `dot`, lines, `beam`, `circle`, `ellipse`, `ring` and `arc` dither their alpha and
write solid pixels; `blend`, `disc` and `shade` keep the true alpha. The runtime sets `place(x, y, flip, angle)`,
`fade` and `lightK`; `check.mjs` reads the `outside` and `bad` counters.

```js
// a rim-lit puff: bright up-left, dark rim, soft edge; light under it
p.glow(0, -8, 14, C[5], 0.5);
p.disc(0, -8, 5, (dx, dy, d) => C[d > 0.85 ? 3 : dx + dy < -3 ? 7 : 5], (dx, dy, d) => 0.9 * (1 - d * d));
// a crescent slash, thickest mid-swing, hotter on its outer edge
p.arc(0, 0, 14, -1.2, 1.2, 4, (t, e) => C[e > 0 ? 7 : 5]);
```

**How layers combine.** The compositing formula is `rgb = pal[ci] * ca + pal[li] * lk * gain`, `a = ca`. Each pixel
holds one color index and one light index, so overlaps pick:

- Color: the layer that contributes more keeps its index (the new one if `a >= under alpha * (1 - a)`), and the alphas
  combine. A solid pixel always takes the pixel; a volume over a solid pixel takes it only at alpha 0.5 or more.
- Light: the brighter light keeps its index and the intensities add, up to 1.

## The simulation kit

`src/core/sim.js`. Units are px, px/s and px/s². Each class has `update(dt)` and `draw(p)`; call them from the
effect's own `update` and `draw`.

**`new Particles({ rng, palette, smoke = palette, dust = smoke, ground = Infinity, gravity = 300, top = false })`**, with
`spawn(kind, x, y, vx, vy, life, { size, delay, back, ramp, smoke })`. `size` is a volume's radius, `delay` the
seconds before it appears, `back: true` puts it on the layer drawn by `draw(p, 'back')`, `ramp` replaces the kind's
own ramp, and `smoke` (FIRE only) is the seconds of smoke it turns into when it burns out. `ground` is the floor's y.
`top: true` is the view from above: nothing falls, rises or sinks (embers wander both ways), so motion stays on the
floor plane; leave `ground` out.

| kind | moves | looks | ramp |
|---|---|---|---|
| `SPARK` | falls (`gravity`), bounces on the ground | a streak of its last 35 ms, a small glow | palette |
| `FIRE` | rises fast, heavy drag | a shrinking disc barely darker at its rim, so puffs merge into one body; a glow | palette |
| `EMBER` | drifts up and wanders | a flickering dot and a point of light | palette |
| `SMOKE` | rises slowly, heavy drag | a disc that swells and thins, round highlight up-left, shadow rim down-right | smoke |
| `DUST` | sinks, settles on the ground | like smoke, swells less | dust |

They draw volumes under bright bits: smoke, dust, fire, embers, sparks.

**`new Lights()`**, with `add(x, y, r, c, k = 1, life = 0.2, { delay })`: a glow at full strength at once, then
`k * (1 - age / life)^2`.

**`new Bits({ rng, ground = Infinity, gravity = 300, onLand, top = false })`**, with
`spawn(x, y, vx, vy, { c, size = 2, life = 1, shard = false, delay })`: debris, a chunk or a thin `shard` line `size`
px long, that tumbles, bounces, comes to rest lying flat and fades over the last 20% of its life. `onLand(bit)` runs
at every touch of the ground, before the bounce, with the impact velocity in `bit.vy`: kick up dust there. With
`top: true` bits skid across the floor plane, slowing until they lie still (`v / 3` px from where they start); no
gravity, ground or `onLand`.

```js
export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, smoke: o.smoke, ground: 0 }), lights = new Lights();
  lights.add(0, -8, 24, C[6], 1, 0.3);
  for (let i = 0; i < 10; i++) {
    const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), v = rng.range(40, 90);
    parts.spawn(FIRE, 0, -8, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.3, 0.5), { size: rng.range(4, 7), smoke: 0.6 });
  }
  return {
    update(dt) { parts.update(dt); lights.update(dt); },
    draw(p) { lights.draw(p); parts.draw(p); },
  };
}
```

## Act timing

`meta.act` is the timing a game needs to act the effect out: `{ windup, hits: [{ t, freeze, shake }] }`.

| field | meaning |
|---|---|
| `windup` | how long before the effect the character begins its wind-up (raise, crouch, draw back): start its animation that long before playing the effect. |
| `hits[].t` | seconds into the effect where the hit lands, in time order, within `[0, duration]`. Put it on the hero frame. |
| `hits[].freeze` | hit-stop in seconds: how long the game stops time on contact. 0.05 to 0.1 for most hits. |
| `hits[].shake` | screen shake strength in px: 1 to 2 for a hit, 4 or more for a blast. |

The bundle adds each hit's `frame` (`t * fps`, rounded). A player raises a hit event when playback reaches that frame,
with the hit's index, freeze and shake. The game answers with hit-stop (time scale near 0 for `freeze` real seconds,
timed by a clock that ignores the time scale) and a short camera shake. The effect itself never freezes or shakes:
timing is data, the game decides.

## Stage

An effect reads best acted out. The stage (`src/stage/`) has a cast drawn in Aseprite: a caster that fits the effect
(a knight, a mage, a priest, an archer or a kunoichi) winds up for `act.windup` (0.15 s for a strike, 0.3 s for a cast when left out), the
effect plays where its role puts it, the game freezes and shakes on each hit while a goblin flashes white and is
knocked back, then both recover. The gallery acts every effect out this way (its Caster and Target toggles switch
either character off; a top view in its View plays the effects that have one on their own), and `render --stage`
writes it. It is a preview, side view only, and not part of the package: games bring their own characters.

**Roles.** The first of an effect's tags that has a role places it; with none, its category does; else it goes on
the target. Tag effects for what they are, and the stage follows:

| tag | category | place (`at`) | the anchor goes | the caster |
|---|---|---|---|---|
| `projectile` | `projectiles` | `path` | from the caster's staff or bow to the goblin's chest, flying 200 px/s (a loop), arriving on its first hit, or at its end (a one-shot); a loop is removed on arrival | shoots |
| `aura`, `buff`, `pickup` | `pickups` | `caster` | on the floor at the caster's feet | raises a sword or staff |
| `nova` | | `ground` | on the floor at the caster's feet; a `landing` tag makes them hop and land in it, a `jump` tag take off from it | raises, hops or leaps |
| `status` | `status` | `above` | on top of the goblin's head | casts |
| `ambient` (torches, portals, props) | | `aside` | on the floor next to the caster; nobody acts | idles |
| anything else: impacts, explosions, beams, pillars | | `target` | on the goblin's chest, 14 px over the floor | strikes in sword's reach if it is tagged `melee` or `slash`, else casts |

The goblin only stands in for effects that strike it (`target`, `path`, `above`): a buff, a pickup, a nova or a prop
plays with the caster alone, a prop `aside` standing next to them, and the canvas fits.

**Who acts it.** The kunoichi slashes, throws and vanishes (`slash`, `thrown`, `vanish`) and acts every `shadow/`
effect; the knight strikes, hops and picks things up (`melee`, `pickup` and the `pickups` category); the priest acts
`holy/`; the archer shoots projectiles that aren't tagged `magic` or `spell`; the mage casts everything else, the
staff's orb glowing in the spell's colors. In a move, the first acted step picks.

**`meta.stage`** corrects the default when an effect's anchor is somewhere else:

| field | meaning |
|---|---|
| `at` | the place, over the role: `target`, `caster`, `ground`, `path`, `above` or `aside` |
| `cast` | who acts it, over the tags: `knight`, `mage`, `priest`, `archer` or `kunoichi` |
| `ground` | where the floor is in the effect's own coordinates, px below its anchor: how high the stage holds the anchor. `0` for an anchor on the floor (explosions, splashes, pillars, a status drawn from the feet), `14` for a hit drawn 14 px above its floor |
| `x` | px toward the goblin from the place: the slash anchors at its wielder, so `x: -22`; the coin floats at the knight's side, `x: 16` |
| `speed` | a looping projectile's, in px/s |
| `scenery` | the set the stage draws behind a prop, from its anchor: `sconce` (a wall torch's stick, for the torch's flame), `posts` (two terminals 18 px either side, down to the floor, for the arc), `pool` (water level with the floor, from the effect's first ramp, for the ripple) |

`render --stage <id>` and the effect's preview page (its `stage` row) show where it lands. Each hit of an effect on
the goblin (`target`, `path`, `above`) knocks it back, and so does a projectile without hits when it arrives; hits on
the caster's side still freeze and shake.

**Moves** (`src/stage/moves.js`) chain effects: `{ name, desc, steps: [{ fx, on, opts, stage }] }`. A step plays once the
one before it has ended, after its own wind-up; `on: 'hit'` plays it with the previous step's first hit instead (a
spark on the slash's cut, the explosion where the fireball lands), and a step's `stage` places it over its effect's `meta.stage` (Frost nova's glints round the goblin), and coinciding hits freeze once, at the stronger
freeze and shake. `render --stage <move>` writes `records/moves/<move>/`; the gallery shows them on its Moves page
(`?page=moves`).

**The cast's art** is in `src/stage/cast/<name>.aseprite`, one file per character: the feet at the bottom center of
the canvas, a tag per pose (`idle` has two frames, a breath), and a hidden `tip` layer with one pixel where the glow
sits and shots leave from. The knight draws `idle`, `ready`, `swing`, `raise`, `crouch`; the mage `idle`, `gather`,
`cast`, `raise`; the archer `idle`, `draw`, `release`; the kunoichi `idle`, `ready`, `slash`, `follow`, `gather`,
`throw`, `crouch`, `seal`; the goblin `idle`, `hurt` (`CASTERS` in `src/stage/actors.js` maps the stage's poses to
them). After editing, `node tools/cast.mjs` writes `src/stage/cast.js`; a test fails while it is out of date.

## Sound

`meta.sound` is a list of cues, `{ t, kind, gain = 1, pitch = 1 }`. `src/core/sound.js` synthesises them into one
mono sound at 22050 Hz, as long as the effect and starting at frame 0. The bundle carries it as `<name>.wav`
(`meta.grittyfx.sound`), and the players start it with the effect. Hit-stop doesn't pause it. Without `meta.sound`,
each act hit plays a `thump`. `sound: false` is silence, and the bundle has no `.wav`.

| kind | what it is | for |
|---|---|---|
| `thump` | a sine dropping from 160 to 45 Hz under a noise click, soft-clipped | impacts and landings, the low end of a blast |
| `crack` | a bright noise snap over a gritty body | hits, cuts, shattering, debris landing. At a low pitch, a blast's rumble or thunder |
| `whoosh` | noise through a band-pass that sweeps up and back down, loudest a third of the way in | swings, poofs, gathering magic |
| `crackle` | a flickering low roar, a little hiss and random pops. It lasts to the end of a one-shot, or all of a loop | fire |
| `zap` | a pulse wave jumping between random pitches, ring-modulated by noise and stuttering | electricity |
| `chime` | a struck bell at 880 Hz with inharmonic partials | magic, sparkles, pickups |

- `t` is seconds from frame 0. Put an impact's cues on its hit's `t`. A `whoosh` peaks a third of the way into its
  length, so start it that much before what it leads to.
- `pitch` is a playback rate, as on a sampler: frequencies times `pitch`, lengths divided by it. 0.5 is an octave down
  and twice as long. At pitch 1: thump 0.4 s, crack 0.45 s, whoosh 0.36 s, zap 0.4 s, chime 1 s.
- `gain`: each cue's sound peaks at 0.8 times its gain. Where cues add up past 0.9, the whole sound is turned down to
  fit, so the balance between cues holds.
- Layer for weight: a thump under a crack is a heavy hit, a low crack (pitch 0.3) under a thump is a blast. Keep idle
  loops quiet, with gains of 0.2 to 0.4: they play for minutes.
- Noise, pops and stutter come from the effect's seed (`new Rng(o.seed)`): the same cues and seed give the same bytes.
- A one-shot cuts what rings past its end with a 10 ms fade: if the cut shows, start the cue earlier or raise its
  pitch. A loop wraps it round to its start instead, so the sound repeats seamlessly at its period, and the WAV
  carries a `smpl` loop chunk (Godot's default import loops it).

`node tools/sfx.mjs <id>` writes `records/<id>/<name>.wav` and prints its length, peak and RMS. Listen to it with the
contact sheet open.

## The quality bar

| | what it means | how |
|---|---|---|
| **Lines and light, not fills** | Shapes are strokes, streaks, crescents and glow, not flat blobs. | `line`, `beam`, `arc`, sparks; fills only as small hot cores. |
| **Light everywhere** | Anything hot or magic casts light, on the air and on the floor. | `glow`, `glowLine`, `Lights`; a pool on the ground for anything near it. |
| **Translucent volumes** | Smoke, fire and mist show what is behind them, with a lit side and a dark rim. | `disc`, `shade`, `SMOKE` / `FIRE` / `DUST`. |
| **Real motion** | Things accelerate, drag, fall, bounce and settle; nothing slides at constant speed. | The sim kit, or eased curves in pure effects. |
| **Phases** | Charge, release, spread, hold, decay: each one readable on its own frames. | Plan the timeline before drawing; `delay` staggers the parts. |
| **Depth** | Front and back, near and far: smoke behind, sparks in front, ground contact. | `back` particles, `drawBack`, dust and bounces on `ground`. |
| **Fast attack, slow release** | The peak arrives in one or two frames and fades over many. | A white hero frame on the hit, then long lives and squared falloffs. |
| **Reads at 1x** | The silhouette and value steps hold at native size, not only zoomed. | Render `--zoom 1`; fewer, larger parts beat noise. |
| **Original** | No effect copied from another library or game; generic motifs are fine. | Draw from reference, not from someone's sprites. |
| **Clean** | No stray pixels, nothing clipped at the canvas edge, no seam, an empty last frame. | `check.mjs`, and look at `--all`. |
| **Heard** | A sound on every hit, on its frame, as heavy as it looks. | `meta.sound` cues, layered; `sfx.mjs` to listen. |

## Lessons

- **Size the canvas for the glow.** `check.mjs` flags anything drawn outside the canvas, glows included. Make the
  canvas bigger, or tame the speeds, lives and radii that reach the edge.
- **Don't overlap two hues of light at similar strength.** Each pixel keeps the brighter light's index, so where two
  lights cross at near-equal intensity the hue flips along a hard seam. Start one light after the other has faded
  (see the floor light in `explosions/small-explosion`), or keep one clearly stronger.
- **Pure loops must be exactly periodic.** Sines run a whole number of cycles per loop (`sin(TAU * (t / duration) * k)`
  with integer `k`); noise loops with `loopNoise(x, t, period)`; scrolling noise is `tileFbm` scrolled by whole tiles
  per loop; per-particle cycles use `(t / duration * k + rand(j, seed)) % 1`. `fire/torch` does all four.
- **Translucent overlaps keep the dominant index.** A faint edge doesn't repaint the denser puff under it. `FIRE`
  puffs are barely darker at the rim so they merge into one body, and `SMOKE` / `DUST` puffs keep a round highlight,
  so a cluster reads as rolling volumes rather than one flat blob.
- **Keep each frame under 2 ms.** Glows cost one pass over their area: a few big glows, not one per particle.
- **Prefer the existing core.** If an effect truly needs a new core capability, keep it minimal, in its own commit,
  with a test, and never change existing behaviour: every existing effect must render identically.
