# Changelog

## Unreleased

- **Arcs on the stage**: `meta.stage.arc` lobs a projectile along a parabola that many px high, so thrown things
  fall onto the goblin, landing where and when a straight shot would. For grenades, bombs and flasks to come.
- **Wind**, a new `wind/` category and a `wind` palette (pale teal to mint white): `gust` (air drawn into the staff,
  then a cone of curling lines that shoves the goblin back, dust kicked off the floor), `tornado` (a funnel twisting up
  round the goblin, grinding it three times, then unwinding and flinging out the dust and leaves it carried),
  `air-blade` (a crescent of air the kunoichi throws, streaks curling off its tips) and `updraft` (a buff loop, streaks
  and leaves spiralling up round the caster over a ring of air). Top views for all but the updraft. The Tempest move
  pairs the gust and the tornado.
- **Caltrops** (`projectiles/caltrops`): a handful the kunoichi tosses in a low arc to the goblin's feet, tumbling
  apart, clattering and hopping over the floor, settling spikes up and glinting one by one before they fade. Acted
  with her `throw`.
- **Unarmed hits**, tagged `unarmed` and `melee` for a monk to act (the knight stands in until there is one):
  `impacts/punch` (a compact, heavy blow: a white flash and a ring of impact lines on a long hit-stop), `impacts/kick`
  (a roundhouse sweeping a flat arc at chest height into a wider broken ring) and `impacts/palm-strike` (two palms,
  then a shockwave on a second hit that shoves the goblin back). The Flurry move chains punch, punch, kick.
- **Ground slam** (`impacts/ground-slam`): the knight drives his blade into the floor (a white flash, steel sparks,
  cracks) and a shockwave of rolled-up dust and grit runs both ways along it, the far side bursting under the
  goblin's feet as it hits. Acted with `slam`: his `raise`, then his `crouch` until his own slam is drawn.
- **Charge-up** (`magic/charge-up`): a held charge on the knight's raised blade, motes drawn inward into it, its glow
  building to a flare each beat, a flickering rim round him. The Charged strike move holds it, then brings the blade
  down in a gold heavy hit. A held raise (`meta.stage.hold`) now stays up while its loop plays, like a held cast, and
  a charge or buff on the caster before a melee blow keeps the goblin in reach.
- **The priest's holy spells**: `holy/barrier` (a wall of light held out before her; a hostile bolt in its own `bolt`
  ramp bursts on it, the wall flaring, denting and rippling, then crumbling into motes), `holy/revive` (soft light
  comes down beside her on a body of light lying on the floor, lifted upright in a white flash) and `holy/cleanse` (a
  taint in its own `taint` ramp, poison by default, bubbling over her until light from her staff washes it off at
  her feet).
- **The archer's fire and volley**: `projectiles/fire-arrow` (a burning head, flames streaming back off it, embers
  peeling off into a trail; the flame is its palette, so it recolors to a frost or poison arrow),
  `projectiles/sky-shot` (two arrows loosed high out of the frame) and `projectiles/arrow-rain` (a volley falling
  steeply across the goblin, thudding into the floor round it, three of them striking it). The Fire arrow move sets
  the goblin burning where it strikes; Arrow rain shoots high, then the volley falls.
- **The stage acts the new effects right**: `meta.stage` can hide the caster (`hide`: the kunoichi gone in her smoke
  bomb, substitution and smoke puff), move them (`move`: the blink's 54 px, so Shadow step cuts the goblin as she
  reappears, with a move step's `acted: true`), hold a cast while a beam lasts (`hold`), pick the caster's own tags
  for an effect (`looks`, a list of stand-ins until one is drawn), and show an effect before it plays (`waits`: the
  chest is there before the knight kneels to it). A jump tagged `air` kicks off in mid-air (`airjump`: the double
  jump); the smoke puff plays at the feet of whoever vanishes in it, not on the goblin. A pose takes a character's tag
  of the same name once drawn.

- **A cast that fits**: the stage's code-drawn swordsman and dummy are replaced by characters drawn in Aseprite
  (`src/stage/cast/*.aseprite`, made into `src/stage/cast.js` by `tools/cast.mjs`): a knight acts melee, pickups
  and landings, a mage spells, statuses, auras and spell projectiles (the staff's orb glows in the spell's colors),
  an archer other projectiles, and a goblin takes the hits (knocked back, a white flash, a hurt face). Tags pick the
  caster, `meta.stage.cast` overrides it. Shots leave from the caster's staff or bow.
- **Poses play as runs**: a cast pose can be several frames, each shown for its Aseprite duration (`ms` in
  `cast.js`). Idle loops, a wind-up ends its run as the action comes in, and an action starts its run on its key and
  holds its last frame: a strike's swing now lands on its contact, a frame later than before.
- **New poses, and `meta.stage.pose`** to name how an effect is acted: the knight thrusts (`impacts/thrust`, Lunge),
  cuts upward from the floor (`impacts/uppercut`, Launcher), spins twice (`impacts/spin-slash`, Whirlwind), runs on the
  spot (`movement/footstep`) and kneels to the chest (`pickups/chest-open`); the kunoichi dashes forward with her
  trail (`movement/dash-trail`), jumps (`movement/jump-dust`), jumps again from the air (`movement/double-jump`),
  dashes her smoke bomb down and is gone in it (`shadow/smoke-bomb`) and clings to the wall as the grit sprays from her hand (`movement/wall-slide`); the mage slams his staff for the quake (`earth/quake`, Tremor). `check.mjs` checks the pose.
- **Gallery**: Caster and Target toggles replace Stage, on by default, like pixelfx's character toggle: either can
  be switched off (`?caster=0`, `?target=0`), both off shows the effect alone. `createStage(steps, o, show)`.
- **New effect** `projectiles/arrow` (8 headings), and an Arrow shot move.
- **A kunoichi** joins the cast: she slashes (`slash`, the Sword combo with it), vanishes (`vanish`, the smoke
  puff) and acts every `shadow/` effect, throwing, crouching into a hand sign or lunging with her kunai.
- **New effects** `projectiles/kunai` (a leaf blade, a wrapped grip, a ring and a fluttering tassel) and
  `projectiles/shuriken` (a spinning four-pointed star), both tagged `thrown`: the kunoichi throws them. 8 headings each.
- **Gallery: the cast to download**: a card per character with every pose on a sheet, free to use (MIT): a PNG at
  1x (equal cells, feet at the same spot, the frame order listed) or the `.aseprite` it comes from.
- **Gallery pages**: Effects, Moves (`?page=moves`) and Characters (`?page=characters`), each its own page under a
  nav in the header, the settings following from one to the next; a preview's title sits above its settings.
- **Gallery redesign**: a specimen catalog. Cards ruled by hairlines in one drawer, set in Satoshi (from Fontshare's
  CDN, as its license keeps the files out of public repos), monospace for code only; a category index in place
  of pills, and the settings strip held at the top on wide screens. Every page puts its title first, then the settings
  (one row on wide screens, "Cast" for the caster and target), then the specimens. Every card the same size: one zoom
  for the page (the largest every stage fits at, 2x on a laptop), one stage height with every floor on one line, labels
  of fixed height; cards are captioned from `fx-list.json` before their module loads; a colophon with the docs and
  engine links. The toolbar: the palette picked from a panel showing every palette's colors (arrow keys recolor as
  they browse), a die for a random seed, Flip, Cast and Hit-stop as toggles, the backgrounds as their colors. A top
  view in View now wins over the cast: the 12 effects with one play it on their own, whether the cast is on or not
  (before, only with both characters off); cards say "top view", and View is hidden where none can play.
- **Gallery: frame by frame**: a preview has a pause button and a slider under its stage, to hold any frame of the
  effect, move or stage (arrow keys step one frame) with its number and time; palette, seed and flip recolor the held
  frame, and play goes on from it.
- **Props on the stage**: `meta.stage.scenery` names a set piece the stage draws behind a prop: the torch's flame
  sits on a wall sconce, the arc jumps between two terminal posts, the ripple spreads on a pool level with the floor
  (in the effect's own colors), the wall slide scrapes down a brick wall (`wall`). The arc and the ripple stand clear of the caster and no longer sink into the floor,
  and props are there from the stage's first frame, without the 0.4 s an acted effect waits.
- **`fire/torch` at the cast's scale**: the flame is 15 px tall, not 30 (a third of a 40 px character, not three
  quarters), on a 24x32 canvas instead of 32x48, its tongues, glow and embers scaled with it. The Unity demo keeps its
  older export until it is re-exported with Unity 6000.3.
- **Frost burst on the target**: `magic/frost-burst` bursts from the ground under the goblin (`stage: { at: 'target',
  ground: 0 }`), the mage pointing it there, not at the mage's own feet. A move's step can place its effect over its
  `meta.stage` (`{ fx, on, opts, stage }`): Frost nova's glints hang round the goblin with it.
- **A slime** takes the hits in the goblin's place when picked under Cast in the gallery (`?foe=slime`), or with
  `createStage(steps, o, show, { foe: 'slime' })` and `render.mjs --stage <id> --foe slime`. Shaded like jelly, it
  recolors with any ramp (`{ tint: { slime: 'ice' } }`, `--tint ice`: `tinted()` in `src/stage/actors.js`), its eyes
  and blush kept. Its sheet has idle, move, windup, attack, hurt and death. The Characters page lists the casters and
  the monsters apart.
- **More moves**: Shock arrow (archer), Tidal bolt and Hex (mage), Smite (priest), so every caster and the water,
  shadow, electric and holy effects play in one.
- **Gallery ground**: a `ground` background, the default, like pixelfx's: a stone floor under the actors' feet (or
  under an effect alone, as high as the stage would act it), level from card to card, filling each card edge to edge.
  `?bg=dark` is the flat one. `composite()` takes a background image as well as a color.
- **A palette per character**: `src/stage/cast.js` exports `PALETTES[name]` in place of the cast's one `PALETTE`, so
  each character has 89 colors of its own and the cast can grow past six. The stage draws the same pixels.
- **12 new statuses**, each a loop with sound. On the body: `frozen` (an ice crust), `shocked` (arcs crawling over
  it), `soaked` (drips into a puddle), `bleeding` (spurts on a heartbeat), `gassed` (coughing fits through a haze),
  `marked` (a reticle that locks on the chest; the archer acts it). Over the head: `asleep`, `confused`, `silenced`,
  `enraged`, `suppressed` (rounds whizzing just over it). On the caster: the `haste` buff. Two moves pair them: Soak
  and shock (a water bolt soaks the goblin, then lightning finds it wet) and Deep freeze (an ice orb, then frozen).

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
