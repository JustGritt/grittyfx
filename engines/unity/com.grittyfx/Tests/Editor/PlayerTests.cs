using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using EndMode = GrittyFxPlayer.EndMode;
using Hit = GrittyFxPlayer.Hit;

public class PlayerTests
{
    readonly List<string> _log = new();

    GrittyFxPlayer Make(int frames, float fps, EndMode end, params Hit[] hits)
    {
        var p = new GameObject("fx", typeof(SpriteRenderer)).AddComponent<GrittyFxPlayer>();
        p.frames = new Sprite[frames];
        p.fps = fps;
        p.end = end;
        p.hits = hits;
        p.OnHit += (i, freeze, shake) => _log.Add(System.FormattableString.Invariant($"hit {i} {freeze} {shake}"));
        p.OnFinished += () => _log.Add("finished");
        return p;
    }

    [SetUp]
    public void Clear() => _log.Clear();

    [TearDown]
    public void Cleanup()
    {
        foreach (var p in Object.FindObjectsByType<GrittyFxPlayer>(FindObjectsSortMode.None)) Object.DestroyImmediate(p.gameObject);
        Time.timeScale = 1;
    }

    [Test]
    public void FrameIsFloorOfTimeTimesFps()
    {
        var p = Make(14, 30, EndMode.Remove);
        p.Play();
        for (int k = 1; k <= 13; k++)
        {
            p.Step(1 / 30f);
            Assert.AreEqual(k, p.Frame, $"after {k} steps of 1/30 s");
        }
        var torch = Make(16, 16, EndMode.Loop);
        torch.Play();
        for (int k = 0; k < 60; k++) torch.Step(1 / 60f);
        Assert.AreEqual(0, torch.Frame, "one second of a 16-frame loop at 16 fps wraps to frame 0");
    }

    [Test]
    public void StartDoesNotReplayAnEffectAlreadyPlayed()
    {
        var p = Make(14, 30, EndMode.Remove, new Hit { frame = 0, freeze = 0.05f, shake = 4 });
        p.Play(); // right after Instantiate, with playOnStart on (the prefab default)
        typeof(GrittyFxPlayer).GetMethod("Start", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).Invoke(p, null);
        CollectionAssert.AreEqual(new[] { "hit 0 0.05 4" }, _log);
    }

    [Test]
    public void HitFiresWhenItsFrameIsFirstShown()
    {
        var p = Make(14, 30, EndMode.Remove, new Hit { frame = 1, freeze = 0.08f, shake = 2 });
        p.Play();
        p.Step(0.02f);
        CollectionAssert.IsEmpty(_log);
        p.Step(0.02f);
        CollectionAssert.AreEqual(new[] { "hit 0 0.08 2" }, _log);
        p.Step(0.02f);
        Assert.AreEqual(1, _log.Count);
    }

    [Test]
    public void FrameZeroHitsFireOnPlayAndSkippedHitsFireInOrder()
    {
        var p = Make(10, 30, EndMode.Remove, new Hit { frame = 0 }, new Hit { frame = 1 }, new Hit { frame = 3 });
        p.Play();
        CollectionAssert.AreEqual(new[] { "hit 0 0 0" }, _log);
        p.Step(0.2f);
        CollectionAssert.AreEqual(new[] { "hit 0 0 0", "hit 1 0 0", "hit 2 0 0" }, _log);
    }

    [Test]
    public void LoopsFireHitsEveryCycleButAtMostOneCyclePerStep()
    {
        var p = Make(4, 10, EndMode.Loop, new Hit { frame = 0 }, new Hit { frame = 2 });
        p.Play();
        p.Step(0.25f);
        p.Step(0.2f);
        CollectionAssert.AreEqual(new[] { "hit 0 0 0", "hit 1 0 0", "hit 0 0 0" }, _log);
        _log.Clear();
        p.Step(10.2f); // frames 5..106 pass: only the latest cycle (103..106 = frames 3, 0, 1, 2) fires, like sheet-player.js
        CollectionAssert.AreEqual(new[] { "hit 0 0 0", "hit 1 0 0" }, _log);
        Assert.IsTrue(p.Playing);
    }

    [Test]
    public void RemoveFinishesOnceAndDestroysAfterTheLastHit()
    {
        var p = Make(3, 10, EndMode.Remove, new Hit { frame = 2 });
        p.Play();
        p.Step(0.25f);
        Assert.AreEqual(2, p.Frame);
        Assert.IsTrue(p);
        p.Step(0.1f);
        CollectionAssert.AreEqual(new[] { "hit 0 0 0", "finished" }, _log);
        Assert.IsFalse(p, "the GameObject is destroyed");
    }

    [Test]
    public void HoldKeepsTheLastFrameAndFinishesOnce()
    {
        var p = Make(3, 10, EndMode.Hold);
        p.Play();
        p.Step(1);
        p.Step(1);
        CollectionAssert.AreEqual(new[] { "finished" }, _log);
        Assert.IsTrue(p);
        Assert.AreEqual(2, p.Frame);
    }

    [Test]
    public void LoopNeverFinishesOnItsOwn()
    {
        var p = Make(3, 10, EndMode.Loop);
        p.Play();
        for (int i = 0; i < 100; i++) p.Step(1.01f);
        CollectionAssert.IsEmpty(_log);
        Assert.IsTrue(p.Playing);
    }

    [Test]
    public void StopFadesOverAThirdOfASecondThenRemoves()
    {
        var p = Make(8, 10, EndMode.Loop);
        var sr = p.GetComponent<SpriteRenderer>();
        p.Play();
        p.Step(0.1f);
        p.Stop();
        p.Step(0.15f);
        Assert.AreEqual(0.5f, sr.color.a, 1e-4f);
        CollectionAssert.IsEmpty(_log);
        p.Step(0.15f);
        CollectionAssert.AreEqual(new[] { "finished" }, _log);
        Assert.IsFalse(p);
    }

    [Test]
    public void SoundPlaysWithTheEffectLoopsForALoopAndFadesWithStop()
    {
        var clip = AudioClip.Create("s", 22050, 1, 22050, false);
        var torch = Make(16, 16, EndMode.Loop);
        torch.sound = clip;
        torch.Play();
        var a = torch.GetComponent<AudioSource>();
        Assert.AreEqual((clip, true, 1f), (a.clip, a.loop, a.volume));
        torch.Stop();
        torch.Step(0.15f);
        Assert.AreEqual(0.5f, a.volume, 1e-4f, "half faded with the effect");
        torch.Play();
        Assert.AreEqual(1f, a.volume, "play() restores the volume");
        Assert.AreEqual(1, torch.GetComponents<AudioSource>().Length, "and reuses its AudioSource");

        var hit = Make(14, 30, EndMode.Remove);
        hit.sound = clip;
        hit.Play();
        Assert.IsFalse(hit.GetComponent<AudioSource>().loop);
        var silent = Make(14, 30, EndMode.Remove);
        silent.Play();
        Assert.IsFalse(silent.GetComponent<AudioSource>(), "no sound, no AudioSource");
        Object.DestroyImmediate(clip);
    }

    [Test]
    public void DirectionPicksTheRowOfATopDownBundle()
    {
        var tex = new Texture2D(16, 1);
        var p = Make(16, 10, EndMode.Loop, new Hit { frame = 1 });
        p.frames = Enumerable.Range(0, 16).Select(i => Sprite.Create(tex, new Rect(i, 0, 1, 1), Vector2.zero)).ToArray();
        p.directions = 8; // 2 frames per heading
        var sr = p.GetComponent<SpriteRenderer>();
        p.direction = new Vector2(0, -1); // world space, y up: south
        p.Play();
        Assert.AreSame(p.frames[2 * 2], sr.sprite);
        p.Step(0.1f);
        Assert.AreSame(p.frames[2 * 2 + 1], sr.sprite);
        CollectionAssert.AreEqual(new[] { "hit 0 0 0" }, _log, "hits count frames per heading");
        p.Step(0.1f);
        Assert.AreEqual(0, p.Frame, "the loop wraps after 2 frames, not 16");
        var rows = new[] { (1f, 0f, 0), (1f, -1f, 1), (-1f, -1f, 3), (-1f, 0f, 4), (-1f, 1f, 5), (0f, 1f, 6), (1f, 1f, 7), (1f, 0.4f, 0), (1f, 0.42f, 7) };
        foreach (var (x, y, row) in rows)
        {
            p.direction = new Vector2(x, y);
            Assert.AreEqual(row, p.Row, $"({x}, {y})");
        }
        p.Step(0.1f);
        Assert.AreSame(p.frames[7 * 2 + 1], sr.sprite);
        Object.DestroyImmediate(tex);
    }

    [Test]
    public void ClipEventsRaiseOnHit()
    {
        var p = Make(2, 10, EndMode.Remove);
        // Animation events call the method by name; SendMessage cannot run in edit mode.
        typeof(GrittyFxPlayer).GetMethod("OnGrittyFxHit", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            .Invoke(p, new object[] { new AnimationEvent { intParameter = 0, floatParameter = 0.05f, stringParameter = "3" } });
        CollectionAssert.AreEqual(new[] { "hit 0 0.05 3" }, _log);
    }

    [Test]
    public void FitMatchesColorJsRounding()
    {
        // Expected values from fit() in src/core/color.js.
        AssertFit(new[] { "#000000", "#202020", "#404040", "#606060", "#808080", "#a0a0a0" }, 3, 0, 96, 160); // pick 2.5 -> 3
        AssertFit(new[] { "#000000", "#050505" }, 3, 0, 3, 5); // lerp 2.5 -> 3, not banker's 2
        AssertFit(new[] { "#ffffff", "#000000" }, 3, 0, 128, 255); // reversed: brighter first
        Assert.AreEqual(new Color32(0, 255, 0, 255), GrittyFx.Fit(new[] { C("#ff0000"), C("#00ff00") }, 1)[0]);
        var r = GrittyFx.Fit(new[] { C("#102030"), C("#f0e0d0"), C("#ffffff") }, 6);
        Assert.AreEqual(new Color32(106, 109, 112, 255), r[1]);
        Assert.AreEqual(new Color32(249, 243, 236, 255), r[4]);
    }

    [Test]
    public void SetRampRecolorsOnlyThisInstance()
    {
        var shared = new Texture2D(256, 1, TextureFormat.RGBA32, false, true);
        var a = Make(2, 10, EndMode.Loop);
        var b = Make(2, 10, EndMode.Loop);
        foreach (var p in new[] { a, b })
        {
            p.palette = shared;
            p.ramps = new[] { new GrittyFxPlayer.Ramp { name = "palette", from = 1, steps = 3 } };
            p.Play();
        }
        var before = shared.GetPixels32();
        a.SetRamp("palette", C("#000000"), C("#ffffff"));
        var block = new MaterialPropertyBlock();
        a.GetComponent<SpriteRenderer>().GetPropertyBlock(block);
        var own = (Texture2D)block.GetTexture("_Palette");
        Assert.AreNotSame(shared, own);
        var px = own.GetPixels32();
        Assert.AreEqual(new Color32(128, 128, 128, 255), px[2]);
        Assert.AreEqual(before[0], px[0]);
        Assert.AreEqual(before[4], px[4]);
        CollectionAssert.AreEqual(before, shared.GetPixels32(), "the shared palette is untouched");
        b.GetComponent<SpriteRenderer>().GetPropertyBlock(block);
        Assert.IsFalse(block.HasTexture("_Palette"), "the other instance keeps the default");
        Object.DestroyImmediate(shared);
    }

    [Test]
    public void HitStopExtendsAndRestoresThePreviousScale()
    {
        var t = new GameObject("hitstop").AddComponent<HitStopTimer>();
        Time.timeScale = 0.5f;
        t.Freeze(0.1f, 0);
        Assert.AreEqual(0, Time.timeScale);
        t.Freeze(0.05f, 0.02f); // ends earlier: no change
        t.Tick(0.09f);
        Assert.AreEqual(0, Time.timeScale);
        t.Freeze(0.2f, 0.09f); // extends to 0.29, does not capture 0 as the scale to restore
        t.Tick(0.1f);
        Assert.AreEqual(0, Time.timeScale);
        t.Tick(0.3f);
        Assert.AreEqual(0.5f, Time.timeScale);
        Object.DestroyImmediate(t.gameObject);
    }

    static Color32 C(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? (Color32)c : default;

    static void AssertFit(string[] ramp, int n, params byte[] grays)
    {
        var r = GrittyFx.Fit(System.Array.ConvertAll(ramp, C), n);
        Assert.AreEqual(grays.Length, r.Length);
        for (int i = 0; i < n; i++) Assert.AreEqual(new Color32(grays[i], grays[i], grays[i], 255), r[i], $"step {i}");
    }
}
