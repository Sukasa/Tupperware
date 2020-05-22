module.exports = function (bot) {
	return {
		help: cfg => `Unregister ${cfg.singularArticle} ${cfg.singular}.`,
		aliases: ["unregister"],
		usage: cfg => ["remove <name> - Unregister the named " + cfg.singular + " from your list"],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";

			
			if (!args[0])
				return bot.commands.help.execute(msg, ["remove"], cfg);

			let user = bot.tulpae.getUser(msg);
			let tulpa = bot.tulpae.getTulpa(user, args[0]);

			if (!tulpa)
				throw `Could not find ${cfg.singularArticle} ${cfg.singular} matching that name registered under your account.`;

			let keys = Object.keys(user.serverDefaults).filter(k => user.serverDefaults[k] == tulpa.name);
			keys.forEach(x => delete user.serverDefaults[x]);

			delete user.tulpae[tulpa.name];
			bot.configuration.markDirty("hosts");
			out = bot.language.proper(cfg.singular) + " unregistered.";


			return out;
		}
	};
}