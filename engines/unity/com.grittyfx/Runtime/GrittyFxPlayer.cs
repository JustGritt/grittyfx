using System;
using UnityEngine;

/// <summary>
/// Plays a grittyfx bundle on its SpriteRenderer, frame for frame like runtime/sheet-player.js: hits, end modes,
/// stop with a fade, flip, light gain, per-instance recolor, the sound (looped for a loop, on an AudioSource the player
/// adds unless the object has one) and, for a top-down bundle, the row of the heading. The importer fills the bundle
/// fields.
/// </summary>
[RequireComponent(typeof(SpriteRenderer))]
public sealed class GrittyFxPlayer : MonoBehaviour
{
    public enum EndMode { Remove, Hold, Loop }

    [Serializable]
    public struct Hit
    {
        public int frame;
        public float freeze, shake;
    }

    [Serializable]
    public struct Ramp
    {
        public string name;
        public int from, steps;
    }

    const double FadeOut = 0.3;
    static readonly int PaletteId = Shader.PropertyToID("_Palette"), GainId = Shader.PropertyToID("_Gain");

    [Header("Bundle")]
    public Sprite[] frames = Array.Empty<Sprite>();
    public float fps = 30;
    public EndMode end;
    public Hit[] hits = Array.Empty<Hit>();
    public Ramp[] ramps = Array.Empty<Ramp>();
    public Texture2D palette;
    public float lightGain = 1;
    public AudioClip sound;
    /// <summary>Rows of a top-down bundle, one per heading (E, SE, S, SW, W, NW, N, NE); frames holds them row by row.</summary>
    public int directions = 1;

    [Header("Instance")]
    public bool playOnStart = true;
    public bool flip;
    public float gain = 1;
    /// <summary>The heading in world space (y up, so (0, -1) is south); a top-down bundle shows the nearest of its rows.</summary>
    public Vector2 direction = Vector2.right;

    /// <summary>(index in act.hits, freeze seconds, shake pixels) when a hit's frame is first shown.</summary>
    public event Action<int, float, float> OnHit;
    public event Action OnFinished;

    public double Elapsed { get; private set; }
    public bool Playing { get; private set; }
    public int Frame { get; private set; }

    /// <summary>The row `direction` picks: round(screen angle / 45 degrees) mod 8, the screen's y down like the bundle's.</summary>
    public int Row
    {
        get
        {
            int d = Math.Max(1, directions), r = (int)Math.Floor(Math.Atan2(-direction.y, direction.x) * d / (2 * Math.PI) + 0.5) % d; // JS Math.round
            return r < 0 ? r + d : r;
        }
    }

    int Count => frames.Length / Math.Max(1, directions); // frames per direction

    int _shown;
    double _stopAt = -1;
    bool _finished;
    float _fade = 1;
    Texture2D _recolor, _own;
    MaterialPropertyBlock _block;
    AudioSource _audio;

    void Start()
    {
        if (playOnStart && !Playing) Play(); // a Play() called right after Instantiate already started it
    }

    void Update()
    {
        if (Playing) Step(Time.deltaTime);
    }

    void OnDestroy()
    {
        if (_own) Free(_own);
    }

    // The receiver of the generated clip's events, so OnHit also fires when an Animator or Timeline plays the clip.
    void OnGrittyFxHit(AnimationEvent e) =>
        OnHit?.Invoke(e.intParameter, e.floatParameter, float.Parse(e.stringParameter, System.Globalization.CultureInfo.InvariantCulture));

    public void Play()
    {
        Elapsed = 0;
        _shown = 0;
        _stopAt = -1;
        _finished = false;
        _fade = 1;
        Playing = true;
        Show(0);
        Fire(0);
        if (!sound) return;
        // An AudioSource ignores Time.timeScale, so hit-stop doesn't pause the sound. It lasts as long as the effect.
        if (!_audio && !TryGetComponent(out _audio)) _audio = gameObject.AddComponent<AudioSource>();
        _audio.clip = sound;
        _audio.loop = end == EndMode.Loop;
        _audio.volume = 1;
        _audio.Play();
    }

    /// <summary>Advances time by dt seconds; Update calls it with Time.deltaTime.</summary>
    public void Step(float dt)
    {
        if (!Playing) return;
        Elapsed += dt;
        int n = Count, f = (int)Math.Floor(Elapsed * fps + 1e-6);
        int last = end == EndMode.Loop ? f : Math.Min(f, n - 1);
        for (int g = Math.Max(_shown + 1, last - n + 1); g <= last; g++) Fire(g); // a loop fires its latest cycle at most
        _shown = Math.Max(_shown, last);
        if (_stopAt >= 0)
        {
            _fade = (float)Math.Max(0, 1 - (Elapsed - _stopAt) / FadeOut);
            if (_audio) _audio.volume = _fade;
            if (Elapsed - _stopAt >= FadeOut - 1e-9) { Finish(true); return; }
        }
        if (end != EndMode.Loop && f >= n)
        {
            Finish(end == EndMode.Remove);
            if (!Playing) return;
        }
        Show(end == EndMode.Loop ? f % n : Math.Min(f, n - 1));
    }

    /// <summary>Fades out over 0.3 s, sound included, then finishes and removes the effect.</summary>
    public void Stop()
    {
        if (Playing && _stopAt < 0) _stopAt = Elapsed;
    }

    /// <summary>Recolors this instance with a whole 256 x 1 palette (imported like a bundle's _pal.png: sRGB off), or null for the default.</summary>
    public void SetPalette(Texture2D table)
    {
        _recolor = table;
        ApplyBlock(GetComponent<SpriteRenderer>());
    }

    /// <summary>Recolors this instance's ramp `name` with `colors`, resampled to the ramp's steps like fit() in src/core/color.js.</summary>
    public void SetRamp(string name, params Color32[] colors)
    {
        var ramp = Array.Find(ramps, r => r.name == name);
        if (ramp.steps == 0) throw new ArgumentException($"GrittyFxPlayer.SetRamp: no ramp \"{name}\" in this bundle");
        var table = (_recolor ? _recolor : palette).GetPixels32();
        GrittyFx.Fit(colors, ramp.steps).CopyTo(table, ramp.from);
        if (!_own) _own = new Texture2D(256, 1, TextureFormat.RGBA32, false, true) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        _own.SetPixels32(table);
        _own.Apply(false);
        SetPalette(_own);
    }

    void Fire(int g)
    {
        for (int i = 0; i < hits.Length; i++)
            if (hits[i].frame == g % Count) OnHit?.Invoke(i, hits[i].freeze, hits[i].shake);
    }

    void Finish(bool remove)
    {
        if (!_finished)
        {
            _finished = true;
            OnFinished?.Invoke();
        }
        if (!remove) return;
        Playing = false;
        Free(gameObject);
    }

    // Edit-mode callers (tests, tools) cannot use Destroy.
    static void Free(UnityEngine.Object o)
    {
        if (Application.isPlaying) Destroy(o);
        else DestroyImmediate(o);
    }

    void Show(int i)
    {
        Frame = i;
        var sr = GetComponent<SpriteRenderer>();
        sr.sprite = frames[Row * Count + i];
        sr.flipX = flip;
        var c = sr.color;
        c.a = _fade; // the shader multiplies color alpha and light by it
        sr.color = c;
        ApplyBlock(sr);
    }

    void ApplyBlock(SpriteRenderer sr)
    {
        _block ??= new MaterialPropertyBlock();
        _block.Clear();
        if (_recolor) _block.SetTexture(PaletteId, _recolor);
        _block.SetFloat(GainId, lightGain * gain);
        sr.SetPropertyBlock(_block);
    }
}
