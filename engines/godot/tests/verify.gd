extends SceneTree
## Headless checks of the grittyfx addon against the three reference bundles. From the repo root:
##   node tools/export.mjs fire/torch impacts/hit-spark explosions/small-explosion --godot engines/godot
##   godot --headless --path engines/godot --import
##   godot --headless --path engines/godot --script res://tests/verify.gd
## Prints a PASS or FAIL line per check and a summary, and exits with 1 if any check failed or didn't run.

const Fx := preload("res://addons/grittyfx/gritty_fx.gd")
const IDS := ["fire/torch", "impacts/hit-spark", "explosions/small-explosion"]
const RAW := {
	"compress/mode": 0,
	"mipmaps/generate": false,
	"process/fix_alpha_border": false,
	"process/premult_alpha": false,
	"detect_3d/compress_to": 0,
}
const DT := 1.0 / 60.0
# The _check calls of a full run. A script error ends only the function it happens in, silently skipping the
# checks after it there, so fewer than this means failure.
const CHECKS := 94

var _checks := 0
var _failed := 0
var _step := 0
var _events := PackedStringArray()


func _initialize() -> void:
	await _check_hitstop()  # first: the tree runs from then on, which _check_recolor needs
	var bundles := {}
	for id in IDS:
		var path: String = "res://grittyfx/%s/%s.json" % [id, id.get_file()]
		if _check(ResourceLoader.exists(path), "%s: bundle at %s" % [id, path]):
			bundles[id] = load(path)
	if bundles.size() == IDS.size():
		for id in IDS:
			_check_bundle(id, bundles[id])
		_check_loop_hits(bundles["fire/torch"])
		_check_stop(bundles["impacts/hit-spark"], bundles["fire/torch"])
		_check_recolor(bundles["impacts/hit-spark"])
		_check_sound_play(bundles["fire/torch"])
	_check_fit()
	var ok := _failed == 0 and _checks == CHECKS
	print("%s: %d of %d check(s) ran, %d failed" % ["PASS" if ok else "FAIL", _checks, CHECKS, _failed])
	quit(0 if ok else 1)


func _check(ok: bool, what: String) -> bool:
	_checks += 1
	print(("PASS " if ok else "FAIL ") + what)
	if not ok:
		_failed += 1
	return ok


func _check_bundle(id: String, bundle: JSON) -> void:
	var g: Dictionary = bundle.data.meta.grittyfx
	for file in [g.data, g.palette]:
		_check_import(bundle.resource_path.get_base_dir().path_join(file))
	for dt in [DT, 0.05, 2.5 * int(g.frames) / float(g.fps)]:
		_check_timing(id, bundle, dt)
	_check_sound(id, bundle)


## The sound imports as long as the effect (within half a frame), looping exactly when the effect loops: the WAV's
## smpl chunk, read by the default import.
func _check_sound(id: String, bundle: JSON) -> void:
	var g: Dictionary = bundle.data.meta.grittyfx
	var path := bundle.resource_path.get_base_dir().path_join(str(g.get("sound", "")))
	var wav = load(path) if g.has("sound") and ResourceLoader.exists(path) else null
	if not _check(wav is AudioStreamWAV, "%s: sound %s imports" % [id, path]):
		return
	var want := int(g.frames) / float(g.fps)
	_check(absf(wav.get_length() - want) <= 0.5 / float(g.fps), "%s: sound is %f s long (want %f)" % [id, wav.get_length(), want])
	var mode: int = AudioStreamWAV.LOOP_FORWARD if g.loop or g.end == "loop" else AudioStreamWAV.LOOP_DISABLED
	_check(wav.loop_mode == mode, "%s: sound loop mode is %d (want %d)" % [id, wav.loop_mode, mode])


## In the tree, play() starts the sound on a child AudioStreamPlayer2D; stop() fades it with the effect.
func _check_sound_play(torch: JSON) -> void:
	var fx: Fx = Fx.new()
	fx.bundle = torch
	root.add_child(fx)  # autoplay
	var audio: AudioStreamPlayer2D = fx._audio
	_check(audio != null and audio.stream != null and audio.playing, "sound: plays from play()")
	fx.stop()
	_run(fx, DT, 9)
	var db: float = audio.volume_db if audio else 0.0
	_check(absf(db - linear_to_db(0.5)) < 0.01, "sound: half faded after 0.15 s of stop() (%f dB)" % db)
	_free(fx)


## The import settings, and the imported texture equals the PNG byte for byte.
func _check_import(path: String) -> void:
	var cfg := ConfigFile.new()
	_check(cfg.load(path + ".import") == OK, "%s.import exists" % path)
	for key in RAW:
		var v = cfg.get_value("params", key, null)
		var ok := typeof(v) == typeof(RAW[key]) and v == RAW[key]
		_check(ok, "%s: %s = %s (is %s)" % [path.get_file(), key, RAW[key], v])
	var raw := Image.new()
	raw.load_png_from_buffer(FileAccess.get_file_as_bytes(path))
	var tex: Texture2D = load(path)
	var img: Image = tex.get_image() if tex else null
	var same := img != null and not img.has_mipmaps() and img.get_format() == raw.get_format()
	_check(same and img.get_data() == raw.get_data(), "%s imports byte for byte" % path.get_file())


## Plays the effect (three cycles of a loop) in steps of dt and compares its events with _expected().
func _check_timing(id: String, bundle: JSON, dt: float) -> void:
	var g: Dictionary = bundle.data.meta.grittyfx
	var n := int(g.frames)
	var loop: bool = g.loop or g.end == "loop"
	var steps := ceili((3 if loop else 1) * n / float(g.fps) / dt) + 5
	var fx := _play(bundle)
	_run(fx, dt, steps)
	var want := _expected(g, dt, steps)
	var what := "%s, dt %.4f:" % [id, dt]
	_check(_events == want, "%s events %s (want %s)" % [what, ",".join(_events), ",".join(want)])
	if loop:
		_check(fx.frame == floori(steps * dt * float(g.fps) + 1e-6) % n, "%s loop wraps to frame %d" % [what, fx.frame])
	else:
		_check(fx.is_queued_for_deletion() == (g.end == "remove"), "%s freed at the end only when end is remove" % what)
	_free(fx)


## The spec's events for play() (update 0) then `steps` updates of dt, as "update:event". A hit fires on the first
## update whose frame, floor(k * dt * fps + 1e-6), reaches the hit's frame (every cycle for a loop); a one-shot
## finishes on the first update whose frame reaches the frame count. Same update: frame order, then hit index.
## (Doesn't model the one-cycle cap of a loop update longer than a cycle: _check_loop_hits covers that.)
func _expected(g: Dictionary, dt: float, steps: int) -> PackedStringArray:
	var n := int(g.frames)
	var per := dt * float(g.fps)
	var loop: bool = g.loop or g.end == "loop"
	var hits: Array = g.act.hits if g.has("act") else []
	var out := PackedStringArray()
	var at := 0  # every frame from the start, each on the first update that reaches it
	while ceili((at - 1e-6) / per) <= steps and (loop or at < n):
		for i in hits.size():
			if int(hits[i].frame) == at % n:
				out.append("%d:hit%d" % [ceili((at - 1e-6) / per), i])
		at += 1
	var end := ceili((n - 1e-6) / per)
	if not loop and end <= steps:
		out.append("%d:finished" % end)
	return out


## Loops fire their hits every cycle, and one update longer than a cycle fires at most one cycle's worth, in order.
func _check_loop_hits(torch: JSON) -> void:
	var hits := [
		{"frame": 0, "t": 0.0, "freeze": 0.05, "shake": 1.0},
		{"frame": 5, "t": 0.3, "freeze": 0.1, "shake": 2.0},
	]
	var looped := _variant(torch, {"act": {"hits": hits}})
	_check_timing("torch with hits", looped, DT)
	var g: Dictionary = looped.data.meta.grittyfx
	var fx := _play(looped)
	_run(fx, 2.5 * int(g.frames) / float(g.fps), 1)
	var want := PackedStringArray(["0:hit0", "1:hit0", "1:hit1"])
	_check(_events == want, "torch with hits: a 2.5-cycle update fires one cycle of hits: %s" % ",".join(_events))
	_free(fx)


## "hold" keeps the last frame; stop() fades color and light over 0.3 s, then finishes once and frees the node.
func _check_stop(spark: JSON, torch: JSON) -> void:
	var n := int(spark.data.meta.grittyfx.frames)
	var held := _play(_variant(spark, {"end": "hold"}))
	_run(held, DT, 60)
	var kept := held.frame == n - 1 and not held.is_queued_for_deletion()
	_check(kept and _count("finished") == 1, "hold: keeps the last frame, finished once")
	_check_fade("hold", held)
	var lit := _play(torch)
	_run(lit, DT, 30)
	_check_fade("torch", lit)


func _check_fade(what: String, fx: Fx) -> void:
	fx.stop()
	_run(fx, DT, 9)
	var fade: float = (fx.material as ShaderMaterial).get_shader_parameter("fade")
	_check(absf(fade - 0.5) < 1e-6, "%s: stop() is half faded after 0.15 s (fade %f)" % [what, fade])
	_run(fx, DT, 8)
	_check(not fx.is_queued_for_deletion(), "%s: still fading after 0.28 s" % what)
	_run(fx, DT, 2)
	_check(fx.is_queued_for_deletion() and _count("finished") == 1, "%s: freed after the fade, finished once" % what)


## set_ramp() rewrites one ramp, fit to its steps, of one instance's palette.
func _check_recolor(spark: JSON) -> void:
	var a := _play(spark)
	var b := _play(spark)
	var copy: Fx = a.duplicate()  # shares the material by reference until its _ready
	root.add_child(copy)
	var span: Dictionary = spark.data.meta.grittyfx.ramps[0]
	var colors := ["#000000", "#ff0000", "#ffffff"]
	var before := _palette(a)
	var want := before.duplicate()
	var at := int(span.from)
	for c in Fx.fit(colors, int(span.steps)):
		for k in 4:
			want[at * 4 + k] = c[k]
		at += 1
	a.set_ramp(span.name, colors)
	_check(_palette(a) == want, "recolor: set_ramp(\"%s\") writes that ramp and nothing else" % span.name)
	_check(b.palette == null and _palette(b) == before, "recolor: other instances keep their palette")
	_check(_palette(copy) == before, "recolor: so does a duplicate() of it")
	_free(a)
	_free(b)
	_free(copy)


## fit() against values from src/core/color.js: interpolation, a reversed list, n == 1, picking with halves up.
func _check_fit() -> void:
	var grays := []
	for i in 12:
		grays.append("#%02x%02x%02x" % [i * 17, i * 17, i * 17])
	var cases := [
		[
			["#000000", "#ff0000", "#ffffff"], 8,
			[[0, 0, 0, 255], [73, 0, 0, 255], [146, 0, 0, 255], [219, 0, 0, 255],
			[255, 36, 36, 255], [255, 109, 109, 255], [255, 182, 182, 255], [255, 255, 255, 255]],
		],
		[["#ffffff", "#808080", "#000000"], 1, [[255, 255, 255, 255]]],
		[
			grays, 5,
			[[0, 0, 0, 255], [51, 51, 51, 255], [102, 102, 102, 255], [136, 136, 136, 255], [187, 187, 187, 255]],
		],
		[
			["#ffffff", "#102030"], 4,
			[[16, 32, 48, 255], [96, 106, 117, 255], [175, 181, 186, 255], [255, 255, 255, 255]],
		],
	]
	for c in cases:
		var got := Fx.fit(c[0], c[1])
		_check(got == c[2], "fit to %d steps matches color.js: %s" % [c[1], got])


## hitstop(): time scale 0, extended (never shortened) by a call during it, then the previous scale back once.
func _check_hitstop() -> void:
	await process_frame
	await process_frame  # timers made now must not tick on a long startup frame
	Engine.time_scale = 0.5
	Fx.hitstop(0.2)
	_check(Engine.time_scale == 0.0, "hitstop: time scale is 0 during the freeze")
	Fx.hitstop(0.4)
	Fx.hitstop(0.1)
	await create_timer(0.25, true, false, true).timeout
	_check(Engine.time_scale == 0.0, "hitstop: a longer call extends the freeze, a shorter one doesn't cut it")
	await create_timer(0.3, true, false, true).timeout
	_check(Engine.time_scale == 0.5, "hitstop: restores the previous scale at the end (is %s)" % Engine.time_scale)
	Engine.time_scale = 1.0


func _play(bundle: JSON) -> Fx:
	var fx: Fx = Fx.new()
	fx.bundle = bundle
	fx.hit.connect(_on_hit)
	fx.finished.connect(_on_finished)
	_events.clear()
	_step = 0
	fx.play()
	return fx


func _run(fx: Fx, dt: float, steps: int) -> void:
	for i in steps:
		_step += 1
		fx.advance(dt)


func _free(fx: Fx) -> void:
	if not fx.is_queued_for_deletion():
		fx.free()


func _count(event: String) -> int:
	var count := 0
	for e in _events:
		if e.ends_with(":" + event):
			count += 1
	return count


func _palette(fx: Fx) -> PackedByteArray:
	var tex: Texture2D = (fx.material as ShaderMaterial).get_shader_parameter("palette")
	return tex.get_image().get_data()


## A copy of a bundle with some meta.grittyfx fields changed, beside the original so its sheets still load.
func _variant(bundle: JSON, changes: Dictionary) -> JSON:
	var v := JSON.new()
	v.data = bundle.data.duplicate(true)
	v.data.meta.grittyfx.merge(changes, true)
	v.take_over_path(bundle.resource_path.get_base_dir().path_join("variant.json"))
	return v


func _on_hit(index: int, _freeze: float, _shake: float) -> void:
	_events.append("%d:hit%d" % [_step, index])


func _on_finished() -> void:
	_events.append("%d:finished" % _step)
