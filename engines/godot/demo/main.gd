extends Node2D
## The three reference effects: a looping torch, and a hit spark and a small explosion re-triggered every 1.5 s.
## Hits freeze time with GrittyFx.hitstop and shake the camera. Keys: 1-4 recolor the effects' main ramp,
## 0 restores it, F flips, Space triggers now.

const RAMPS := {
	KEY_1: ["#0c1428", "#14305a", "#1c5288", "#2a7fb8", "#4fb0dc", "#8ad6ee", "#c4eef8", "#f2fcff"],  # ice
	KEY_2: ["#141028", "#1f2a2a", "#244420", "#3a6a1a", "#5e9418", "#8cc020", "#bfe24a", "#effc9a"],  # poison
	KEY_3: ["#140a24", "#2e1050", "#4f1a86", "#7a2cb8", "#a64ade", "#cc7cf2", "#eab4fc", "#fbe8ff"],  # arcane
	KEY_4: ["#3a2a14", "#6a5022", "#a07c30", "#d0aa44", "#f0d266", "#fcea98", "#fff8d0", "#ffffff"],  # holy
}

var _ramp: Array = []
var _flip := false
var _shake := 0.0
var _last := 0

@onready var _camera: Camera2D = $Camera2D
@onready var _help: Label = $UI/Help


func _ready() -> void:
	_spawn("fire/torch", Vector2(-100, 30))
	_trigger()
	var timer := Timer.new()
	timer.wait_time = 1.5
	timer.timeout.connect(_trigger)
	add_child(timer)
	timer.start()


func _trigger() -> void:
	_spawn("impacts/hit-spark", Vector2(-20, 10))
	_spawn("explosions/small-explosion", Vector2(80, 30))


func _spawn(id: String, at: Vector2) -> void:
	var path := "res://grittyfx/%s/%s.json" % [id, id.get_file()]
	if not ResourceLoader.exists(path):
		_help.text = "No bundle at %s. From the repo root:\nnode tools/export.mjs %s --godot engines/godot" % [path, id]
		return
	var fx := GrittyFx.new()
	fx.bundle = load(path) as JSON
	fx.position = at
	fx.hit.connect(_on_hit)
	_look(fx)
	add_child(fx)  # autoplay starts it


func _look(fx: GrittyFx) -> void:
	fx.flip = _flip
	fx.palette = null
	if not _ramp.is_empty():
		fx.set_ramp("palette", _ramp)


func _on_hit(_index: int, freeze: float, shake: float) -> void:
	GrittyFx.hitstop(freeze)
	_shake = maxf(_shake, shake)


func _process(_delta: float) -> void:
	# Real time, so the shake plays through the hit-stop, when delta is 0.
	var now := Time.get_ticks_msec()
	_shake = maxf(0.0, _shake - (now - _last) * 0.02)
	_last = now
	_camera.offset = Vector2(randf_range(-_shake, _shake), randf_range(-_shake, _shake)).round()


func _unhandled_input(event: InputEvent) -> void:
	var key := event as InputEventKey
	if key == null or not key.pressed or key.echo:
		return
	if key.keycode == KEY_SPACE:
		_trigger()
		return
	if key.keycode == KEY_F:
		_flip = not _flip
	elif key.keycode == KEY_0 or RAMPS.has(key.keycode):
		_ramp = RAMPS.get(key.keycode, [])
	else:
		return
	for child in get_children():
		if child is GrittyFx:
			_look(child as GrittyFx)
