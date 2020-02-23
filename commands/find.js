const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Find and display info about " + cfg.lang + "s by name",
	aliases: ["search"],
	usage: cfg => ["find <name> - Attempts to find a " + cfg.lang + " with exactly the given name, and if none are found, tries to find " + cfg.lang + "s with names containing the given name."],
	permitted: (msg) => true,
	execute: function (msg, args, cfg) {
		if (msg.channel instanceof Eris.PrivateChannel)
			return send(msg.channel, "This command cannot be used in private messages.");
		if (!args[0])
			return bot.cmds.help.execute(msg, ["find"], cfg);
		let all = Object.keys(tulpae)
			.filter(id => msg.channel.guild.members.has(id))
			.reduce((arr, tul) => arr.concat(tulpae[tul]), []);
		if (!all[0]) {
			return send(msg.channel, "There are no " + cfg.lang + "s registered on this server.");
		}
		let search = args.join(" ").toLowerCase();
		let tul = all.filter(t => t.name.toLowerCase() == search);
		if (!tul[0])
			tul = all.filter(t => t.name.toLowerCase().includes(search));
		if (!tul[0])
			send(msg.channel, "Couldn't find a " + cfg.lang + " with that name.");
		else {
			if (tul.length == 1) {
				let t = tul[0];
				let host = bot.users.get(t.host);
				let embed = {
					embed: {
						author: {
							name: t.name,
							icon_url: t.url
						},
						description: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${generateTulpaField(t).value}`,
					}
				};
				send(msg.channel, embed);
			} else {
				tul = tul.slice(0, 10);
				let embed = {
					embed: {
						title: "Results",
						fields: []
					}
				};
				tul.forEach(t => {
					let host = bot.users.get(t.host);
					embed.embed.fields.push({ name: t.name, value: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${generateTulpaField(t).value}` });
				});
				send(msg.channel, embed);
			}
		}
	}
}