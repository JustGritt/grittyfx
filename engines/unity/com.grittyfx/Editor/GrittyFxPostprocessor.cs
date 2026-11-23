using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

/// <summary>
/// Imports grittyfx bundles (name.json, name_data.png, name_pal.png, name.wav when it has sound): the data sheet and
/// palette as raw data, the data sheet sliced into frames from the JSON, the sound as PCM; then generates name.anim,
/// name.mat and name.prefab next to them (a top-down bundle with 8 directions gets a clip per heading, name_E.anim to
/// name_NE.anim, instead of name.anim). The files may arrive in any order: each import finds its bundle through the
/// JSON beside it. A top bundle (name_top.json) shares the side's name.wav.
/// </summary>
sealed class GrittyFxPostprocessor : AssetPostprocessor
{
    public const string HitFunction = "OnGrittyFxHit";
    const string ShaderPath = "Packages/com.grittyfx/Shaders/GrittyFxPalette.shader";
    static readonly string[] Headings = { "E", "SE", "S", "SW", "W", "NW", "N", "NE" };

    [Serializable] class Bundle { public Frame[] frames; public Meta meta; }
    [Serializable] class Frame { public Box frame; }
    [Serializable] class Box { public int x, y, w, h; }
    [Serializable] class Meta { public Box size; public Info grittyfx; }
    [Serializable] class Ramp { public string name; public int from, steps; }
    [Serializable] class Hit { public int frame; public float freeze, shake; }
    [Serializable] class Act { public Hit[] hits; }

    [Serializable]
    class Info
    {
        public string id, end, data, palette, sound;
        public float fps, light_gain;
        public int directions;
        public float[] pivot;
        public bool loop;
        public Ramp[] ramps;
        public Act act;
    }

    void OnPreprocessTexture()
    {
        var json = FindJson(assetPath);
        if (json == null) return;
        var b = Read(json);
        var file = Path.GetFileName(assetPath);
        context.DependsOnSourceAsset(json);
        var ti = (TextureImporter)assetImporter;
        if (file == b.meta.grittyfx.data)
        {
            if (ti.spriteImportMode != SpriteImportMode.Multiple) ti.spritePixelsPerUnit = 16; // first import only, so a project's own PPU sticks
            ti.textureType = TextureImporterType.Sprite;
            ti.spriteImportMode = SpriteImportMode.Multiple;
            var s = new TextureImporterSettings();
            ti.ReadTextureSettings(s);
            s.spriteMeshType = SpriteMeshType.FullRect; // a tight mesh would cut pixels whose alpha (light) is 0
            s.spriteGenerateFallbackPhysicsShape = false;
            ti.SetTextureSettings(s);
        }
        else
        {
            ti.textureType = TextureImporterType.Default;
            ti.isReadable = true; // SetRamp copies it
        }
        // Raw bytes: no sRGB decode, filtering, compression, mipmaps, resizing or alpha fixes.
        ti.sRGBTexture = false;
        ti.alphaIsTransparency = false;
        ti.filterMode = FilterMode.Point;
        ti.wrapMode = TextureWrapMode.Clamp;
        ti.mipmapEnabled = false;
        ti.npotScale = TextureImporterNPOTScale.None;
        ti.textureCompression = TextureImporterCompression.Uncompressed;
        ti.maxTextureSize = 16384;
        if (file == b.meta.grittyfx.data) Slice(ti, b, Path.GetFileNameWithoutExtension(json));
    }

    // PCM, the samples as synthesised: Vorbis would soften the attacks. A bundle's sound is a few dozen KB.
    void OnPreprocessAudio()
    {
        if (FindJson(assetPath) == null) return;
        var ai = (AudioImporter)assetImporter;
        var s = ai.defaultSampleSettings;
        s.compressionFormat = AudioCompressionFormat.PCM;
        s.loadType = AudioClipLoadType.DecompressOnLoad;
        ai.defaultSampleSettings = s;
    }

    static void Slice(TextureImporter ti, Bundle b, string name)
    {
        var factories = new SpriteDataProviderFactories();
        factories.Init();
        var dp = factories.GetSpriteEditorDataProviderFromObject(ti);
        dp.InitSpriteEditorDataProvider();
        var ids = new Dictionary<string, GUID>();
        foreach (var r in dp.GetSpriteRects()) ids[r.name] = r.spriteID; // keep sprite ids, so references survive a re-export
        var pivot = b.meta.grittyfx.pivot;
        var rects = b.frames.Select((f, i) => new SpriteRect
        {
            name = $"{name}_{i}",
            spriteID = ids.TryGetValue($"{name}_{i}", out var id) ? id : GUID.Generate(),
            rect = new Rect(f.frame.x, b.meta.size.h - f.frame.y - f.frame.h, f.frame.w, f.frame.h), // Unity's y is up
            alignment = SpriteAlignment.Custom,
            pivot = new Vector2(pivot[0] / f.frame.w, 1 - pivot[1] / f.frame.h),
        }).ToArray();
        dp.SetSpriteRects(rects);
        dp.GetDataProvider<ISpriteNameFileIdDataProvider>().SetNameFileIdPairs(rects.Select(r => new SpriteNameFileIdPair(r.name, r.spriteID)));
        dp.Apply();
    }

    static void OnPostprocessAllAssets(string[] imported, string[] deleted, string[] moved, string[] movedFrom)
    {
        foreach (var group in imported.Concat(moved).GroupBy(FindJson).Where(g => g.Key != null))
        {
            if (Generate(group.Key)) continue;
            // The JSON arrived after its textures (and sound): import them again now that they can be configured and sliced.
            if (group.Contains(group.Key))
            {
                var b = Read(group.Key);
                var dir = Path.GetDirectoryName(group.Key);
                foreach (var f in new[] { b.meta.grittyfx.data, b.meta.grittyfx.palette, b.meta.grittyfx.sound })
                    if (!string.IsNullOrEmpty(f) && File.Exists(Path.Combine(dir, f))) AssetDatabase.ImportAsset(Path.Combine(dir, f).Replace('\\', '/'), ImportAssetOptions.ForceUpdate);
            }
        }
    }

    /// <summary>Writes the clip, material and prefab; false while a file of the bundle is missing or not sliced yet.</summary>
    static bool Generate(string json)
    {
        var b = Read(json);
        var g = b.meta.grittyfx;
        var dir = Path.GetDirectoryName(json).Replace('\\', '/');
        var name = Path.GetFileNameWithoutExtension(json);
        var byName = AssetDatabase.LoadAllAssetsAtPath($"{dir}/{g.data}").OfType<Sprite>().ToDictionary(s => s.name);
        var sprites = b.frames.Select((_, i) => byName.GetValueOrDefault($"{name}_{i}")).ToArray();
        var palette = AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/{g.palette}");
        var shader = AssetDatabase.LoadAssetAtPath<Shader>(ShaderPath);
        if (sprites.Length == 0 || sprites.Any(s => !s) || !palette || !shader) return false;

        var hits = g.act?.hits ?? Array.Empty<Hit>();
        var loops = g.loop || g.end == "loop";
        // One clip, or one per heading of a top-down bundle (name_E.anim ... name_NE.anim), its row of the frames.
        var dirs = Math.Max(1, g.directions);
        var n = sprites.Length / dirs;
        for (int d = 0; d < dirs; d++)
        {
            var clip = LoadOrCreate(dirs > 1 ? $"{dir}/{name}_{Headings[d]}.anim" : $"{dir}/{name}.anim", () => new AnimationClip());
            clip.frameRate = g.fps;
            AnimationUtility.SetObjectReferenceCurve(clip, EditorCurveBinding.PPtrCurve("", typeof(SpriteRenderer), "m_Sprite"),
                sprites.Skip(d * n).Take(n).Select((s, i) => new ObjectReferenceKeyframe { time = i / g.fps, value = s }).ToArray());
            var settings = AnimationUtility.GetAnimationClipSettings(clip);
            settings.loopTime = loops;
            AnimationUtility.SetAnimationClipSettings(clip, settings);
            AnimationUtility.SetAnimationEvents(clip, hits.Select((h, i) => new AnimationEvent
            {
                time = h.frame / g.fps, functionName = HitFunction, intParameter = i, floatParameter = h.freeze,
                stringParameter = h.shake.ToString(CultureInfo.InvariantCulture),
            }).ToArray());
            AssetDatabase.SaveAssetIfDirty(clip);
        }

        var material = LoadOrCreate($"{dir}/{name}.mat", () => new Material(shader));
        material.shader = shader;
        material.SetTexture("_Palette", palette);
        material.SetFloat("_Gain", g.light_gain);
        AssetDatabase.SaveAssetIfDirty(material);

        var path = $"{dir}/{name}.prefab";
        var exists = File.Exists(path);
        var root = exists ? PrefabUtility.LoadPrefabContents(path) : new GameObject(name);
        var sr = Need<SpriteRenderer>(root);
        sr.sprite = sprites[0];
        sr.sharedMaterial = material;
        var p = Need<GrittyFxPlayer>(root);
        p.frames = sprites;
        p.fps = g.fps;
        p.end = loops ? GrittyFxPlayer.EndMode.Loop : g.end == "hold" ? GrittyFxPlayer.EndMode.Hold : GrittyFxPlayer.EndMode.Remove;
        p.hits = hits.Select(h => new GrittyFxPlayer.Hit { frame = h.frame, freeze = h.freeze, shake = h.shake }).ToArray();
        p.ramps = (g.ramps ?? Array.Empty<Ramp>()).Select(r => new GrittyFxPlayer.Ramp { name = r.name, from = r.from, steps = r.steps }).ToArray();
        p.palette = palette;
        p.lightGain = g.light_gain;
        p.directions = dirs;
        p.sound = string.IsNullOrEmpty(g.sound) ? null : AssetDatabase.LoadAssetAtPath<AudioClip>($"{dir}/{g.sound}");
        PrefabUtility.SaveAsPrefabAsset(root, path);
        if (exists) PrefabUtility.UnloadPrefabContents(root);
        else UnityEngine.Object.DestroyImmediate(root);
        return true;
    }

    /// <summary>The bundle JSON that `path` is, or that names it as its data sheet, palette or sound; else null.</summary>
    static string FindJson(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        if (ext == ".json") return Read(path) != null ? path : null;
        if (ext is not (".png" or ".wav" or ".ogg" or ".mp3")) return null;
        var file = Path.GetFileName(path);
        var dir = Path.GetDirectoryName(path);
        if (!Directory.Exists(dir)) return null;
        foreach (var json in Directory.GetFiles(dir, "*.json"))
        {
            var g = Read(json)?.meta.grittyfx;
            if (g != null && (file == g.data || file == g.palette || file == g.sound)) return json.Replace('\\', '/');
        }
        return null;
    }

    static Bundle Read(string json)
    {
        try
        {
            var text = File.ReadAllText(json);
            if (!text.Contains("\"grittyfx\"")) return null;
            var b = JsonUtility.FromJson<Bundle>(text);
            return string.IsNullOrEmpty(b?.meta?.grittyfx?.data) ? null : b;
        }
        catch (Exception) // not a JSON object, or not readable: not a bundle
        {
            return null;
        }
    }

    static T LoadOrCreate<T>(string path, Func<T> make) where T : UnityEngine.Object
    {
        var asset = AssetDatabase.LoadAssetAtPath<T>(path);
        if (!asset) AssetDatabase.CreateAsset(asset = make(), path);
        return asset;
    }

    static T Need<T>(GameObject go) where T : Component => go.TryGetComponent(out T c) ? c : go.AddComponent<T>();
}
