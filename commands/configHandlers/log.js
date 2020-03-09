module.exports = function (bot) {

	return {
		usage: cfg => ["cfg log <channel> - Log all " + cfg.singular + " message conversions to a channel."],
		exec: async (msg, cfg, args) => {
			let out = "";
			if (!args[0]) {
				out = "Logging channel unset. Logging is now disabled.";
				cfg.log = null;
				bot.configuration.markDirty("servers");
			} else {
				let channel = bot.resolvers.resolveChannel(msg, args[0]);
				if (!channel)
					throw "Channel not found.";

				out = `Logging channel set to <#${channel.id}>`;
				cfg.log = channel.id;
				bot.configuration.markDirty("servers");

			}
			return out;
		}
	};
}