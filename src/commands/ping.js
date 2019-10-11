module.exports = {
	name: "ping",
	handler: args => {
		args.sendOutput("Pong!", "Ping");
	},
};