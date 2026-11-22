class_name GrittyFx
extends Node2D
## Plays a grittyfx bundle: frames stepped from time, drawn through a palette lookup shader so each instance can be
## recolored, with the bundle's hits and sound. Set [member bundle] to the bundle's .json; its data sheet and palette
## are read from the same folder.

## A hit's frame was shown. [param index] is its position in the bundle's act.hits; hit-stop is the game's call
## (see [method hitstop]).
signal hit(index: int, freeze: float, shake: float)
## A one-shot reached its end, or [method stop] faded the effect out. Fires once per [method play].
signal finished

const FADE_OUT := 0.3
const SHADER := preload("gritty_fx.gdshader")

static var _hitstop: SceneTreeTimer

## The bundle's .json.
@export var bundle: JSON:
	set(value):
		bundle = value
		_load()
## A 256 x 1 palette replacing the bundle's for this instance; empty uses the bundle's. See [method set_ramp].
@export var palette: Texture2D:
	set(value):
		palette = value
		_apply()
## Multiplies the bundle's light gain.
@export var light_gain := 1.0:
	set(value):
		light_gain = value
		_apply()
## Mirrors the effect about its pivot.
@export var flip := false:
	set(value):
		flip = value
		queue_redraw()
## Plays when the node enters the tree.
@export var autoplay := true

## The frame on screen.
var frame := 0

var _mat := ShaderMaterial.new()
var _rects: Array[Rect2] = []
var _data: Texture2D
var _default_palette: Texture2D
var _sound: AudioStream
var _audio: AudioStreamPlayer2D
var _fps := 30.0
var _pivot := Vector2.ZERO
var _loop := false
var _end := "remove"
var _gain := 1.0
var _hits: Array = []
var _ramps: Array = []
var _t := 0.0
var _shown := -1
var _stop_at := -1.0
var _playing := false
var _finished := false


func _init() -> void:
	_mat.shader = SHADER
	material = _mat
	# The Compatibility renderer keeps one filter per texture, and the item's (Linear by default) would override the
	# shader's filter_nearest on the data sheet.
	texture_filter = TEXTURE_FILTER_NEAREST


func _ready() -> void:
	material = _mat  # duplicate() copied the original's material over ours
	if autoplay:
		play()


func _process(delta: float) -> void:
	advance(delta)


## Starts the effect from its first frame (again, if it was playing). Hits on frame 0 fire now.
func play() -> void:
	if _rects.is_empty():
		push_error("GrittyFx: no bundle to play")
		return
	_t = 0.0
	_shown = -1
	_stop_at = -1.0
	_playing = true
	_finished = false
	_mat.set_shader_parameter("fade", 1.0)
	queue_redraw()
	if _sound and is_inside_tree():
		if _audio == null:
			_audio = AudioStreamPlayer2D.new()
			add_child(_audio)
		_audio.stream = _sound
		_audio.play()
	advance(0.0)


## Fades color and light out over 0.3 s, then finishes and frees the node.
func stop() -> void:
	if _playing and _stop_at < 0.0:
		_stop_at = _t


## Moves the effect [param dt] seconds on; [method _process] calls it with each frame's delta.
func advance(dt: float) -> void:
	if not _playing:
		return
	_t += dt
	var n := _rects.size()
	var f := floori(_t * _fps + 1e-6)  # the epsilon absorbs float sums like 10 x 0.1 < 1
	var last := f if _loop else mini(f, n - 1)
	# Every hit frame reached since the last call, in order; one cycle at most for a loop.
	for k in range(maxi(_shown + 1, last - n + 1), last + 1):
		for i in _hits.size():
			if int(_hits[i].frame) == k % n:
				hit.emit(i, float(_hits[i].freeze), float(_hits[i].shake))
	_shown = maxi(_shown, last)
	if _stop_at >= 0.0:
		_mat.set_shader_parameter("fade", maxf(0.0, 1.0 - (_t - _stop_at) / FADE_OUT))
		if _t - _stop_at >= FADE_OUT - 1e-9:
			_remove()
			return
	if not _loop and f >= n:
		if _end != "hold":
			_remove()
			return
		if not _finished:
			_finished = true
			finished.emit()
	_show(last % n)


## Recolors this instance only: the bundle ramp [param ramp_name] becomes [param colors] (Colors or "#hex" strings),
## resampled to the ramp's length like [method fit]. Reads the palette back with get_image(): call it when spawning,
## not every frame.
func set_ramp(ramp_name: String, colors: Array) -> void:
	for r in _ramps:
		if r.name == ramp_name:
			var img: Image = (palette if palette else _default_palette).get_image().duplicate()
			img.convert(Image.FORMAT_RGBA8)
			img.clear_mipmaps()
			var bytes := img.get_data()
			var at := int(r.from)
			for c in fit(colors, int(r.steps)):
				for k in 4:
					bytes[at * 4 + k] = c[k]
				at += 1
			palette = ImageTexture.create_from_image(
				Image.create_from_data(img.get_width(), img.get_height(), false, Image.FORMAT_RGBA8, bytes)
			)
			return
	push_error("GrittyFx: no ramp named \"%s\" in %s" % [ramp_name, bundle.resource_path if bundle else "<no bundle>"])


## Resamples [param colors] (Colors or "#hex" strings) to [param n] [r, g, b, a] byte arrays, dark to bright,
## exactly like fit() in grittyfx's src/core/color.js.
static func fit(colors: Array, n: int) -> Array:
	var c := []
	for v in colors:
		var col := Color(v)
		c.append([col.r8, col.g8, col.b8, col.a8])
	if _luma(c[0]) > _luma(c[-1]):
		c.reverse()
	if n == 1:
		return [c[-1]]
	var out := []
	for i in n:
		var t := float(i * (c.size() - 1)) / (n - 1)
		if n <= c.size():
			out.append(c[floori(t + 0.5)])  # JavaScript's Math.round: halves round up
			continue
		var k := floori(t)
		var a: Array = c[k]
		var b: Array = c[mini(k + 1, c.size() - 1)]
		var px := []
		for j in 4:
			px.append(floori(a[j] + (b[j] - a[j]) * (t - k) + 0.5))
		out.append(px)
	return out


## Hit-stop: Engine.time_scale goes to 0 for [param freeze] real seconds, then back to what it was. A call during a
## hit-stop extends it to the later end; it never stacks.
static func hitstop(freeze: float) -> void:
	if freeze <= 0.0:
		return
	if _hitstop and _hitstop.time_left > 0.0:
		_hitstop.time_left = maxf(_hitstop.time_left, freeze)
		return
	_hitstop = (Engine.get_main_loop() as SceneTree).create_timer(freeze, true, false, true)
	_hitstop.timeout.connect(Callable(Engine, "set_time_scale").bind(Engine.time_scale))
	Engine.time_scale = 0.0


static func _luma(c: Array) -> float:
	return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


func _load() -> void:
	_rects.clear()
	if bundle == null:
		return
	var json = bundle.data
	if not (json is Dictionary and json.get("meta") is Dictionary and json.meta.get("grittyfx") is Dictionary):
		push_error("GrittyFx: %s is not a grittyfx bundle" % bundle.resource_path)
		return
	var g: Dictionary = json.meta.grittyfx
	var dir := bundle.resource_path.get_base_dir()
	_data = load(dir.path_join(g.data))
	_default_palette = load(dir.path_join(g.palette))
	var sound = g.get("sound")
	_sound = load(dir.path_join(sound)) if sound is String and ResourceLoader.exists(dir.path_join(sound)) else null
	_fps = float(g.fps)
	_pivot = Vector2(g.pivot[0], g.pivot[1])
	_loop = g.loop or g.end == "loop"
	_end = g.end
	_gain = float(g.get("light_gain", 1.0))
	_hits = g.act.get("hits", []) if g.get("act") is Dictionary else []
	_ramps = g.get("ramps", [])
	for f in json.frames:
		var r: Dictionary = f.frame
		_rects.append(Rect2(r.x, r.y, r.w, r.h))
	_mat.set_shader_parameter("data", _data)
	_apply()


func _apply() -> void:
	_mat.set_shader_parameter("palette", palette if palette else _default_palette)
	_mat.set_shader_parameter("light_gain", _gain * light_gain)


func _show(i: int) -> void:
	if i != frame:
		frame = i
		queue_redraw()


func _remove() -> void:
	_playing = false
	if not _finished:
		_finished = true
		finished.emit()
	queue_free()


func _draw() -> void:
	if not _playing or frame >= _rects.size():
		return
	# Mirroring with a -1 scale keeps it about the pivot: local pixel x lands on -x - 1.
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(-1.0 if flip else 1.0, 1.0))
	draw_texture_rect_region(_data, Rect2(-_pivot, _rects[frame].size), _rects[frame])
