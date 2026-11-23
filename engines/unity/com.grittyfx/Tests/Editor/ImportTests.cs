using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

public class ImportTests
{
    const string Dir = "Assets/GrittyFxImportTest";

    // Two 4 x 3 frames side by side, pivot (1, 2), a hit at frame 1, held at the end.
    static string Json(int fps) =>
        @"{""frames"":[{""filename"":""0"",""frame"":{""x"":0,""y"":0,""w"":4,""h"":3}},{""filename"":""1"",""frame"":{""x"":4,""y"":0,""w"":4,""h"":3}}],
        ""meta"":{""size"":{""w"":8,""h"":3},""grittyfx"":{""id"":""test/t"",""fps"":" + fps + @",""frames"":2,""frameSize"":[4,3],""columns"":2,
        ""pivot"":[1,2],""loop"":false,""end"":""hold"",""data"":""t_data.png"",""palette"":""t_pal.png"",""sheet"":""t.png"",""sound"":""t.wav"",
        ""ramps"":[{""name"":""palette"",""from"":1,""steps"":8}],""light_gain"":1,""view"":""side"",""directions"":1,""mirror"":true,
        ""act"":{""hits"":[{""frame"":1,""t"":0.1,""freeze"":0.05,""shake"":3}]}}}}";

    [TearDown]
    public void Cleanup() => AssetDatabase.DeleteAsset(Dir);

    [Test]
    public void JsonArrivingAfterItsTexturesStillConfiguresSlicesAndGenerates()
    {
        Directory.CreateDirectory(Dir);
        File.WriteAllBytes($"{Dir}/t_data.png", Png(8, 3));
        File.WriteAllBytes($"{Dir}/t_pal.png", Png(256, 1));
        File.WriteAllBytes($"{Dir}/t.wav", Wav(2205));
        AssetDatabase.Refresh();
        File.WriteAllText($"{Dir}/t.json", Json(10));
        AssetDatabase.Refresh();

        var ti = (TextureImporter)AssetImporter.GetAtPath($"{Dir}/t_data.png");
        Assert.IsFalse(ti.sRGBTexture);
        Assert.IsFalse(ti.alphaIsTransparency);
        Assert.IsFalse(ti.mipmapEnabled);
        Assert.AreEqual(FilterMode.Point, ti.filterMode);
        Assert.AreEqual(TextureImporterCompression.Uncompressed, ti.textureCompression);
        Assert.AreEqual(TextureImporterNPOTScale.None, ti.npotScale);
        Assert.AreEqual(SpriteImportMode.Multiple, ti.spriteImportMode);
        var settings = new TextureImporterSettings();
        ti.ReadTextureSettings(settings);
        Assert.AreEqual(SpriteMeshType.FullRect, settings.spriteMeshType);
        var tex = AssetDatabase.LoadAssetAtPath<Texture2D>($"{Dir}/t_data.png");
        Assert.AreEqual(TextureFormat.RGBA32, tex.format);
        Assert.IsFalse(tex.isDataSRGB);
        Assert.AreEqual(1, tex.mipmapCount);

        var pal = (TextureImporter)AssetImporter.GetAtPath($"{Dir}/t_pal.png");
        Assert.IsFalse(pal.sRGBTexture);
        Assert.IsTrue(pal.isReadable);
        Assert.AreEqual(FilterMode.Point, pal.filterMode);
        Assert.AreEqual(TextureWrapMode.Clamp, pal.wrapMode);
        Assert.AreEqual(TextureImporterCompression.Uncompressed, pal.textureCompression);

        var sprites = AssetDatabase.LoadAllAssetsAtPath($"{Dir}/t_data.png").OfType<Sprite>().OrderBy(s => s.name).ToArray();
        CollectionAssert.AreEqual(new[] { "t_0", "t_1" }, sprites.Select(s => s.name));
        Assert.AreEqual(new Rect(4, 0, 4, 3), sprites[1].rect);
        Assert.AreEqual(new Vector2(1, 1), sprites[1].pivot, "pivot (1, 2) from the top-left is (1, 1) from the bottom-left");

        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{Dir}/t.prefab");
        var p = prefab.GetComponent<GrittyFxPlayer>();
        CollectionAssert.AreEqual(sprites, p.frames);
        Assert.AreEqual(10, p.fps);
        Assert.AreEqual(GrittyFxPlayer.EndMode.Hold, p.end);
        Assert.AreEqual(1, p.hits.Length);
        Assert.AreEqual((1, 0.05f, 3f), (p.hits[0].frame, p.hits[0].freeze, p.hits[0].shake));
        Assert.AreEqual(("palette", 1, 8), (p.ramps[0].name, p.ramps[0].from, p.ramps[0].steps));
        Assert.AreEqual(AssetDatabase.LoadAssetAtPath<Texture2D>($"{Dir}/t_pal.png"), p.palette);
        var sound = AssetDatabase.LoadAssetAtPath<AudioClip>($"{Dir}/t.wav");
        Assert.IsNotNull(sound);
        Assert.AreEqual(sound, p.sound, "the prefab gets its clip");
        Assert.AreEqual(0.1f, sound.length, 1e-4f);
        Assert.AreEqual(AudioCompressionFormat.PCM, ((AudioImporter)AssetImporter.GetAtPath($"{Dir}/t.wav")).defaultSampleSettings.compressionFormat);
        var mat = prefab.GetComponent<SpriteRenderer>().sharedMaterial;
        Assert.AreEqual("GrittyFx/Palette", mat.shader.name);
        Assert.AreEqual(p.palette, mat.GetTexture("_Palette"));

        var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>($"{Dir}/t.anim");
        var ev = AnimationUtility.GetAnimationEvents(clip).Single();
        Assert.AreEqual(("OnGrittyFxHit", 0, 0.05f, "3"), (ev.functionName, ev.intParameter, ev.floatParameter, ev.stringParameter));
        Assert.AreEqual(0.1f, ev.time, 1e-6f);
        var keys = AnimationUtility.GetObjectReferenceCurve(clip, AnimationUtility.GetObjectReferenceCurveBindings(clip).Single());
        CollectionAssert.AreEqual(new Object[] { sprites[0], sprites[1] }, keys.Select(k => k.value));
        Assert.AreEqual(0.2f, clip.length, 1e-6f, "a sprite clip holds its last key for one frame");

        // Re-export: the prefab and sprites keep their ids, so scene references survive.
        var guid = AssetDatabase.AssetPathToGUID($"{Dir}/t.prefab");
        AssetDatabase.TryGetGUIDAndLocalFileIdentifier(sprites[1], out _, out long spriteId);
        File.WriteAllText($"{Dir}/t.json", Json(20));
        AssetDatabase.Refresh();
        Assert.AreEqual(guid, AssetDatabase.AssetPathToGUID($"{Dir}/t.prefab"));
        Assert.AreEqual(20, AssetDatabase.LoadAssetAtPath<GameObject>($"{Dir}/t.prefab").GetComponent<GrittyFxPlayer>().fps);
        var again = AssetDatabase.LoadAllAssetsAtPath($"{Dir}/t_data.png").OfType<Sprite>().Single(s => s.name == "t_1");
        AssetDatabase.TryGetGUIDAndLocalFileIdentifier(again, out _, out long againId);
        Assert.AreEqual(spriteId, againId);
    }

    // Mono 16-bit PCM at 22050 Hz with a loop in a smpl chunk, like tools/sfx.mjs writes for a loop.
    static byte[] Wav(int n)
    {
        var s = new MemoryStream();
        var w = new BinaryWriter(s);
        void Tag(string t) => w.Write(System.Text.Encoding.ASCII.GetBytes(t));
        Tag("RIFF");
        w.Write(36 + 2 * n + 68);
        Tag("WAVEfmt ");
        w.Write(16);
        w.Write((short)1);
        w.Write((short)1);
        w.Write(22050);
        w.Write(44100);
        w.Write((short)2);
        w.Write((short)16);
        Tag("data");
        w.Write(2 * n);
        for (int i = 0; i < n; i++) w.Write((short)(System.Math.Sin(i * 0.25) * 8000));
        Tag("smpl");
        foreach (var v in new[] { 60, 0, 0, 45351, 60, 0, 0, 0, 1, 0, 0, 0, 0, n - 1, 0, 0 }) w.Write(v);
        return s.ToArray();
    }

    static byte[] Png(int w, int h)
    {
        var t = new Texture2D(w, h, TextureFormat.RGBA32, false, true);
        t.SetPixels32(Enumerable.Range(0, w * h).Select(i => new Color32((byte)i, (byte)(i * 7), 9, 0)).ToArray());
        var png = t.EncodeToPNG();
        Object.DestroyImmediate(t);
        return png;
    }
}
