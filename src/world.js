const zlib = require("zlib");

const log = require("./debug.js");

const { getPlayerPos } = require("./player.js");

class World {
	constructor(generator, server, x = 16, y = 16, z = 16) {
		this.blocks = World.create(generator, x, y, z);

		this.x = x;
		this.y = y;
		this.z = z;

		this.volume = x * y * z;

		this.players = {};
		this.server = server;
	}

	static create(generator, xSize, ySize, zSize) {
		const arr = [];
		for (let y = 0; y < ySize; y++) {
			arr[y] = [];
			for (let x = 0; x < xSize; x++) {
				arr[y][x] = [];
				for (let z = 0; z < zSize; z++) {
					arr[y][x][z] = generator(x, y, z);
				}
			}
		}
		return arr;
	}

	static coordsFromIndex(index, xSize, ySize, zSize) {
		const zQuotient = Math.floor(index / zSize);
		const z = index % zSize;
		const yQuotient = Math.floor(zQuotient / ySize);
		const y = zQuotient % ySize;
		const x = yQuotient % xSize;

		return [x, y, z];
	}

	getBlock(x, y, z) {
		return this.blocks[x][y][z];
	}

	setBlock(value, x, y, z) {
		this.server.broadcast("set_block", {
			block_type: value,
			x,
			y,
			z,
		});
		return this.blocks[y][x][z] = value;
	}

	getCompressedMap() {
		const map = Buffer.alloc(this.volume + 4).map((value, index) => {
			if (index <= 4) return value;
			return this.getBlock(...World.coordsFromIndex(index - 4, this.x, this.y, this.z));
		});
		map.writeInt32BE(this.volume, 0);
		return zlib.gzipSync(map);
	}

	sendWorld(client) {
		client.write("level_initialize", {});

		const compressedMap = this.getCompressedMap();
		for (let i = 0; i < compressedMap.length; i += 1024) {
			client.write("level_data_chunk", {
				chunk_data: compressedMap.slice(i, Math.min(i + 1024, compressedMap.length)),
				percent_complete: i == 0 ? 0 : Math.ceil(i / compressedMap.length * 100),
			});
		}

		client.write("level_finalize", this.size());

		Object.values(this.players).forEach(player => {
			if (player.id === client.id) return;

			const pos = getPlayerPos(player.x, player.y, player.z);
			client.write("spawn_player", {
				pitch: player.pitch,
				player_id: player.id,
				player_name: player.name,
				x: pos.x,
				y: pos.y,
				yaw: player.yaw,
				z: pos.z,
			});
		});
	}

	size() {
		return {
			x_size: this.x,
			y_size: this.y,
			z_size: this.z,
		};
	}
}
module.exports = World;