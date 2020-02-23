const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Show the user that registered the " + cfg.lang + " that last spoke",
	aliases: ["showhost"],
	usage: cfg => ["showuser - Finds the user that registered the " + cfg.lang + " that last sent a message in this channel"],
	permitted: (msg) => true,
	execute: function (msg, args, cfg) {
		if (!recent[msg.channel.id]) send(msg.channel, "No " + cfg.lang + "s have spoken in this channel since I last started up, sorry.");
		else {
			let user = bot.users.get(recent[msg.channel.id][0].userID);
			send(msg.channel, `Last ${cfg.lang} message sent by ${recent[msg.channel.id][0].tulpa.name}, registered to ${user ? user.username + "#" + user.discriminator : "(unknown user " + recent[msg.channel.id][0].userID + ")"}`);
		}
	}
}