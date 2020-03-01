module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s birthday, or see upcoming birthdays`,
		usage: cfg => [`birthday [name] [date] -\n\tIf name and date are specified, set the named ${cfg.singular}'s birthday to the date.\n\tIf name only is specified, show the ${cfg.singular}'s birthday.\n\tIf neither are given, show the next 5 birthdays on the server.`],
		desc: cfg => "Date must be given in format MM/DD/YY",
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0]) {

				let tulps = bot.tulpae.listForMessage(msg);

				if (!tulps[0])
					return send(msg.channel, "No " + cfg.plural + " have been registered on this server.");

				tulps = tulps.filter(t => !!t.birthday);
				if (!tulps[0])
					return send(msg.channel, "No " + cfg.plural + " on this server have birthdays set.");
				let Now = new Date();
				let TimeTo = (birthday) => {
					let bDate = new Date(birthday);
					bDate.setFullYear(Now.getFullYear());
					if (Now.getTime() > bDate.getTime())
						bday.setFullYear(bday.getFullYear() + 1);
					return bDate.getTime() - Now.getTime();
				};
				tulps = tulps.sort((a, b) => TimeTo(a) - TimeTo(b));
				out = "Here are the next few upcoming " + cfg.singular + " birthdays in this server:\n" +
					tulps.slice(0, 5)
						.map(t => {
							let bday = new Date(t.birthday);
							bday.setFullYear(now.getFullYear());
							if (bday < now) bday.setFullYear(now.getFullYear() + 1);
							return (bday.getTime() == now.getTime()) ? `${t.name}: Birthday today! \uD83C\uDF70` : `${t.name}: ${bday.toDateString()}`;
						}).join("\n");
			} else {
				let tulpa = bot.tulpae.getTulpa(msg, args[0]);
				if (!tulpa) {
					out = "You don't have a " + cfg.singular + " with that name registered.";
				} else if (!args[1]) {
					let bday = tulpa.birthday;
					out = bday ? new Date(bday).toDateString() : "No birthday currently set for " + tulpa.name;
				} else if (!(new Date(args[1]).getTime())) {
					out = "I can't understand that date. Please enter in the form MM/DD/YYYY with no spaces.";
				} else {
					let date = new Date(args[1]);
					tulpa.birthday = date.getTime();
					bot.configuration.markDirty("users");
					out = `${tulpa.name}'s birthday set to ${date.toDateString()}.`;
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}