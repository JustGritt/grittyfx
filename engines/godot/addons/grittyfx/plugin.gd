@tool
extends EditorPlugin
## Keeps the data sheet and palette of every grittyfx bundle in the project imported as raw data, so a bundle that
## arrives without its .import files, or whose import settings get reset, still plays right.

## What a data sheet needs. Godot's defaults would fix alpha borders (rewriting R, G and B wherever A, the light,
## is 0) and switch to VRAM compression and mipmaps if the texture ever showed up in 3D.
const RAW := {
	"compress/mode": 0,  # lossless
	"mipmaps/generate": false,
	"process/fix_alpha_border": false,
	"process/premult_alpha": false,
	"detect_3d/compress_to": 0,  # disabled
}

var _busy := false


func _enter_tree() -> void:
	EditorInterface.get_resource_filesystem().filesystem_changed.connect(_check, CONNECT_DEFERRED)
	_check.call_deferred()


func _exit_tree() -> void:
	EditorInterface.get_resource_filesystem().filesystem_changed.disconnect(_check)


func _check() -> void:
	var fs := EditorInterface.get_resource_filesystem()
	if _busy or fs.is_scanning():
		return
	var wrong := PackedStringArray()
	_collect(fs.get_filesystem(), wrong)
	if wrong.is_empty():
		return
	_busy = true  # reimport_files runs the main loop while it works
	fs.reimport_files(wrong)
	_busy = false


func _collect(dir: EditorFileSystemDirectory, wrong: PackedStringArray) -> void:
	for i in dir.get_file_count():
		var path := dir.get_file_path(i)
		var json := path.trim_suffix("_data.png") + ".json"
		if path.ends_with("_data.png") and FileAccess.file_exists(json):
			var g := _grittyfx(json)
			if g.get("data", "") == path.get_file():
				for file in [g.data, g.palette]:
					var tex := path.get_base_dir().path_join(file)
					if _fix(tex):
						wrong.append(tex)
	for i in dir.get_subdir_count():
		_collect(dir.get_subdir(i), wrong)


func _grittyfx(json_path: String) -> Dictionary:
	var data = JSON.parse_string(FileAccess.get_file_as_string(json_path))
	if data is Dictionary and data.get("meta") is Dictionary and data.meta.get("grittyfx") is Dictionary:
		return data.meta.grittyfx
	return {}


## Writes RAW into the texture's .import file; true if anything had to change.
func _fix(path: String) -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(path + ".import") != OK:
		return false  # not imported yet: checked again once the scan has imported it
	var all: bool = cfg.get_value("remap", "importer", "") != "texture"
	var changed := all
	cfg.set_value("remap", "importer", "texture")
	for key in RAW:
		var v = cfg.get_value("params", key, null)
		# Only keys the importer wrote, so a key this Godot version doesn't know can't trigger a reimport every scan.
		if (all or cfg.has_section_key("params", key)) and (typeof(v) != typeof(RAW[key]) or v != RAW[key]):
			cfg.set_value("params", key, RAW[key])
			changed = true
	if changed:
		cfg.save(path + ".import")
	return changed
