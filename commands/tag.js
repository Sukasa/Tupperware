const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Remove or change a " + cfg.lang + "'s tag (displayed next to name when proxying)",
	usage: cfg => ["tag <name> [tag] - if tag is given, change the " + cfg.lang + "'s tag, if not, clear the tag"],
	desc: cfg => "A " + cfg.lang + "'s tag is shown next to their name when speaking.",
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["tag"], cfg);
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (!args[1]) {
			delete tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).tag;
			save("tulpae", tulpae);
			out = "Tag cleared.";
		} else if (args.slice(1).join(" ").length + tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).name.length > 27) {
			out = "That tag is too long to use with that " + cfg.lang + "'s name. The combined total must be less than 28 characters.";
		} else {
			tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).tag = args.slice(1).join(" ");
			save("tulpae", tulpae);
			out = "Tag updated successfully.";
		}
		send(msg.channel, out);
	}
}