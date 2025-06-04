extends Node
class_name NorayManager

enum Role { NONE, HOST, CLIENT }

signal oid_ready(oid: String)
signal request_host
signal request_join(host_oid: String)  

@export_category("UI")
@export var connect_ui: Control
@export var oid_display: LineEdit
@export var host_oid_input: LineEdit
@export var noray_join_button: Button
@export var noray_host_button: Button
@export var copy_oid_button: Button
@export var noray_address = "ip:port"
@export var game_scene_name = "res://scenes/Game.tscn"

var role = Role.NONE

func _ready():
	Noray.on_oid.connect(func(oid): oid_display.text = oid)
	Noray.on_connect_nat.connect(_handle_connect_nat)
	Noray.on_connect_relay.connect(_handle_connect_relay)
	
	if noray_join_button:
		noray_join_button.pressed.connect(join)
	if noray_host_button:
		noray_host_button.pressed.connect(host)
	if copy_oid_button:
		copy_oid_button.pressed.connect(copy_oid_to_clipboard)
	
	connect_to_noray()
	
	self.connect("request_host",  Callable(self, "_on_request_host"))
	self.connect("request_join", Callable(self, "_on_request_join"))

func connect_to_noray():
	var err = OK
	if noray_address.contains(":"):
		var parts = noray_address.split(":")
		var host = parts[0]
		var port = (parts[1] as String).to_int()
		err = await Noray.connect_to_host(host, port)
	else:
		err = await Noray.connect_to_host(noray_address)
	
	if err != OK:
		print("Failed to connect to Noray: %s" % error_string(err))
		return err
	
	Noray.register_host()
	await Noray.on_pid
	
	err = await Noray.register_remote()
	if err != OK:
		print("Failed to register remote address: %s" % error_string(err))
		return err
	
	emit_signal("oid_ready", oid_display.text)
	
	return OK

func _on_request_host() -> void:
	print("NorayManager got request_host → calling host()")
	host()

func _on_request_join(host_oid: String) -> void:
	print("NorayManager got request_join, host_oid =", host_oid)
	host_oid_input.text = host_oid
	join()

func disconnect_from_noray():
	Noray.disconnect_from_host()
	oid_display.clear()

func host_only():
	host()

func host():
	print("NorayManager: host() called.")
	if Noray.local_port <= 0:
		print("NorayManager: host() returning ERR_UNCONFIGURED because local_port <= 0")
		return ERR_UNCONFIGURED
	
	noray_join_button.disabled = true
	noray_host_button.disabled = true
	noray_host_button.text = "Waiting for user to join..."
	
	var err = OK
	var port = Noray.local_port
	print("Starting host on port %s" % port)
	
	var peer = ENetMultiplayerPeer.new()
	err = peer.create_server(port)
	if err != OK:
		print("Failed to listen on port %s: %s" % [port, error_string(err)])
		return err

	get_tree().get_multiplayer().multiplayer_peer = peer
	print("Listening on port %s" % port)
	
	while peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTING:
		await get_tree().process_frame
	
	if peer.get_connection_status() != MultiplayerPeer.CONNECTION_CONNECTED:
		OS.alert("Failed to start server!")
		return FAILED
	
	get_tree().get_multiplayer().server_relay = true
	
	role = Role.HOST
	connect_ui.hide()
	NetworkTime.start()

func join():
	print("NorayManager: join() called.")
	role = Role.CLIENT
	
	noray_join_button.disabled = true
	noray_host_button.disabled = true
	noray_join_button.text = "Joining..."
	
	Noray.connect_relay(host_oid_input.text)

func _handle_connect_nat(address: String, port: int) -> Error:
	var err = await _handle_connect(address, port)
	
	if err != OK and role != Role.HOST:
		print("NAT connect failed with reason %s, retrying with relay" % error_string(err))
		Noray.connect_relay(host_oid_input.text)
		err = OK

	return err

func _handle_connect_relay(address: String, port: int) -> Error:
	return await _handle_connect(address, port)

func _handle_connect(address: String, port: int) -> Error:
	if not Noray.local_port:
		return ERR_UNCONFIGURED

	var err = OK
	
	if role == Role.NONE:
		push_warning("Refusing connection, not running as client nor host")
		err = ERR_UNAVAILABLE
	
	if role == Role.CLIENT:
		var udp = PacketPeerUDP.new()
		udp.bind(Noray.local_port)
		udp.set_dest_address(address, port)
		
		print("Attempting handshake with %s:%s" % [address, port])
		err = await PacketHandshake.over_packet_peer(udp)
		udp.close()
		
		if err != OK:
			if err == ERR_BUSY:
				print("Handshake to %s:%s succeeded partially, attempting connection anyway" % [address, port])
			else:
				print("Handshake to %s:%s failed: %s" % [address, port, error_string(err)])
				
				noray_join_button.disabled = false
				noray_host_button.disabled = false
				noray_join_button.text = "Join Session"
				return err
		else:
			print("Handshake to %s:%s succeeded" % [address, port])

		var peer = ENetMultiplayerPeer.new()
		err = peer.create_client(address, port, 0, 0, 0, Noray.local_port)
		if err != OK:
			print("Failed to create client: %s" % error_string(err))
			return err

		get_tree().get_multiplayer().multiplayer_peer = peer
		
		await Async.condition(
			func(): return peer.get_connection_status() != MultiplayerPeer.CONNECTION_CONNECTING
		)
			
		if peer.get_connection_status() != MultiplayerPeer.CONNECTION_CONNECTED:
			print("Failed to connect to %s:%s with status %s" % [address, port, peer.get_connection_status()])
			get_tree().get_multiplayer().multiplayer_peer = null
			return ERR_CANT_CONNECT
		
		connect_ui.hide()
		
		NetworkTime.start()
		rpc_id(1, "startGameHost")
		startGameClient()

	if role == Role.HOST:
		var peer = get_tree().get_multiplayer().multiplayer_peer as ENetMultiplayerPeer
		
		err = await PacketHandshake.over_enet(peer.host, address, port)
		
		if err != OK:
			print("Handshake to %s:%s failed: %s" % [address, port, error_string(err)])
			return err
		print("Handshake to %s:%s concluded" % [address, port])

	return err

@rpc("any_peer")
func startGameHost():
	startGame()

func startGameClient():
	startGame()
	
func startGame():
	var scene = ResourceLoader.load(game_scene_name)
	get_tree().change_scene_to_packed(scene)

func copy_oid_to_clipboard() -> void:
	if oid_display and oid_display.text != "":
		DisplayServer.clipboard_set(oid_display.text)
		copy_oid_button.text = "Copied!"
		await get_tree().create_timer(1.0).timeout
		copy_oid_button.text = "Copy OID"
