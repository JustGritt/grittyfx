# grittyfx

Pixel-art effects written as code, recolorable at runtime in Godot, Unity and the browser.

Each effect is one small JavaScript file that draws pixels and glow from a palette. Bake it once into a sprite sheet,
then recolor it in the engine: the same explosion plays as fire, ice or poison, per instance, with no re-export.

> **Status: 1.0.** 30 effects in 11 categories, each with a synthesised sound, 9 of them with top-down views; a browser
> player, a Unity 6 package and a Godot 4 addon (not yet tested in Godot).

- [Gallery](https://justgritt.github.io/grittyfx/): every effect live, with recolor and hit-stop. Locally:
  `node tools/serve.mjs`, then open the printed URL. Turn on Stage to see each one acted out by a swordsman and a
  training dummy (`node tools/render.mjs --stage <id>` renders it).
- [Catalog](docs/CATALOG.md) of the effects; [authoring guide](docs/AUTHORING.md) to make your own.
- In JS: `npm i grittyfx` (types included), then `createFx` plays any effect live on a canvas, or
  `grittyfx/runtime/sheet-player` plays a baked bundle.
- Export to an engine: `node tools/export.mjs <ids> --godot <project> --unity <project>`, then see
  [engines/godot](engines/godot/README.md) or [engines/unity](engines/unity/README.md).

## Why

Code-drawn pixel effects already exist ([pixelfx](https://github.com/patch-gg/pixelfx) and its Unity and Godot
ports), but in an engine you pick between baked sheets with fixed colors and live drawing on the CPU. grittyfx bakes
sheets that stay recolorable.

## What it does

- **Recolor at runtime.** Sheets store palette indices and a small shader maps them to any color ramp: elements,
  enemy variants and team colors from one sheet, on the GPU.
- **Glow included.** Every pixel carries its own light, drawn in the same pass, so effects glow on any background.
- **Game feel built in.** Each effect comes with its hit timings (freeze, screen shake) and a synthesised sound, as
  signals in Godot and events in Unity.
- **Side view and top-down.** Directional effects bake 8 headings turned before rasterising, so pixels stay on the
  grid; radial ones get their own drawing from above. Players pick the row from the game's heading.
- **Any engine.** Every effect also exports as a plain sprite sheet with Aseprite-style JSON.
- **Make your own.** A Claude Code skill drafts new effects, renders them and refines them until they hold up.

## Install the Claude Code skill

In Claude Code:

```
/plugin marketplace add JustGritt/grittyfx
/plugin install grittyfx@grittyfx
```

Then ask for an effect: "an ice version of the torch", "a hit spark for my Godot game". The skill looks for an
existing effect first, then recolors or exports it, or draws a new one and refines it by eye. It needs Node 18 or
later.

## Roadmap

| version | what |
|---|---|
| 0.1 | the drawing core, render and check tools, three reference effects |
| 0.2 | Godot 4 addon, Unity 6 package, browser sheet player |
| 0.3 | Claude Code skill, gallery, twelve effects |
| 0.4 | top-down 8 directions, synthesised sound |
| 0.5 / 1.0 | a stage that acts effects out, 30 effects, TypeScript types, npm package |

Changes per version are in the [CHANGELOG](CHANGELOG.md).

## Feedback

Ideas and requests are welcome in the [issues](https://github.com/JustGritt/grittyfx/issues).

## Credits

grittyfx learns from [pixelfx](https://github.com/patch-gg/pixelfx) by Patch and
[beanfx](https://github.com/baenv/beanfx), and follows Hugo Duprez's method from
[How to make (good) pixel art effects with Claude](https://www.spritefusion.com/blog/how-to-make-good-pixel-art-effects-with-claude):
code is clay, trust your eyes, feed your references.

## License

MIT, see [LICENSE](LICENSE).
