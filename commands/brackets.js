module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s brackets`,
		usage: cfg => [`brackets <name> [#] [brackets] - if brackets are given, change the ${cfg.singular}'s brackets, if not, simply echo their current set.`
					   `brackets <name> <#> none - Remove the given brackets, if this is not the last remaining set of brackets.`],
		desc: cfg => "Brackets must be the word 'text' surrounded by any symbols or letters (spaces are allowed), i.e. `[text]` or ` >> text`.",
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);

			if (!args[0]) {
				return bot.commands.help.execute(msg, ["brackets"], cfg);
			} else {
				let user = bot.tulpae.getUser(msg);
				let tulpa = bot.tulpae.getTulpae(user, args[0]);

				if (!tulpa) {
					out = `You don't have ${cfg.singularArticle} ${cfg.singular} with that name registered.`;
				} else if (!args[1]) {
					let count = 0;
					out = [`Brackets for ${tulpa.name}:`].concat(tulpa.brackets).reduce((a, c) => a + `\n${++count}: ${c[0]}text${c[1]}`);
				} else {

					let Skip = !isNaN(args[1])
					let num = Skip ? parseInt(args[1]) - 1 : 0;
					args = args.slice(0, Skip ? 2 : 1);

					if (args[0].toLowerCase() == "none" && !args[1]) {
						if (tulpa.brackets.length < 2) {
							out = "Cannot remove the last set of brackets";
						} else if (num < tulpa.brackets.length && num >= 0) {
							tulpa.brackets.slice(num);
							bot.configuration.markDirty("users");
							out = "Brackets removed";
						} else {
							out = "Unable to remove that bracket set";
						}
					} else if (num < 0 || num >= bot.config.maxBrackets) {
						out = `Bracket limit is ${bot.config.maxBrackets} brackets.`;
					} else if (!args[0]) {
						let brackets = tulpa.brackets[num];
						out = `Brackets for ${tulpa.name}: ${brackets[0]}text${brackets[1]}`;
					} else {
						try {
							tulpa.brackets[num] = bot.tulpae.validateBrackets(user, bot.tulpae.parseBrackets(args.slice(1)));
							bot.configuration.markDirty("users");
							out = "Brackets updated successfully";
						} catch (e) {
							out = e;
						}
					}
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}