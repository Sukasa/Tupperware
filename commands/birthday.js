const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "View or change a " + cfg.lang + "'s birthday, or see upcoming birthdays",
	usage: cfg => ["birthday [name] [date] -\n\tIf name and date are specified, set the named " + cfg.lang + "'s birthday to the date.\n\tIf name only is specified, show the " + cfg.lang + "'s birthday.\n\tIf neither are given, show the next 5 birthdays on the server."],
	desc: cfg => "Date must be given in format MM/DD/YY",
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			let tulps = Object.keys(tulpae)
				.filter(id => id == msg.author.id || (msg.channel.guild && msg.channel.guild.members.has(id)))
				.reduce((arr, tul) => arr.concat(tulpae[tul]), []);
			if (!tulps[0])
				return send(msg.channel, "No " + cfg.lang + "s have been registered on this server.");
			tulps = tulps.filter(t => !!t.birthday);
			if (!tulps[0])
				return send(msg.channel, "No " + cfg.lang + "s on this server have birthdays set.");
			let n = new Date();
			let now = new Date(n.getFullYear(), n.getMonth(), n.getDate());
			out = "Here are the next few upcoming " + cfg.lang + " birthdays in this server:\n" +
				tulps.sort((a, b) => {
					let first = new Date(a.birthday);
					first.setFullYear(now.getFullYear());
					if (first < now) first.setFullYear(now.getFullYear() + 1);
					let second = new Date(b.birthday);
					second.setFullYear(now.getFullYear());
					if (second < now) second.setFullYear(now.getFullYear() + 1);
					return first.getTime() - second.getTime();
				}).slice(0, 5)
					.map(t => {
						let bday = new Date(t.birthday);
						bday.setFullYear(now.getFullYear());
						if (bday < now) bday.setFullYear(now.getFullYear() + 1);
						return (bday.getTime() == now.getTime()) ? `${t.name}: Birthday today! \uD83C\uDF70` : `${t.name}: ${bday.toDateString()}`;
					}).join("\n");
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (!args[1]) {
			let bday = tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase()).birthday;
			out = bday ? new Date(bday).toDateString() : "No birthday currently set for " + args[0];
		} else if (!(new Date(args[1]).getTime())) {
			out = "I can't understand that date. Please enter in the form MM/DD/YYYY with no spaces.";
		} else {
			let date = new Date(args[1]);
			tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase()).birthday = date.getTime();
			save("tulpae", tulpae);
			out = `${proper(cfg.lang)} '${args[0]}' birthday set to ${date.toDateString()}.`;
		}
		send(msg.channel, out);
	}
}