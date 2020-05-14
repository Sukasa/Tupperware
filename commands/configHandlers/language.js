module.exports = function (bot) {

	return {
		usage: cfg => [`cfg language <singular> <plural> - Set language used in place of "${cfg.singular}" and "${cfg.plural}"`],
		exec: async (msg, cfg, args) => {

			if (!args[0])
				throw "Missing argument 'singular'.";

			if (!args[1])
				throw "Missing argument 'plural'.";

			cfg.singular = args[0];
			cfg.plural = args[1];
			bot.configuration.validateGuildCfg(msg);

			return "Updated language";
		}
	};
}