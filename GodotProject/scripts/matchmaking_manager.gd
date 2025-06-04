extends Node

signal request_host
signal request_join(host_oid: String)

@export var noray_manager: Node
@export var websocket_url := "ws://ip:port"
@export var matchmake_button: Button
@export var cancel_button: Button

var websocket := WebSocketPeer.new()
var current_oid: String = ""
var is_matchmaking := false

func _ready():
	if noray_manager:
		noray_manager.connect("oid_ready", Callable(self, "_on_oid_ready"))
	else:
		push_error("NorayManager node not assigned in inspector!")

	if matchmake_button:
		matchmake_button.pressed.connect(send_oid_to_matchmaker)
	else:
		push_error("Matchmake button not assigned in inspector!")

	if cancel_button:
		cancel_button.pressed.connect(cancel_matchmaking)
		cancel_button.disabled = true
	else:
		push_error("Cancel button not assigned in inspector!")

	var err = websocket.connect_to_url(websocket_url)
	if err != OK:
		push_error("Failed to connect to websocket: %d" % err)
		set_process(false)
	else:
		set_process(true)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if is_matchmaking:
			cancel_matchmaking()
		websocket.close()
		get_tree().quit()

func _process(delta):
	websocket.poll()

	while websocket.get_available_packet_count() > 0:
		var pkt = websocket.get_packet()
		var msg_str = pkt.get_string_from_utf8()
		_process_ws_message(msg_str)

func _process_ws_message(msg: String) -> void:
	print("Received from server:", msg)
	var json = JSON.new()
	var result = json.parse(msg)
	if result != OK:
		print("Invalid JSON message:", msg)
		reset_matchmaking_state()
		return

	var data = json.get_data()
	if not data.has("type"):
		print("Malformed message, missing type:", msg)
		reset_matchmaking_state()
		return
		
	if data.type == "match":
		is_matchmaking = false
		cancel_button.disabled = true
		if data.role == "host":
			noray_manager.emit_signal("request_host")
		elif data.role == "client" and data.has("host_oid"):
			noray_manager.emit_signal("request_join", data.host_oid)
	elif data.type == "cancel_confirm":
		reset_matchmaking_state()

func _on_oid_ready(oid: String) -> void:
	print("Received OID from NorayManager:", oid)
	current_oid = oid

func send_oid_to_matchmaker() -> void:
	if websocket.get_ready_state() != WebSocketPeer.STATE_OPEN:
		print("WebSocket not connected!")
		return

	if current_oid == "":
		print("OID not ready yet!")
		return

	matchmake_button.disabled = true
	matchmake_button.text = "Matchmaking..."
	cancel_button.disabled = false
	is_matchmaking = true

	var msg = {
		"type": "join",
		"oid": current_oid,
	}
	var json_msg = JSON.stringify(msg)
	print("Sending JSON to matchmaker:", json_msg)
	websocket.send_text(json_msg)

func cancel_matchmaking() -> void:
	if not is_matchmaking:
		return
		
	var msg = {
		"type": "cancel",
		"oid": current_oid,
	}
	var json_msg = JSON.stringify(msg)
	websocket.send_text(json_msg)
	
	reset_matchmaking_state()

func reset_matchmaking_state() -> void:
	is_matchmaking = false
	matchmake_button.disabled = false
	matchmake_button.text = "Start Matchmaking"
	cancel_button.disabled = true
