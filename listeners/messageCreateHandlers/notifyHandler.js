const Eris = require("eris");

module.exports = function (bot) {
	const priorities = bot.priorities;

	return {
		priority: priorities.MEDIUM,
		private: true,
		blacklist: (cfg) => cfg.cmdblacklist,

		test: function (msg) {
			let cfg = bot.configuration.getServerConfig(msg);
			return (!cfg.lastNotify || cfg.lastNotify < bot.config.notify.currNotify) && !bot.config.notify.busy;
		},

		execute: async (msg) => {
			let cfg = bot.configuration.getServerConfig(msg);

			let channel = msg.channel;

			if (msg.channel && msg.channel instanceof Eris.PrivateChannel)
				return;

			if (msg.channel.guild && msg.channel.guild.systemChannelID)
				channel = bot.resolvers.resolveChannel(msg, msg.channel.guild.systemChannelID) || channel;

			if (cfg.notify) {
				if (cfg.notify == "none") {
					cfg.lastNotify = Date.now();
					return;
				}

				channel = bot.resolvers.resolveChannel(msg, cfg.notify) || channel;
			}
			// TODO this duplicates some code in doNotifications.js
			if (cfg.lastNotify) {
				bot.messaging.send(channel, "**Service Notification:**\n" + bot.config.notify.notifyMessage.replace(/\%NAME\%/g, bot.config.name).replace(/\%PREFIX\%/g, cfg.prefix));
			} else {
				bot.messaging.send(channel, bot.config.introMessage.replace(/\%NAME\%/g, bot.config.name).replace(/\%PREFIX\%/g, cfg.prefix));
			}
			cfg.lastNotify = Date.now();

			bot.configuration.markDirty("servers");
		}
	};
}