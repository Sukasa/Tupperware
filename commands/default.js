const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Configure a default " + cfg.lang + " to use on this server if no prefixes are included",
	usage: cfg => ["default <name> - Set the named " + cfg.lang + " as default for this server",
	"default clear - Unset the default " + cfg.lang + " as default for this server"],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		let name = args.join(" ");
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["default"], cfg);
		} else if (args[0].toLowerCase() == "clear") {
			out = "Default " + cfg.lang + " cleared.";
		} else if (!tulpae[msg.author.id]) {
			out = "You do not have any " + cfg.lang + "s registered.";
		} else if (!tulpae[msg.author.id].find(t => t.name.toLowerCase() == name.toLowerCase())) {
			out = "Could not find " + cfg.lang + " with that name registered under your account.";
		} else {
			out = proper(cfg.lang) + " set as default.";
			let arr = tulpae[msg.author.id];

			let tul = arr.find(t => t.name.toLowerCase() == name.toLowerCase());
			Object.keys(config).filter(t => config[t].rolesEnabled && bot.guilds.has(t)).map(t => bot.guilds.get(t)).forEach(g => {
				if (tul.roles && tul.roles[g.id]) g.deleteRole(tul.roles[g.id]);
			});
			arr.splice(arr.indexOf(tul), 1);
			save("tulpae", tulpae);
		}
		send(msg.channel, out);
	}
}