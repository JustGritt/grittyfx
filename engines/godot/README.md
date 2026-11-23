# grittyfx for Godot 4

`addons/grittyfx` plays grittyfx bundles in Godot 4.3 or later: recolorable per instance, with their glow, hit
timings and sound. This folder is also a Godot project holding the addon, a demo (`demo/`) and headless checks
(`tests/`).

## Install

1. Copy `addons/grittyfx` into your project and enable **grittyfx** in Project Settings > Plugins.
2. Export bundles into the project from the grittyfx repo:
   `node tools/export.mjs fire/torch impacts --godot path/to/your/project`. Each lands in
   `res://grittyfx/<category>/<name>/`: `<name>.json`, `<name>_data.png`, `<name>_pal.png`, `<name>.png`, and
   `<name>.wav` when the effect has sound.

Keep a bundle's files together. Move the folder in Godot's FileSystem dock and scenes follow it. The node loads the
sheets by name from beside the `.json`, so an export that includes only selected scenes needs `grittyfx/*` in its
resource filter (the default, all resources, needs nothing).

## Use

Add a `GrittyFx` node and drop the bundle's `.json` on its **Bundle** property, or from code:

```gdscript
var fx := GrittyFx.new()
fx.bundle = preload("res://grittyfx/impacts/hit-spark/hit-spark.json")
fx.position = contact_point
fx.flip = facing_left
fx.hit.connect(func(index, freeze, shake): GrittyFx.hitstop(freeze))
add_child(fx)  # plays right away (autoplay)
```

- The pivot (feet, impact point, muzzle) lands on the node's position. `flip` mirrors about it.
- One-shots emit `finished` and free themselves (bundle end `remove`), or keep their last frame (`hold`). Loops play
  until `stop()`, which fades out over 0.3 s, then emits `finished` and frees the node.
- `hit(index, freeze, shake)` fires when a hit's frame is first shown, even if a long frame skipped it. `index` is the
  hit's position in the bundle's `act.hits`.
- `light_gain` scales the glow, for bright backgrounds.
- `play()` restarts; `advance(dt)` steps it by hand (it's what `_process` calls).
- A bundle with a sound (`meta.grittyfx.sound`) plays it from frame 0 on a child `AudioStreamPlayer2D` when `play()`
  runs in the tree. A loop's sound loops: its WAV carries a `smpl` loop chunk, which the default import (Loop Mode:
  Detect From WAV) reads, so leave that setting alone. `stop()` fades the sound with the effect, and freeing the node
  stops it. Hit-stop doesn't pause it, because audio ignores `Engine.time_scale`.

## Recolor

Per instance, other instances keep their colors:

```gdscript
fx.set_ramp("palette", ["#0c1428", "#2a7fb8", "#8ad6ee", "#f2fcff"])  # resampled to the ramp's length
fx.palette = preload("res://my_palette.png")                       # or a whole 256 x 1 palette
```

Ramp names are the bundle's (`meta.grittyfx.ramps`: `palette`, `smoke`, ...). `set_ramp` reads the palette back
from the GPU: call it when spawning, not every frame.

## Hit-stop

`GrittyFx.hitstop(freeze)` sets `Engine.time_scale` to 0 for `freeze` real seconds, then restores the previous scale.
A call during a hit-stop extends it to the later end instead of stacking. Camera shake is yours: `shake` is in
pixels (see `demo/main.gd`).

## Import settings

The data sheet is data, not an image: per pixel R is a color index, G its alpha, B a light index, A the light
intensity. Godot's default texture import would corrupt it: **Fix Alpha Border** rewrites R, G and B wherever A is
0 (everywhere without light), and **Detect 3D** would switch to VRAM compression and mipmaps. The plugin imports
every bundle's `_data.png` and `_pal.png` with:

| setting | value |
|---|---|
| `compress/mode` | Lossless |
| `mipmaps/generate` | off |
| `process/fix_alpha_border` | off |
| `process/premult_alpha` | off |
| `detect_3d/compress_to` | Disabled |

`tools/export.mjs` writes these `.import` files the first time it exports a bundle (never after: Godot keeps the
file's uid in them), so even a headless `--import` gets them right. The editor plugin also rewrites them and
reimports if a bundle arrives another way or they change. The shader samples both sheets with nearest filtering and
no color conversion. Leave the node's Texture Filter on Nearest: the Compatibility renderer (and so web exports)
applies it to the data sheet too.

Colors are blended in Godot's default 2D color space (sRGB), like the browser reference. With
`rendering/viewport/hdr_2d` on, blending happens in linear space and soft edges and glow look a little different.

## Demo and checks

From the repo root, with Godot 4 on the `PATH` as `godot`:

```sh
node tools/export.mjs fire/torch impacts/hit-spark explosions/small-explosion --godot engines/godot
godot --headless --path engines/godot --import
godot --headless --path engines/godot --script res://tests/verify.gd   # PASS/FAIL lines, exit 1 on failure
godot --path engines/godot                                             # the demo
```

The checks cover the import settings (and that each sheet imports byte for byte), hit and `finished` timing at
several frame steps, loops, `hold`, `stop()`, recolor (duplicates included), hit-stop and the sound (its length, loop
mode, playback and fade), and fail if a script error
kept any check from running. Rendering itself (the shader, flip, blending) is
not checked headless.
