const mc = require("minecraft-classic-protocol");

const World = require("./world.js");
const Player = require("./player.js");

const log = require("./debug.js");

class Server {
	constructor() {
		this.server = mc.createServer({
			port: 25565,
		});
		this.world = new World((x, y, z) => {
			if (y === 8) {
				return 2;
			} else if (y < 8) {
				return 3;
			}

			return 0;
		}, this);
	}

	broadcast(...data) {
		log("broadcasting '%s' packet to all players", data[0]);
		return Object.values(this.world.players).map(player => {
			return player.write(...data);
		});
	}

	removeClient(id) {
		delete this.world.players[id];
		this.broadcast("despawn_player", {
			player_id: id,
		});
	}

	start() {
		this.server.on("login", client => {
			this.world.players[client.id] = new Player(client, this);
			this.world.players[client.id].login();

			client.on("end", () => this.removeClient(client.id));
			client.on("error", () => this.removeClient(client.id));
		});

		this.server.on("error", function(error) {
			log("error: %o", error);
		});

		this.server.on("listening", () => {
			log("server open on port %d", this.server.socketServer.address().port);
		});
	}
}
module.exports = Server;