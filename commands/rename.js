const levenshtein = require("js-levenshtein");

module.exports = function (bot) {
	return {
		help: cfg => `Change ${cfg.singularArticle} ${cfg.singular}'s name`,
		usage: cfg => [`rename <name> <newname> - Set a new name for the ${cfg.singular}`],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			

			if (!args[0])
				return bot.commands.help.execute(msg, ["rename"], cfg);

			if (!args[1])
				throw "Missing argument 'newname'.";

			if (args[1].length < 2 || args[1].length > 28)
				throw "New name must be between 2 and 28 characters.";

			let user = bot.tulpae.getUser(msg);

			let tulpa = bot.tulpae.getTulpa(user, args[0]);
			let newname = bot.resolvers.resolveKey(user.tulpae, args[1]);

			if (!tulpa)
				throw `You don't have ${cfg.singularArticle} ` + cfg.singular + " with that name registered.";

			if (newname) {
				var dist = levenshtein(newname.toLowerCase(), args[1].toLowerCase());

				if (dist < 1)
					throw `You already have ${cfg.singularArticle} ` + cfg.singular + " named too similarly to that new name.";
			}

			let keys = Object.keys(user.serverDefaults).filter(k => user.serverDefaults[k] == tulpa.name);
			keys.forEach(x => user.serverDefaults[x] = args[1]);

			delete user.tulpae[tulpa.name];
			tulpa.name = args[1];
			user.tulpae[tulpa.name] = tulpa;

			bot.configuration.markDirty("hosts");
			out = bot.language.proper(cfg.singular) + " renamed successfully.";


			return out;
		}
	};
}