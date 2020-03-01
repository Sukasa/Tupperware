module.exports = function (bot) {
	return {
		help: cfg => `Configure a default ${cfg.singular}' to use on this server if no brackets are provided in a message`,
		usage: cfg => [`default <name> - Set the named ${cfg.singular} as default for this server`,
			`default clear - Unset the default ${cfg.singular} as default for this server`],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			if (msg.channel instanceof Eris.PrivateChannel)
				return bot.messaging.send(msg.channel, "This command cannot be used in private messages.");
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0]) {
				return bot.commands.help.execute(msg, ["default"], cfg);
			} else if (args[0].toLowerCase() == "clear") {
				delete user.defaults[msg.channel.guild.id];
				out = `Default ${cfg.singular} for this server has been unset.`;
			} else {
				let user = bot.tulpae.getUser(msg);
				let tulpa = bot.tulpae.getTulpa(user, args[0]);
				if (!tulpa) {
					out = "Could not find " + cfg.singular + " with that name registered under your account.";
				} else {
					out = `${tulpa.name} set as default for this server.`;
					user.defaults[msg.channel.guild.id] = tulpa.name;
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}