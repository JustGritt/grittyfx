using System;
using System.Runtime.CompilerServices;
using UnityEngine;

[assembly: InternalsVisibleTo("GrittyFx.Tests")]

public static class GrittyFx
{
    static HitStopTimer s_HitStop;

    /// <summary>
    /// Freezes the game (Time.timeScale = 0) for `freeze` real seconds, then restores the previous scale. A call
    /// while a freeze runs extends it to the later end; it never stacks or restores the wrong scale.
    /// </summary>
    public static void HitStop(float freeze)
    {
        if (!s_HitStop)
        {
            var go = new GameObject("GrittyFx HitStop") { hideFlags = HideFlags.HideInHierarchy };
            UnityEngine.Object.DontDestroyOnLoad(go);
            s_HitStop = go.AddComponent<HitStopTimer>();
        }
        s_HitStop.Freeze(freeze, Time.unscaledTime);
    }

    /// <summary>
    /// Resamples a ramp to `n` steps, dark to bright, exactly like fit() in src/core/color.js: reversed if it
    /// starts brighter than it ends; fewer steps pick existing colors, more interpolate.
    /// </summary>
    public static Color32[] Fit(Color32[] r, int n)
    {
        if (r == null || r.Length == 0) throw new ArgumentException("GrittyFx.Fit: expected at least one color");
        if (Luma(r[0]) > Luma(r[r.Length - 1]))
        {
            r = (Color32[])r.Clone();
            Array.Reverse(r);
        }
        if (n == 1) return new[] { r[r.Length - 1] };
        var o = new Color32[n];
        for (int i = 0; i < n; i++)
        {
            double t = (double)(i * (r.Length - 1)) / (n - 1);
            if (n <= r.Length)
            {
                o[i] = r[Round(t)];
                continue;
            }
            int k = (int)Math.Floor(t);
            Color32 a = r[k], b = r[Math.Min(k + 1, r.Length - 1)];
            double u = t - k;
            o[i] = new Color32(Lerp(a.r, b.r, u), Lerp(a.g, b.g, u), Lerp(a.b, b.b, u), Lerp(a.a, b.a, u));
        }
        return o;
    }

    static double Luma(Color32 c) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

    // JS Math.round: halves round up, not to even (values here are never negative).
    static int Round(double v) => (int)Math.Round(v, MidpointRounding.AwayFromZero);

    static byte Lerp(byte a, byte b, double u) => (byte)Round(a + (b - a) * u);
}

sealed class HitStopTimer : MonoBehaviour
{
    float _end = -1, _scale = 1;

    internal void Freeze(float freeze, float now)
    {
        if (_end < 0) _scale = Time.timeScale;
        _end = Mathf.Max(_end, now + freeze);
        Time.timeScale = 0;
    }

    internal void Tick(float now)
    {
        if (_end < 0 || now < _end) return;
        _end = -1;
        Time.timeScale = _scale;
    }

    void Update() => Tick(Time.unscaledTime);

    void OnDestroy() => Tick(float.PositiveInfinity);
}
