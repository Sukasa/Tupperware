module.exports = function (bot) {

	return {
		usage: cfg => ["cfg dice [off|(engine)] - Selects or shows the dice engine for this server",
			"cfg dice <list> - List available dice engines"],
		exec: async (msg, cfg, args) => {
			if (!args[0])
				return `Current dice engine: ${cfg.dice || "disabled"}`;

			switch (args[0].toLowerCase()) {
				case "off":
				case "none": // removed from usage but left here in case people try to use it
					cfg.dice = false;
					cfg.diceCfg = {};
					bot.configuration.markDirty("servers");
					return "Dice engine disabled on this server";

				case "list":
					return `Available dice engines: ${Object.keys(bot.diceEngines).join(", ")}`;

				default:
					if (!bot.diceEngines[args[0].toLowerCase()])
						throw "Invalid dice engine";

					cfg.dice = args[0].toLowerCase();
					cfg.diceCfg = {};
					bot.configuration.markDirty("servers");
					return `Using ${args[0]} dice engine`;
			}
		}
	};
}