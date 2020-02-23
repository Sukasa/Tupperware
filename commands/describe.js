const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "View or change a " + cfg.lang + "'s description",
	usage: cfg => ["describe <name> [desc] - if desc is specified, change the " + cfg.lang + "'s describe, if not, simply echo the current one"],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["describe"], cfg);
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (!args[1]) {
			out = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).desc;
		} else {
			tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).desc = args.slice(1).join(" ").slice(0, 500);
			save("tulpae", tulpae);
			out = "Description updated successfully.";
		}
		send(msg.channel, out);
	}
}