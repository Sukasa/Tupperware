module.exports = function (bot) {
	return {
		help: cfg => "Change a " + cfg.singular + "'s name",
		usage: cfg => ["rename <name> <newname> - Set a new name for the " + cfg.singular + ""],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0])
				return bot.commands.help.execute(msg, ["rename"], cfg);


			if (!args[1]) {
				out = "Missing argument 'newname'.";
			} else if (args[1].length < 2 || args[1].length > 28) {
				out = "New name must be between 2 and 28 characters.";
			} else {
				let user = bot.tulpae.getUser(msg);

				let tulpa = bot.tulpae.getTulpa(user, args[0]);
				let newname = bot.resolvers.resolveKey(user.tulpae, args[1]);

				if (!tulpa) {
					out = "You don't have a " + cfg.singular + " with that name registered.";
				} else if (newname && args[1].toLowerCase() != tulpa.name.toLowerCase()) {
					out = "You already have a " + cfg.singular + " with that new name.";
				} else {

					let keys = Object.keys(user.serverDefaults).filter(k => user.serverDefaults[k] == tulpa.name);
					keys.forEach(x => user.serverDefaults[x] = args[1]);

					delete user.tulpae[tulpa.name];
					tulpa.name = args[1];
					user.tulpae[tulpa.name] = tulpa;

					bot.configuration.markDirty("users");
					out = bot.language.proper(cfg.singular) + " renamed successfully.";
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}