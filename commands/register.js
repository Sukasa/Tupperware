module.exports = function (bot) {
	return {
		help: cfg => "Register a new " + cfg.singular + "",
		usage: cfg => ["register <name> <brackets> - Register a new " + cfg.singular + ".\n\t<name> - the " + cfg.singular + "'s name, for multi-word names surround this argument in `''`\n\t<brackets> - the word 'text' surrounded by any characters on one or both sides"],
		desc: cfg => "Example use: `register Test >text<` - registers a " + cfg.singular + " named 'Test' that is triggered by messages surrounded by ><\nBrackets can be anything, one sided or both. For example `text<<` and `T:text` are both valid\nNote that you can enter multi-word names by surrounding the full name in apostrophes `''`.",
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let proper = bot.language.proper;
			args = bot.resolvers.getMatches(msg.content, bot.paramRegex).slice(1);
			let out = "";

			if (!args[0])
				return bot.commands.help.execute(msg, ["register"], cfg);

			if (!args[1])
				throw "Missing argument 'brackets'. Try `" + cfg.prefix + "help register` for usage details.";

			if (args[0].length < 2 || args[0].length > 28)
				throw "Name must be between 2 and 28 characters.";

			let user = bot.tulpae.getUser(msg);
			if (bot.tulpae.getTulpa(user, args[0], 0.0))
				throw `${proper(cfg.singularArticle)} ${cfg.singular} with that name under your user account already exists.`;

			let brackets = bot.tulpae.parseBrackets(args.slice(1));
			let tulpa = bot.tulpae.register(user, args[0], brackets);
			out = proper(cfg.singular) + " registered successfully!\nName: " + tulpa.name + "\nBrackets: " + `${brackets[0]}text${brackets[1]}` + "\nUse `" + cfg.prefix + "rename`, `" + cfg.prefix + "brackets`, `" + cfg.prefix + "avatar`, and `" + cfg.prefix + "form` to set/update your " + cfg.singular + "'s info.";

			return out;
		}
	};
}