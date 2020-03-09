module.exports = function (bot) {

	return {
		usage: cfg => ["cfg prefix <newPrefix> - Change the bot's prefix on this server"],
		exec: async (msg, cfg, args) => {
			if (!args[0])
				throw "Missing argument 'prefix'.";

			cfg.prefix = args[0];
			bot.configuration.markDirty("servers");
			return "Prefix changed to `" + cfg.prefix + "`";
		}
	};
}