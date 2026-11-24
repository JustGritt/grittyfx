---
name: grittyfx
description: >-
  Pixel-art effects as code with grittyfx: small JavaScript files baked to sprite sheets that recolor at runtime,
  with glow and hit-stop timing. Use it for any request about pixel-art VFX or a sprite effect (torch, campfire, hit
  spark, slash, explosion, smoke, spell, sparkle), a sprite sheet or animation strip of one, game juice (hit-stop,
  screen shake, impact flashes), a recolor ("an ice version of the torch", poison-green smoke), or getting an effect
  into Godot, Unity, Phaser or a browser canvas game. It finds an existing effect first, then uses, recolors or
  exports it, or draws a new one and refines it by eye.
---

# grittyfx

An effect lives in `src/fx/<category>/<name>.js` and paints **palette indices** rather than colors. The colors come
from ramps (`palette`, `smoke`, ...), so one effect is fire, ice or poison by changing an option, in the browser or
per instance in an engine.

`<gfx>` below is the grittyfx folder: `${CLAUDE_SKILL_DIR}/../..`. Its tools need Node 18+ and nothing else; run them
as `node <gfx>/tools/<tool>.mjs` from any folder. To **make or change** an effect, work in a clone instead (the
current project if it is grittyfx, else `git clone https://github.com/JustGritt/grittyfx`): the plugin's copy is
replaced on every update.

## 1. Find first

Usually what someone asks for already exists and only needs another palette, seed or option.

1. `node <gfx>/tools/list.mjs <word>`: search by what it is (`torch`, `hit`, `explosion`), not by color: "ice torch"
   is `torch` with the `ice` palette. No words lists everything.
2. Render each candidate and **look**: `node <gfx>/tools/render.mjs <id>` prints a contact sheet path; Read it.
   Each render overwrites that sheet, so Read it before the next one. `--stage` instead shows it acted out (a
   swordsman winds up, it lands on a training dummy, the hit freezes and shakes): the best way to show someone a hit.
3. Read the candidate's `meta` (top of its file): `options` holds what you can change (palette, seed, ...), `ramps`
   the color slots, `act` its hits.
4. Try the change: `--opts '{"palette":"ice"}'`, `--seed 7`, then Read the sheet again. Ramp names: fire, ember, ice,
   water, electric, arcane, holy, heal, poison, shadow, blood, smoke, dust, gold, stone, leaf (`src/core/color.js`),
   or your own colors dark to bright: `{"palette":["#102040","#3080c0","#a0e0ff","#ffffff"]}`.

If nothing is close, make one (section 3).

## 2. Use

**Browser, live** (any canvas game). `npm i github:JustGritt/grittyfx`, then:

```js
import { createFx, createFrame, clearFrame, composite } from 'grittyfx';
import * as torch from 'grittyfx/fx/fire/torch';

const fx = createFx(torch, { palette: 'ice' });   // options merge over meta.options
const [w, h] = fx.meta.size, [ox, oy] = fx.meta.origin;
const frame = createFrame(w, h, ox, oy), img = new ImageData(w, h);
// each tick: fx.update(dt); clearFrame(frame); fx.draw(frame, 'back'); fx.draw(frame);
// composite(frame, fx.palette, img.data); put img on a w x h canvas, drawImage it scaled with smoothing off,
// its (ox, oy) on the anchor. fx.flip mirrors; fx.stop() fades a loop out; remove it when fx.done().
```

**Browser, baked**: `runtime/sheet-player.js` plays an exported bundle on a canvas, with recolor and hit events; its
header comment is the API.

**Godot 4 / Unity 6**: `node <gfx>/tools/export.mjs <ids or category> --godot <project> --unity <project>` writes the
bundle (`<name>.json`, `_data.png`, `_pal.png`, `.png`, and `.wav` when it has sound) to `<project>/grittyfx/<category>/<name>/` (Godot) and
`<project>/Assets/GrittyFx/<category>/<name>/` (Unity). Re-export overwrites only those files. The engine side
(install, the `GrittyFx` node or prefab, signals, hit-stop helper, recolor per instance) is in
`<gfx>/engines/godot/README.md` and `<gfx>/engines/unity/README.md`: read the one you need.

**Anything else** (Phaser, Aseprite, another engine): `node <gfx>/tools/render.mjs <id> --sheet` writes the bundle to
`<gfx>/records/<id>/`; copy `<name>.png` and `<name>.json` into the game: a plain sheet in Aseprite's array layout
(Phaser: `load.aseprite` then `anims.createFromAseprite`). Its colors are baked: add `--opts` for a recolor.
`<name>.wav`, when there is one, is its sound from frame 0: play it with the animation (looped for a loop).

**Top-down**: an effect whose `meta.views` has `top` (`list.mjs` and `docs/CATALOG.md` show it) also bakes and
exports `<name>_top`: one row per heading (E, SE, S, SW, W, NW, N, NE) for a directional effect, one row for a radial
one. Players pick the row from the game's heading: `angle` in the sheet player (radians, y down), `direction` in
Godot (`Vector2`, y down) and Unity (`Vector2`, world y up); never rotate the sprite. Each row is an Aseprite tag
named after its heading (Phaser: `createFromAseprite(key, null, sprite)` keeps those names per sprite).

**Hit timing**: `meta.act.hits` is `[{ t, freeze, shake }]` (the bundle adds each hit's `frame`). When the effect
reaches `t`, pause the game for `freeze` seconds and shake the camera by `shake` px; `windup` is how long the
attacker winds up before the effect starts. Engines raise these as signals or events.

**Recolor**: live, pass ramp options to `createFx`. In an engine, call `set_ramp` (Godot) or `SetRamp` (Unity) per
instance with the colors of a ramp from `src/core/color.js`. To bake a palette instead, `render.mjs <id> --sheet --opts
'{"palette":"ice"}'` writes `<name>_pal.png` over the default bundle in `records/<id>/`: copy it under a new name
(`<name>_ice_pal.png`) and, in Unity, give it the `_pal.png` import settings (engine README), or its colors come out wrong.

## 3. Make

**Brief.** Ask, in one short message, only what the request leaves open: role (hit, projectile, pickup, ambient
prop...), view (side, or top-down too), size in px, length and loop, palette, glow, density, sound (synthesised
from cues: thump, crack, whoosh, crackle, zap, chime). If they say "you pick", pick and state your picks.

**Read** before drafting: `src/core/painter.js` and `src/core/sim.js` (short, documented), and the existing effect
closest to yours. The contract:

- `meta`: name, desc, tags (what `list.mjs` searches), size [w, h], origin [x, y] (the anchor inside the canvas),
  duration, loop, fps, views, ramps (`{ palette: 8, smoke: 6 }`: slot and steps), options (defaults), act (hits),
  sound (cues `{ t, kind, gain, pitch }`; without it each hit thumps; see the Sound section of `docs/AUTHORING.md`).
  Tags also place it on the stage (`projectile`, `aura`, `buff`, `pickup`, `nova`, `status`, `ambient`; anything else
  lands on the target); `stage: { ground: 0 }` when the anchor is on the floor (the Stage section).
- Pure: `draw(p, t, o)` (and `drawBack`), the frame from `t` alone. Simulated: `create(o)` returns
  `{ update(dt), draw(p), drawBack? }`, stepped at 120 Hz.
- (0, 0) is the anchor, x right, y down; directional effects face right. Colors are `C[i]` with `C = o.palette`:
  pick a step by role (0 darkest, last brightest), never compute a color.
- One-shots draw nothing at `t = duration`. Seeded `Rng` / `rand` / noise only, never `Math.random` or `Date`.
- Top-down: `views: ['side', 'top']`. Directional effects add `top: { directions: 8 }` and get 8 headings turned by
  the painter for free; radial ones (novas, explosions) add `top: { size }` and draw the view from above themselves
  when `o.view === 'top'`: no gravity, circles not ellipses, `Particles` / `Bits` with `top: true`. Read the Top-down
  section of `docs/AUTHORING.md` first. Render writes `contact_top.png`, a row per heading: Read it too.

**Loop**, from the clone's root:

1. `node tools/new.mjs <category>/<name>` (`--loop` for a pure loop) writes a working stub.
2. Draft in phases: anticipation, a hero frame (the brightest, biggest frame, where a hit lands), release, spread,
   hold, decay. Fast attack, slow release. Lines and light over flat fills.
3. `node tools/render.mjs <id>` and **Read the contact sheet**. Short one-shot: add `--all`. Also look at 1x
   (`--zoom 1`) and on a light background (`--bg '#c8c8d0'`). Then `node tools/render.mjs <id> --stage` and Read
   `stage.png`: it must land in the right place and its hits must feel right acted out.
4. Name what is wrong (the table below), fix it, render again. **Three rounds minimum**, even when round one looks
   fine: compare against the reference effect and ask what a pixel artist would change.
5. Sound: cue `meta.sound` on what the frames show (impacts on the hit, a whoosh leading into a swing, crackle under
   fire). `node tools/sfx.mjs <id>` writes the WAV and prints its length, peak and RMS.
6. `node tools/check.mjs <id>` until it prints nothing but the count.
7. Recolor check: render with two other palettes (e.g. `ice`, `poison`); it must read in each.
8. `node --test`, then export with the clone's tools, not `<gfx>`'s (they only see their own effects):
   `node tools/export.mjs <id> --godot <project> --unity <project>` or `node tools/render.mjs <id> --sheet`.

## Symptoms

| symptom | try |
|---|---|
| check: draws outside the canvas (glows count) | grow `size` and move `origin`, or cut speeds, lifetimes and glow radii |
| check: the last frame jumps to the first | whole cycles per loop: `sin(TAU * k * t / duration)` with integer k, `loopNoise`, `tileFbm` scrolled by whole tiles, particles on `(phase * k + rand(i)) % 1` |
| check: a one-shot isn't empty at its end | every delay + life ends before `duration`; lengthen `duration` or shorten lives |
| check: over 2 ms a frame | a few big glows, not one per particle; smaller `shade` boxes |
| check: not a palette index | `C[i]` with a whole, in-range `i`: `Math.round` and clamp; never mix two colors |
| a hard seam where two lights of different hues meet | the brighter index wins per pixel: don't overlap comparable lights of two hues, start one after the other fades |
| dark rims or halos where puffs overlap | the dominant layer keeps its index: `FIRE` particles merge, `SMOKE` and `DUST` have round highlights; keep a volume's rim one step from its body |
| a flat blob, a sticker | a darker rim, a hotter core, a glow around it, a broken silhouette (noise or tongues) |
| mush or noise at 1x | fewer, bigger shapes; dither (`dot`) only for falloff |
| the hit lands softly | make the contact frame (1 or 2) the biggest and brightest and decelerate from there; let shapes swing past their rest pose and come back; add `act.hits` for freeze and shake |
| elements pop off at full size | shrink to a dot or step down the ramp before they go |
| elements land on each other | give each its own slot (a sector of the ring, a lane) instead of a free random spot |
| a loop that pulses as one | give each element its own phase or speed from `rand(i, seed)` |
| a step flickers on and off | thresholds on a smooth value jitter: widen bands or slow the value down |
| it vanishes on a light background | light only adds: give the shape colored pixels, not just glow |
| a recolor looks wrong | it assumed a hue: pick steps by brightness role; check that every ramp slot (`smoke`, ...) is exposed in `ramps` |

Painter: `px`, `dot` (dithered alpha), `blend`, `line`, `polyline`, `beam`, `circle`, `ellipse`, `disc`, `ring`,
`arc` (crescent width), `shade` (per pixel), `light`, `glow`, `glowLine`. Shapes take the pixels whose centers are
inside: `circle(0.5, 0.5, r)` is centered on a pixel. Sim: `Particles` (`SPARK`, `SMOKE`, `FIRE`, `EMBER`, `DUST`;
spawn options `size`, `delay`, `back`, `ramp`, `smoke`), `Lights`, `Bits` (`onLand`). Prefer them to new core code.
