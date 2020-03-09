const Eris = require("eris");

module.exports = function (bot) {
	return {
		help: cfg => `Find and display info about ${cfg.plural} by name`,
		aliases: ["search"],
		usage: cfg => [`find <name> - Attempts to find ${cfg.singularArticle} ${cfg.singular} with exactly the given name, and if none are found, tries to find ${cfg.plural} with names containing the given name.`],
		permitted: (msg) => true,
		execute: function (msg, args, cfg) {
			if (msg.channel instanceof Eris.PrivateChannel)
				throw "This command cannot be used in private messages.";

			if (!args[0])
				return bot.commands.help.execute(msg, ["find"], cfg);

			let all = bot.tulpae.listForMessage(msg);

			if (!all[0])
				throw `There are no ${cfg.plural} registered on this server.`;

			let search = args.join(" ").toLowerCase();
			let tul = all.filter(t => bot.resolvers.resolveCompareText(t.name, search));

			if (!tul[0])
				throw `Couldn't find ${cfg.singularArticle} ${cfg.singular} with that name.`;

			if (tul.length == 1) {
				let t = tul[0];
				let host = bot.resolvers.resolveUser(msg, t.host);
				let embed = {
					embed: {
						author: {
							name: t.name,
							icon_url: t.url
						},
						description: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${bot.rendering.generateTulpaField(t).value}`,
					}
				};
				bot.messaging.send(msg.channel, embed);
			} else {
				tul = tul.slice(0, 10);
				let embed = {
					embed: {
						title: "Results",
						fields: []
					}
				};
				tul.forEach(t => {
					let host = bot.resolvers.resolveUser(msg, t.host);
					embed.embed.fields.push({ name: t.name, value: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${bot.rendering.generateTulpaField(t).value}` });
				});
				bot.messaging.send(msg.channel, embed);
			}

		}
	};
}