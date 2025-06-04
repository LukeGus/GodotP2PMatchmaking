extends Resource
class_name NetworkConnectionConfigs

@export var host_ip: String = "192.210.197.55"
@export var host_port: int = 8890
@export var game_id: String = ""

func _init(initial_host_ip: String = "192.210.197.55", initial_host_port: int = 8890):
	self.host_ip = initial_host_ip
	self.host_port = initial_host_port
	print("NetworkConnectionConfigs resource initialized with IP: %s, Port: %d" % [host_ip, host_port])
