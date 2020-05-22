module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s brackets`,
		usage: cfg => [`brackets <name> [#] [brackets] - if brackets are given, change the ${cfg.singular}'s brackets, if not, simply echo their current set.`,
			`brackets <name> <#> none - Remove the given brackets, if this is not the last remaining set of brackets.`,
			`brackets <name> add <brackets> - Add a set of brackets without overwriting any, if possible.`],
		desc: cfg => "Brackets must be the word 'text' surrounded by any symbols or letters (spaces are allowed), i.e. `[text]` or ` >> text`.",
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			

			if (!args[0])
				return bot.commands.help.execute(msg, ["brackets"], cfg);

			let user = bot.tulpae.getUser(msg);
			let tulpa = bot.tulpae.getTulpa(user, args[0]);

			if (!tulpa)
				throw `You don't have ${cfg.singularArticle} ${cfg.singular} with that name registered.`;

			if (!args[1]) {
				let count = 0;
				out = [`Brackets for ${tulpa.name}:`].concat(tulpa.brackets).reduce((a, c) => a + `\n${++count}: ${c[0]}text${c[1]}`);
			} else {

				let Skip = !isNaN(args[1]);
				let num = Skip ? parseInt(args[1]) - 1 : 0;
				args = args.slice(Skip ? 2 : 1);

				if (args[0].toLowerCase() == "add" && args[1]) {
					args = args.slice(1);
					num = tulpa.brackets.length;
				}

				if (args[0].toLowerCase() == "none" && !args[1]) {
					if (tulpa.brackets.length < 2)
						throw "Cannot remove the last set of brackets";

					if (num >= tulpa.brackets.length || num < 0)
						throw "Unable to remove that bracket set";

					tulpa.brackets.slice(num);
					bot.configuration.markDirty("hosts");
					out = "Brackets removed";

				} else {

					if (num < 0 || num >= bot.config.maxBrackets)
						throw `Bracket limit is ${bot.config.maxBrackets} brackets.`;

					if (!args[0]) {
						let brackets = tulpa.brackets[num];
						out = `Brackets for ${tulpa.name}: ${brackets[0]}text${brackets[1]}`;
					} else {
						let parsed = bot.tulpae.parseBrackets(args);
						tulpa.brackets[num] = bot.tulpae.validateBrackets(user, parsed, tulpa);
						bot.configuration.markDirty("hosts");
						out = "Brackets updated successfully";
					}

				}
			}
			return out;
		}
	};
}