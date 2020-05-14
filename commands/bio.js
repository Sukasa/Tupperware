module.exports = function (bot) {
	return {
		help: cfg => `View or set biographical information about ${cfg.singularArticle} ${cfg.singular}`,
		usage: cfg => [`bio keys - List the available biographical keys`,
			`bio <name> <key> [value] - Set or view biographical data for ${cfg.singularArticle} ${cfg.singular}`,
			`bio <name> <key> <clear> - Remove biographical data for ${cfg.singularArticle} ${cfg.singular}`],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, bot.paramRegex).slice(1);

			if (!args[0])
				return bot.commands.help.execute(msg, ["bio"], cfg);

			if (args[0].toLowerCase() == "keys" && !args[1]) {
				out = "The valid keys for biographical data are: `" + Object.keys(bot.newTulpa.bio).reduce((a, c) => a + "`, `" + c) + "`";
			} else {
				let tulpa = bot.tulpae.getTulpa(msg, args[0]);
				let key = bot.resolvers.resolveKey(bot.newTulpa.bio, args[1]);

				if (!tulpa)
					throw `You don't have ${cfg.singularArticle} ${cfg.singular} matching that name registered.`;

				if (!key)
					throw `Unknown key \`${args[1]}\``;

				if (args.length > 2) {
					let value = args.slice(2).join(" ");

					if (value.length > bot.config.maxBioLength)
						throw `Biographical data cannot be more than ${bot.config.maxBioLength} characters long`;

					if (value.toLowerCase() == "clear")
						value = null;

					tulpa.bio[key] = value;
					bot.configuration.markDirty("hosts");
					out = "Biographical data updated";

				} else {
					out = `${tulpa.name}'s ${bot.language.parseCamelCase(key)}: ${tulpa.bio[key] || "Not set"}`;
				}
			}

			return out;
		}
	};
}