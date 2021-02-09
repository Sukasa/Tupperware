const fs = require("fs");
const Eris = require("eris");

module.exports = function (bot) {

	async function OnEdit(msg, oldMsg) {
		let public = (msg.channel instanceof Eris.TextChannel);
		let cfg;

		// If no old message, skip immediately
		if (!oldMsg)
			return;

		let currentTimestamp = Math.floor(new Date().getTime() / 1000);

		if (currentTimestamp - oldMsg.editedTimestamp > bot.config.maxEditGraceTime) {
			return;
		}

		let isBot = msg.author.bot;			
		
		if (public)
			cfg = bot.configuration.getServerConfig(msg);


		// Edited messages get subjected to the original messageCreate handlers
		for (let handler of bot.listeners.messageCreate.handlers) {
			let state = null;
			if (((public && !(handler.blacklist && handler.blacklist(cfg) && handler.blacklist(cfg).includes(msg.channel.id))) || (!public && handler.private)) && (!isBot || handler.allowBot) && (state = handler.test(msg))) {
				handler.execute(msg, state);
				if (handler.exclusive)
					break;
			}
		}
	};

	return {
		exec: OnEdit,
		handlers: messageHandlers
	};
}



