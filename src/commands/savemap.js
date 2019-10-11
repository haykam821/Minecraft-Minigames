const fse = require("fs-extra");

module.exports = {
	name: "savemap",
	handler: async args => {
		await fse.ensureDir("./savedmaps");
		await fse.writeJSON(`./savedmaps/${Date.now()}.json`, {
			map: args.map,
		});

		args.sendOutput("This map has been saved.", "Save Map");
	},
};