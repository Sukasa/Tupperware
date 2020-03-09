module.exports = function (bot) {

	return {
		usage: cfg => ["cfg dicecfg <param> <value> - Configures a dice engine parameter",
			"cfg dicecfg - List available parameters and current values"],

		exec: async (msg, cfg, args) => {
			let engine = bot.diceEngines[cfg.dice];

			if (!engine)
				throw "No dice engine selected";

			if (!args[0]) {
				let settings = Object.keys(engine.settings).map(x => `**${x}**: ${cfg.diceCfg[x] || engine.settings[x][0]} (${engine.settings[x].join(", ")})`).join("\n");
				return `Current params for engine ${cfg.dice}:\n${settings}`;
			}


			let setting = args[0].toLowerCase();

			if (!engine.settings[setting])
				throw `Invalid setting ${args[0]}`;

			if (!args[1])
				return `Current ${setting} configuration: ${cfg.diceCfg[setting] || engine.settings[setting][0]} (${engine.settings[setting].join(", ")})`;


			let value = args[1].toLowerCase();

			if (!engine.settings[setting].includes(value))
				throw `Invalid parameter value ${args[1]} for ${setting}`;

			cfg.diceCfg[setting] = value;
			bot.configuration.markDirty("servers");
			return `set ${setting} to ${value}`;



		}
	};
}