module.exports = function (bot) {
	return {
		help: cfg => `View or set biographical information about a ${cfg.singular}`,
		usage: cfg => [`bio <keys> - List the available biographical keys`,
			`bio <name> <key> [value] - Set or view biographical data for a ${cfg.singular}`],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);

			if (!args[0])
				return bot.commands.help.execute(msg, ["bio"], cfg);

			if (args[0].toLowerCase() == "keys" && !args[1]) {
				out = "The valid keys for biographical data are: `" + Object.keys(bot.newTulpa.bio).reduce((a, c) => a + "`, `" + c) + "`";
			} else {
				let tulpa = bot.tulpae.getTulpa(msg, args[0]);
				let key = bot.resolvers.resolveKey(bot.newTulpa.bio, args[1]);

				if (!tulpa) {
					out = `You don't have ${cfg.singularArticle} ${cfg.singular} matching that name registered.`;
				} else if (!key) {
					out = "Unknown key " + args[1];
				} else if (args.length > 2) {
					let value = args.slice(2).join(" ");

					if (value.length > bot.config.maxBioLength) {
						out = `Biographical data cannot be more than ${bot.config.maxBioLength} characters long`;
					} else {
						tulpa.bio[key] = value;
						bot.configuration.markDirty("users");
						out = "Biographical data updated";
					}
				} else {
					out = `${tulpa.name}'s ${bot.language.parseCamelCase(key)}: ${tulpa.bio[key] || "Not set"}`;
				}
			}

			bot.messaging.send(msg.channel, out);
		}
	};
}