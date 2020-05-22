const Eris = require("eris");

module.exports = function (bot) {
	return {
		help: cfg => `Set the default ${cfg.singular} to use here if no brackets are used`,
		usage: cfg => [`default <name> - Set the named ${cfg.singular} as default for this server`,
		`default clear - Unset the default ${cfg.singular} as default for this server`],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			if (msg.channel instanceof Eris.PrivateChannel)
				return bot.messaging.send(msg.channel, "This command cannot be used in private messages.");
			let out = "";
			

			if (!args[0]) 
				return bot.commands.help.execute(msg, ["default"], cfg);

			if (args[0].toLowerCase() == "clear") {
				let user = bot.tulpae.getUser(msg);
				delete user.serverDefaults[msg.channel.guild.id];
				out = `Default ${cfg.singular} for this server has been unset.`;
				bot.configuration.markDirty("hosts");
			} else {
				let user = bot.tulpae.getUser(msg);
				let tulpa = bot.tulpae.getTulpa(user, args[0]);

				if (!tulpa)
					throw `Could not find ${cfg.singularArticle} ${cfg.singular} with that name registered under your account.`;

				out = `${tulpa.name} set as default for this server.`;
				user.serverDefaults[msg.channel.guild.id] = tulpa.name;
				bot.configuration.markDirty("hosts");

			}
			return out;
		}
	};
}