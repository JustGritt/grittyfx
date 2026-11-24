# Changelog

## Unreleased

- **A cast that fits**: the stage's code-drawn swordsman and dummy are replaced by characters drawn in Aseprite
  (`src/stage/cast/*.aseprite`, made into `src/stage/cast.js` by `tools/cast.mjs`): a knight acts melee, pickups
  and landings, a mage spells, statuses, auras and spell projectiles (the staff's orb glows in the spell's colors),
  an archer other projectiles, and a goblin takes the hits (knocked back, a white flash, a hurt face). Tags pick the
  caster, `meta.stage.cast` overrides it. Shots leave from the caster's staff or bow.
- **Gallery**: Caster and Target toggles replace Stage, on by default, like pixelfx's character toggle: either can
  be switched off (`?caster=0`, `?target=0`), both off shows the effect alone. `createStage(steps, o, show)`.
- **New effect** `projectiles/arrow` (8 headings), and an Arrow shot move.
- **A kunoichi** joins the cast: she slashes (`slash`, the Sword combo with it), vanishes (`vanish`, the smoke
  puff) and acts every `shadow/` effect, throwing, crouching into a hand sign or lunging with her kunai.
- **New effects** `projectiles/kunai` (a leaf blade, a wrapped grip, a ring and a fluttering tassel) and
  `projectiles/shuriken` (a spinning four-pointed star), both tagged `thrown`: the kunoichi throws them. 8 headings each.
- **More moves**: Shock arrow (archer), Tidal bolt and Hex (mage), Smite (priest), so every caster and the water,
  shadow, electric and holy effects play in one.
- **Gallery ground**: a `ground` background, the default, like pixelfx's: a stone floor under the actors' feet (or
  under an effect alone, as high as the stage would act it), level from card to card, filling each card edge to edge.
  `?bg=dark` is the flat one. `composite()` takes a background image as well as a color.

- **Edit in Aseprite**: `render.mjs <id> --aseprite <dir>` writes the side view as an `.aseprite` file (never over an
  existing one) (a color layer, a
  light layer in Addition, the effect's palette, a tag per hit); `export.mjs <file>.aseprite` bundles it back, still
  recolorable. Frame durations become held frames, hit tags move the hits and the sound's cues follow them. The bundle
  takes the file's name, so variants sit beside the original. `export.mjs --out <dir>` writes bundles for any engine.
- **Gallery**: category filter (`?cat=`); pictures line up across a row. The preview page plays the effect's sound
  (on the stage too), steps to the previous and next effect, shows each ramp's colors, and gives copyable lines to
  use it: the JS import, the Godot and Unity export, the sheet, with the chosen palette and seed.

## 1.0.0 (2026-11-24)

- **Stage**: a code-drawn swordsman and training dummy act effects out: wind-up, the effect placed by its role (on
  the target, the caster, the ground, above the head, or travelling between them), hit-stop and shake with the dummy
  flinching, then recovery. Moves chain effects. In the gallery (Stage toggle, `?move=`) and `render --stage`.
  `meta.stage` overrides the placement.
- **17 new effects** in seven new categories: water (splash, ripple, water-bolt), electric (arc, shock), shadow
  (dark-nova, portal, curse), holy (light-pillar, blessing, holy-bolt), status (poisoned, stunned, burning), pickups
  (coin-collect, power-up), projectiles (energy-orb). 30 in all.
- **TypeScript types** for the core, the effect modules and the sheet player; `package.json` ready to publish.
- Versions aligned at 1.0.0: the npm package, the Unity package and the Godot addon.

## 0.4.0

- **Top-down views**: `meta.views: ['side', 'top']`. Directional effects bake 8 headings (rows E, SE, S, SW, W, NW,
  N, NE) by turning the painter, so pixels stay on the grid; radial ones draw their own view from above. A top view is
  its own bundle, `<name>_top.*`. The sheet player (`angle`), Godot and Unity (`direction`) pick the row.
- **Sound**: six seeded recipes (thump, crack, whoosh, crackle, zap, chime) synthesised from `meta.sound` cues into a
  WAV with each bundle; loops loop without a click. Every player plays it with the effect and fades it with `stop()`.
- `check.mjs` sweeps seeds 2 to 16 over every view and heading.

## 0.3.0

- The Claude Code skill and plugin marketplace, the authoring guide and a generated catalog.
- The gallery (GitHub Pages): every effect live, with palette, seed, flip, background and hit-stop; `serve.mjs`.
- `render --html`: a standalone page that plays a baked bundle from disk.
- CI: tests and checks on Node 18 and LTS, gallery deploy.
- Ten more effects across fire, impacts, explosions and magic.

## 0.2.0

- The sheet player: the reference playback of baked bundles on a 2D canvas, with per-instance recolor and hit events.
- `export.mjs`: bundles into Godot and Unity projects.
- The Unity 6 package (URP 2D) with its importer, player, hit-stop and demo; the Godot 4 addon (not yet run in Godot).

## 0.1.0

- The core: palette-indexed frames with a light layer, the painter, seeded random numbers and noise, the particle,
  light and debris simulation, runtime recolor.
- Tools: `render.mjs` (contact sheets, bundles, gif and mp4), `check.mjs` (the quality gate), `new.mjs`, `list.mjs`.
- Three reference effects: fire/torch, impacts/hit-spark, explosions/small-explosion.
