const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Change a " + cfg.lang + "'s name",
	usage: cfg => ["rename <name> <newname> - Set a new name for the " + cfg.lang + ""],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["rename"], cfg);
		} else if (!args[1]) {
			out = "Missing argument 'newname'.";
		} else if (args[1].length < 2 || args[1].length > 28) {
			out = "New name must be between 2 and 28 characters.";
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[1].toLowerCase())) {
			out = "You already have a " + cfg.lang + " with that new name.";
		} else {
			tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).name = args[1];
			save("tulpae", tulpae);
			out = proper(cfg.lang) + " renamed successfully.";
		}
		send(msg.channel, out);
	}
}