const Eris = require("eris");

module.exports = function (bot) {

	return {
		help: cfg => "Show the user that registered the " + cfg.singular + " that last spoke",
		aliases: ["showhost"],
		usage: cfg => ["showuser - Finds the user that registered the " + cfg.singular + " that last sent a message in this channel"],
		permitted: (msg) => true,
		execute: function (msg, args, cfg) {
			if (msg.channel instanceof Eris.PrivateChannel)
				throw "This command cannot be used in private messages.";

			let recent = bot.messaging.getRecent(msg);
			if (!recent)
				throw "No " + cfg.plural + " have spoken in this channel since I last started up, sorry.";

			let user = bot.tulpae.getUser(recent.userID);
			let discoUser = msg.channel.guild.members.find(x => x.id == user.id)
			return `Last ${cfg.singular} message sent by ${recent.tulpa.name}, registered to ${discoUser ? discoUser.username + "#" + discoUser.discriminator : "(unknown user " + recent.userID + ")"}`;

		}
	};
}