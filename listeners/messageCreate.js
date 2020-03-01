module.exports = function (bot) {
	messageHandlers = [];

	// Load message handlers
	fs.readdirSync("./messageCreateHandlers").forEach(file => messageHandlers.push(require("./messageCreateHandlers/" + file)(bot)));
	messageHandlers.sort((a, b) => { a.priority - b.priority });

	async function OnMessage(msg, bot) {
		let public = (msg.channel instanceof Eris.TextChannel);
		// TODO loop through message handlers, the first one that returns "yes I can handle this" is executed
		messageHandlers.forEach(handler => {
			let state = null;
			if ((public || handler.private) && (state = handler.test(msg, bot))) {
				handler.execute(msg, bot, state);
				return;
			}
		});
	};

	return {
		exec: OnMessage
	};
}



