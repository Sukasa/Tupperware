const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Unregister a " + cfg.lang + "",
	aliases: ["unregister"],
	usage: cfg => ["remove <name> - Unregister the named " + cfg.lang + " from your list"],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		let name = args.join(" ");
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["remove"], cfg);
		} else if (!tulpae[msg.author.id]) {
			out = "You do not have any " + cfg.lang + "s registered.";
		} else if (!tulpae[msg.author.id].find(t => t.name.toLowerCase() == name.toLowerCase())) {
			out = "Could not find " + cfg.lang + " with that name registered under your account.";
		} else {
			out = proper(cfg.lang) + " unregistered.";
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