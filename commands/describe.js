module.exports = {
	help: cfg => `View or change a ${cfg.singular}'s description`,
	usage: cfg => [`describe <name> [desc] - if desc is specified, change the ${cfg.singular}'s description, if not, simply echo the current one`],
	desc: cfg => "Description must be limited to no more than 500 characters",
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0])
			return bot.commands.help.execute(msg, ["describe"], cfg);
		let tulpa = bot.tulpae.getTulpa(msg, args[0]);

		if (!tulpa) {
			out = `You don't have a ${cfg.singular} with that name registered.`;
		} else if (!args[1]) {
			out = tulpa.desc;
		} else {
			tulpa.desc = args.slice(1).join(" ").slice(0, 500);
			bot.configuration.markDirty("users");
			out = "Description updated successfully.";
		}
		bot.messaging.send(msg.channel, out);
	}
}