extends Node
class_name Async

static func condition(cond: Callable, timeout: float = 10.0) -> Error:
	var deadline := Time.get_ticks_msec() + int(timeout * 1000)
	var tree := Engine.get_main_loop() as SceneTree

	while not cond.call():
		await tree.process_frame
		if Time.get_ticks_msec() > deadline:
			return ERR_TIMEOUT
	return OK
