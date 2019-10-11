const log = require("./debug.js");
const parser = require("./parser.js");

class Player {
	constructor(client, server) {
		this.id = client.id;
		this.name = client.username;

		this.client = client;
		this.server = server;

		this.x = 7.5;
		this.y = 8.5;
		this.z = 7.5;

		this.pitch = 0;
		this.yaw = 0;
	}

	write(...data) {
		return this.client.write(...data);
	}

	broadcast(...data) {
		log("broadcasting '%s' packet from player %s", data[0], this.id);
		return Object.values(this.server.world.players).map(player => {
			if (player.id !== this.id) {
				return player.write(...data);
			}
		});
	}

	spawn() {
		const pos = Player.getPlayerPos(this.x, this.y, this.z);
		const data = {
			pitch: this.pitch,
			player_name: this.client.username,
			x: pos.x,
			y: pos.y,
			yaw: this.yaw,
			z: pos.z,
		};

		this.broadcast("spawn_player", {
			...data,
			player_id: this.id,
		});
		this.write("spawn_player", {
			...data,
			player_id: -1,
		});
	}

	sendMessage(message) {
		return this.write("message", {
			message,
			player_id: this.id,
		});
	}

	sendOutput(message, name) {
		name = name[0].toUpperCase() + name.slice(1);
		return this.sendMessage(`&9${name}: &7${message}`);
	}

	login() {
		this.server.world.sendWorld(this);
		this.spawn();

		this.server.broadcast("message", {
			message: `&9Join: &7${this.client.username} joined the game`,
			player_id: this.id,
		});

		this.client.on("message", ({ message }) => {
			if (message.startsWith("/")) {
				return parser.parse(message.slice(1), {
					...this,
					map: this.server.world.blocks,
					sendOutput: this.sendOutput.bind(this),
				});
			}

			this.server.broadcast("message", {
				message: `&e${this.client.username}: &7${message}`,
				player_id: this.id,
			});
		});

		this.client.on("position", position => {
			log("position update");

			this.x = position.x; // TODO: convert to block coordinates
			this.y = position.y;
			this.z = position.z;
			this.pitch = position.pitch;
			this.yaw = position.yaw;

			this.server.broadcast("player_teleport", {
				pitch: this.pitch,
				player_id: this.id,
				x: this.x,
				y: this.y,
				yaw: this.yaw,
				z: this.z,
			});
		});
		this.client.on("set_block", data => {
			if (data.mode === 0) {
				log("breaking block at (%d, %d, %d)", data.x, data.y, data.z);
			} else {
				log("placing block of type %s at (%d, %d, %d)", data.block_type, data.x, data.y, data.z);
			}
			this.server.world.setBlock(data.mode === 0 ? 0 : data.block_type, data.x, data.y, data.z);
		});
	}

	static getPlayerPos(x, y, z) {
		return {
			x: x * 32,
			y: y * 32 + 51,
			z: z * 32,
		};
	}

	static getPlayerCenterPos(x, y, z) {
		return {
			x: (Math.floor(x) + 0.5) * 32,
			y: y * 32 + 51,
			z: (Math.floor(z) + 0.5) * 32,
		};
	}

	teleport(x, y, z) {
		const pos = Player.getPlayerCenterPos(x, y, z);
		this.write("player_teleport", {
			pitch: 0,
			player_id: -1,
			x: pos.x,
			y: pos.y,
			yaw: 0,
			z: pos.z,
		});
	}
}
module.exports = Player;