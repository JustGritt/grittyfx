using UnityEngine;

/// <summary>
/// The three reference effects: two torches (one recolored to ice), hit sparks and explosions re-triggered on a timer
/// (recolored and flipped in turn) with hit-stop and a small camera shake on their hits. Click to spawn an explosion.
/// </summary>
public class GrittyFxDemo : MonoBehaviour
{
    const float PixelsPerUnit = 16, ShakeTime = 0.25f;

    public GrittyFxPlayer torch, hitSpark, explosion;
    public float every = 1.2f;

    static readonly string[][] Ramps =
    {
        null, // the bundle's own palette
        new[] { "#0c1428", "#14305a", "#1c5288", "#2a7fb8", "#4fb0dc", "#8ad6ee", "#c4eef8", "#f2fcff" }, // ice
        new[] { "#141028", "#1f2a2a", "#244420", "#3a6a1a", "#5e9418", "#8cc020", "#bfe24a", "#effc9a" }, // poison
        new[] { "#140a24", "#2e1050", "#4f1a86", "#7a2cb8", "#a64ade", "#cc7cf2", "#eab4fc", "#fbe8ff" }, // arcane
    };

    Camera _camera;
    Vector3 _home;
    float _next, _shake, _shakeEnd;
    int _count;

    void Start()
    {
        _camera = Camera.main;
        _home = _camera.transform.position;
        Spawn(torch, new Vector3(-8, -2), null, false);
        Spawn(torch, new Vector3(-5.5f, -2), Ramps[1], false);
    }

    void Update()
    {
        if (Time.time >= _next)
        {
            _next = Time.time + every;
            var ramp = Ramps[_count / 2 % Ramps.Length];
            if (_count++ % 2 == 0) Spawn(hitSpark, new Vector3(-1, -0.5f), ramp, _count % 4 == 1);
            else Spawn(explosion, new Vector3(5, -3), ramp, false);
        }
        if (Input.GetMouseButtonDown(0)) Spawn(explosion, (Vector2)_camera.ScreenToWorldPoint(Input.mousePosition), null, false);

        var k = Mathf.Clamp01((_shakeEnd - Time.unscaledTime) / ShakeTime);
        _camera.transform.position = _home + (Vector3)(Random.insideUnitCircle * (_shake * k / PixelsPerUnit));
    }

    void Spawn(GrittyFxPlayer prefab, Vector3 at, string[] ramp, bool flip)
    {
        var fx = Instantiate(prefab, at, Quaternion.identity);
        fx.flip = flip;
        if (ramp != null) fx.SetRamp("palette", System.Array.ConvertAll(ramp, Hex));
        fx.OnHit += (_, freeze, shake) =>
        {
            GrittyFx.HitStop(freeze);
            _shake = shake;
            _shakeEnd = Time.unscaledTime + ShakeTime;
        };
    }

    static Color32 Hex(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? (Color32)c : default;
}
