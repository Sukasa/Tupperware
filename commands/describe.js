module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s description`,
		usage: cfg => [`describe <name> [desc] - if desc is specified, change the ${cfg.singular}'s description, if not, simply echo the current one`],
		desc: cfg => "Description must be limited to no more than 500 characters",
		aliases: ["desc", "description", "ds"],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			

			if (!args[0])
				return bot.commands.help.execute(msg, ["describe"], cfg);

			let tulpa = bot.tulpae.getTulpa(msg, args[0]);

			if (!tulpa) 
				throw `You don't have ${cfg.singularArticle} ${cfg.singular} with that name registered.`;

			if (!args[1]) {
				if (tulpa.desc && tulpa.desc.length > 1) {
					out = `${tulpa.name}: ${tulpa.desc}`;
				} else {
					out = `No description set for ${tulpa.name}`;
				}
			} else {
				if (args.slice(1).join(" ").length > bot.config.maxDescLength)
					throw `Description cannot be more than ${bot.config.maxDescLength} characters`;
				tulpa.desc = args.slice(1).join(" ");
				bot.configuration.markDirty("hosts");
				out = "Description updated successfully.";
			}

			return out;
		}
	};
}