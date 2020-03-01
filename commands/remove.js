module.exports = function (bot) {
	return {
		help: cfg => `Unregister a ${cfg.singularArticle} ${cfg.singular}.`,
		aliases: ["unregister"],
		usage: cfg => ["remove <name> - Unregister the named " + cfg.singular + " from your list"],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";

			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0]) {
				return bot.commands.help.execute(msg, ["remove"], cfg);
			} else {
				let user = bot.tulpae.getUser(msg);
				let tulpa = bot.tulpae.getTulpa(user, args[0]);

				if (!tulpa) {
					out = `Could not find ${cfg.singularArticle} ${cfg.singular} matching that name registered under your account.`;
				} else {
					let keys = Object.keys(user.serverDefaults).filter(k => user.serverDefaults[k] == tulpa.name);
					keys.forEach(x => delete user.serverDefaults[x]);

					delete user.tulpae[tulpa.name];
					bot.configuration.markDirty("users");
					out = bot.language.proper(cfg.singular) + " unregistered.";
				}
			}
			send(msg.channel, out);
		}
	};
}