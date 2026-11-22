# grittyfx for Unity

`com.grittyfx` plays grittyfx bundles in Unity 6 with URP (2D or Universal renderer). Each effect is one
SpriteRenderer drawn by a palette lookup shader, so you can recolor every instance at runtime. Hits and sound are
wired up.

## Install

Package Manager > **+** > *Add package from git URL*:

```
https://github.com/JustGritt/grittyfx.git?path=engines/unity/com.grittyfx
```

The package depends on URP (`com.unity.render-pipelines.universal`) and on 2D Sprite. Its shader only renders under
URP: it is pink in the Built-in pipeline.

## Add effects

Put bundles anywhere under `Assets/`. `tools/export.mjs` writes them to `Assets/GrittyFx/<category>/<name>/`. A
bundle is four files: `<name>.json`, `<name>_data.png`, `<name>_pal.png` and `<name>.png`. The importer generates
three assets next to them:

- `<name>.prefab`: a SpriteRenderer with the palette material, plus `GrittyFxPlayer`
- `<name>.mat`: the `GrittyFx/Palette` shader with the bundle's palette
- `<name>.anim`: the frames, with an `OnGrittyFxHit` AnimationEvent at each hit, for Animator and Timeline

The files can arrive in any order. When you export again, the files are overwritten in place, and the prefab and
sprites keep their ids, so references in your scenes still work.

## Play

```csharp
var fx = Instantiate(hitSparkPrefab, position, Quaternion.identity); // plays on Start; the pivot lands on position
fx.flip = facingLeft;                // mirrors about the pivot
fx.gain = 1.5f;                      // light intensity, on top of the bundle's light_gain
fx.OnHit += (index, freeze, shake) => { GrittyFx.HitStop(freeze); cameraShake.Add(shake); };
fx.OnFinished += () => Debug.Log("done");
torch.Stop();                        // fades out over 0.3 s, then destroys the object
```

`GrittyFxPlayer` keeps its own clock, matching `runtime/sheet-player.js` frame for frame. The frame shown is
`floor(t * fps)`. A hit fires when its frame first shows, frame-0 hits fire on Play, and hits on skipped frames still
fire, in order. At the end of a one-shot, `end: "remove"` destroys the GameObject and `"hold"` keeps the last frame.
Both raise `OnFinished` once. Loops never finish on their own. The player runs on `Time.deltaTime`, so hit-stop
freezes it too. To drive time yourself, turn off `playOnStart` and call `Play()` and `Step(dt)`.

To use the clip with an Animator instead, turn off `playOnStart` and add an Animator that plays `<name>.anim`. The
player receives the clip's `OnGrittyFxHit` events and raises `OnHit` from them. A receiver of your own takes an
`AnimationEvent` with `intParameter` = hit index, `floatParameter` = freeze and `stringParameter` = shake.

## Recolor

Recoloring one instance leaves the others alone: the colors go through a MaterialPropertyBlock.

```csharp
fx.SetRamp("palette", iceColors);    // Color32[]; resampled to the ramp's steps exactly like fit() in color.js
fx.SetPalette(otherBundlePalette);   // a whole 256 x 1 table, e.g. another bundle's _pal.png; null restores the default
```

Ramp names come from the bundle's `meta.grittyfx.ramps` (`palette`, `smoke`, ...). A palette texture you make
yourself must be imported like `_pal.png`: sRGB off, point filter, uncompressed, and readable if you call `SetRamp`
on top of it.

## Hit-stop

`GrittyFx.HitStop(freeze)` sets `Time.timeScale` to 0 and restores the previous scale after `freeze` real seconds.
A second call during a freeze extends it to the later end. It doesn't stack, and it never restores 0.

## Import settings, and why

The data sheet isn't an image. Each pixel holds R = color index, G = color alpha, B = light index and A = light
intensity, and any processing corrupts those bytes. So the importer sets these on `_data.png` every time it imports:

- **sRGB off.** An sRGB decode would change the indices.
- **Point filter, no mipmaps, no compression, no NPOT scaling, max size 16384.** Filtering blends neighbouring
  indices, and compression or resizing changes the bytes.
- **Alpha is transparency off.** Its border dilation rewrites RGB wherever A is 0, and A is only the light intensity.
- **Sprite, Multiple, Full Rect mesh.** The sprites are sliced from the JSON with the bundle's pivot. A tight mesh
  would cut off pixels whose A is 0.
- **16 pixels per unit**, set only the first time. Change it on the texture and the importer keeps your value.

The palette gets sRGB off, point filter, clamp, no compression and Read/Write on (`SetRamp` copies it).

Keep data sheets out of Sprite Atlases: packing would resample or re-pad them.

## Color space

The shader reproduces the browser's `composite()` math in sRGB values, then blends premultiplied
(`Blend One OneMinusSrcAlpha`), so light still adds where color alpha is 0.

- **Gamma color space:** matches the browser within 1/255 on any background. Measured: 1/255 at most, on all three
  reference effects, over black and over mid gray.
- **Linear color space** (the URP default, used by the demo): the shader converts its result to linear, so it's
  exact over black and on opaque pixels. Measured: 1/255 at most over black. Translucent edges and glow over a lit
  background blend in linear light, so they look dimmer than in the browser. Measured over mid gray: up to 79/255
  on the brightest glow pixels, and 4 to 12/255 on average. If you want more glow, raise `gain`.

HDR on or off makes no measurable difference.

## Demo

Open `engines/unity/demo` with Unity 6000.3. The scene is `Assets/Demo/Demo.unity`: two torches (one recolored to
ice), and hit sparks and explosions re-triggered on a timer. They cycle through recolors, the hit sparks flip, and
each hit freezes the game and shakes the camera. Click to spawn an explosion. To refresh its bundles from the repo
root, run `node tools/export.mjs fire/torch impacts/hit-spark explosions/small-explosion --unity engines/unity/demo`.

The package's EditMode tests run in the demo (it lists `com.grittyfx` as testable):

```
Unity -batchmode -projectPath engines/unity/demo -runTests -testPlatform EditMode -testResults results.xml
```
