const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Get a detailed list of yours or another user's registered " + cfg.lang + "s",
	usage: cfg => ["list [user] - Sends a list of the user's registered " + cfg.lang + "s, their brackets, post count, and birthday (if set). If user is not specified it defaults to the message author."],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		let target;
		if (args[0]) {
			target = resolveUser(msg, args.join(" "));
		} else {
			target = msg.author;
		}
		if (!target) {
			out = "User not found.";
		} else if (!tulpae[target.id]) {
			out = (target.id == msg.author.id) ? "You have not registered any " + cfg.lang + "s." : "That user has not registered any " + cfg.lang + "s.";
		} else {
			out = {
				embed: {
					title: `${target.username}#${target.discriminator}'s registered ${cfg.lang}s`,
					author: {
						name: target.username,
						icon_url: target.avatarURL
					},
					fields: []
				}
			};
			let len = 200;
			let page = 1;
			tulpae[target.id].forEach(t => {
				let field = generateTulpaField(t);
				len += field.name.length;
				len += field.value.length;
				if (len < 5000) {
					out.embed.fields.push(field);
				} else {
					out.embed.title += ` (page ${page})`;
					send(msg.channel, out);
					len = 200;
					page++;
					out.embed.title = `${target.username}#${target.discriminator}'s registered ${cfg.lang}s (page ${page})`;
					out.embed.fields = [field];
				}
			});
		}
		send(msg.channel, out);
	}
}