const fs = require("fs");
const Eris = require("eris");

module.exports = function (bot) {
	messageHandlers = [];

	// Load message handlers
	fs.readdirSync("./listeners/messageCreateHandlers").forEach(file => {
		bot.logger.info(`- Loading message handler ${file}`);
		messageHandlers.push(require("./messageCreateHandlers/" + file)(bot))
	});
	messageHandlers.sort((b, a) => { a.priority - b.priority });

	async function OnMessage(msg) {
		let public = (msg.channel instanceof Eris.TextChannel);
		let cfg;

		let isBot = msg.author.bot;			
		
		if (public)
			cfg = bot.configuration.getServerConfig(msg);

		for (let i in messageHandlers) {
			let state = null;
			let handler = messageHandlers[i];
			if (((public && !(handler.blacklist && handler.blacklist(cfg) && handler.blacklist(cfg).includes(msg.channel.id))) || (!public && handler.private)) && (!isBot || handler.allowBot) && (state = handler.test(msg))) {
				handler.execute(msg, state);
				if (handler.exclusive)
					break;
			}
		}
	};

	return {
		exec: OnMessage
	};
}



