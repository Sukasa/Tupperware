module.exports = function (bot) {

	return {
		help: cfg => "Show the user that registered the " + cfg.singular + " that last spoke",
		aliases: ["showhost"],
		usage: cfg => ["showuser - Finds the user that registered the " + cfg.singular + " that last sent a message in this channel"],
		permitted: (msg) => true,
		execute: function (msg, args, cfg) {
			if (msg.channel instanceof Eris.PrivateChannel)
				return bot.messaging.send(msg.channel, "This command cannot be used in private messages.");
			let recent = bot.messaging.getRecent(msg);
			if (!recent)
				bot.messaging.send(msg.channel, "No " + cfg.plural + " have spoken in this channel since I last started up, sorry.");
			else {
				let user = bot.tulpae.getUser(recent.userID);
				let discoUser = msg.channel.guild.members.find(x => x.id == user.id)
				bot.messaging.send(msg.channel, `Last ${cfg.singular} message sent by ${recent.tulpa.name}, registered to ${discoUser ? discoUser.username + "#" + discoUser.discriminator : "(unknown user " + recent.userID + ")"}`);
			}
		}
	};
}