module.exports = function (bot) {
	return {
		help: cfg => "Get a detailed list of yours or another user's registered " + cfg.plural,
		usage: cfg => ["list [user] - Sends a list of the user's registered " + cfg.plural + ", their brackets, post count, and birthday (if set). If user is not specified it defaults to the message author."],
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			let target;
			if (args[0]) {
				// TODO this may not work properly
				target = bot.resolvers.resolveUser(msg, args.join(" "));
			} else {
				target = msg.author;
			}

			if (target && !target.tulpae)
				target = bot.tulpae.getUser(target);

			if (!target) {
				out = "User not found.";
			} else {

				if (!user.tulpae || !user.tulpae.length) {
					out = (target.id == msg.author.id) ? "You have not registered any " + cfg.plural + "." : "That user has not registered any " + cfg.plural + ".";
				} else {
					out = {
						embed: {
							title: `${target.username}#${target.discriminator}'s registered ${cfg.plural}`,
							author: {
								name: target.username,
								icon_url: target.avatarURL
							},
							fields: []
						}
					};
					let len = 200;
					let page = 1;
					user.tulpae.forEach(t => {
						let field = bot.rendering.generateTulpaField(t);
						len += field.name.length;
						len += field.value.length;
						if (len < 5000) {
							out.embed.fields.push(field);
						} else {
							out.embed.title += ` (page ${page})`;
							send(msg.channel, out);
							len = 200;
							page++;
							out.embed.title = `${target.username}#${target.discriminator}'s registered ${cfg.plural} (page ${page})`;
							out.embed.fields = [field];
						}
					});
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}