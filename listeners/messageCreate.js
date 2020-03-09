const fs = require("fs");
const Eris = require("eris");

module.exports = function (bot) {
	messageHandlers = [];

	// Load message handlers
	fs.readdirSync("./listeners/messageCreateHandlers").forEach(file => {
		console.log(`- Loading message handlers ${file}`);
		messageHandlers.push(require("./messageCreateHandlers/" + file)(bot))
	});
	messageHandlers.sort((b, a) => { a.priority - b.priority });

	async function OnMessage(msg) {
		let public = (msg.channel instanceof Eris.TextChannel);
		let cfg;

		if (msg.author.id == bot.id)
			return;

		if (public)
			cfg = bot.configuration.getServerConfig(msg)

		// TODO loop through message handlers, the first one that returns "yes I can handle this" is executed
		for (let i in messageHandlers) {
			let state = null;
			let handler = messageHandlers[i];
			if (((public && !(handler.blacklist && handler.blacklist(cfg) && handler.blacklist(cfg).includes(msg.channel.id))) || (!public && handler.private)) && (state = handler.test(msg))) {
				handler.execute(msg, state);
				break;
			}
		}
	};

	return {
		exec: OnMessage
	};
}



