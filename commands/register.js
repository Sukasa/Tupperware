const { article, proper } = require("../components/grammar");

modules.exports = {
	
	help: cfg => "Register a new " + cfg.lang + "",
	usage: cfg => ["register <name> <brackets> - Register a new " + cfg.lang + ".\n\t<name> - the " + cfg.lang + "'s name, for multi-word names surround this argument in `''`\n\t<brackets> - the word 'text' surrounded by any characters on one or both sides"],
	desc: cfg => "Example use: `register Test >text<` - registers a " + cfg.lang + " named 'Test' that is triggered by messages surrounded by ><\nBrackets can be anything, one sided or both. For example `text<<` and `T:text` are both valid\nNote that you can enter multi-word names by surrounding the full name in apostrophes `''`.",
	permitted: () => true,
	execute: function (msg, args, cfg) {
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		let out = "";
		let brackets = args.slice(1).join(" ").split("text");
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["register"], cfg);
		} else if (!args[1]) {
			out = "Missing argument 'brackets'. Try `" + cfg.prefix + "help register` for usage details.";
		} else if (args[0].length < 2 || args[0].length > 28) {
			out = "Name must be between 2 and 28 characters.";
		} else if (brackets.length < 2) {
			out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
		} else if (!brackets[0] && !brackets[1]) {
			out = "Need something surrounding 'text'.";
		} else if (tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name === args[0])) {
			out = proper(cfg.lang) + " with that name under your user account already exists.";
		} else if (tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.brackets[0] == brackets[0] && t.brackets[1] == brackets[1])) {
			out = proper(cfg.lang) + " with those brackets under your user account already exists.";
		} else {
			if (!tulpae[msg.author.id]) tulpae[msg.author.id] = [];
			let tulpa = {
				name: args[0],
				url: "https://i.imgur.com/ZpijZpg.png",
				brackets: brackets,
				posts: 0,
				host: msg.author.id,
				alternates: Array()
			};
			tulpae[msg.author.id].push(tulpa);
			let guilds = Object.keys(config).filter(id => config[id].rolesEnabled && bot.guilds.has(id) && bot.guilds.get(id).members.has(msg.author.id)).map(id => bot.guilds.get(id));
			if (guilds[0]) {
				tulpa.roles = {};
				Promise.all(guilds.map(g => {
					return g.createRole({ name: tulpa.name, mentionable: true }).then(r => {
						tulpa.roles[g.id] = r.id;
						g.members.get(msg.author.id).addRole(r.id);
					});
				})).then(() => {
					save("tulpae", tulpae);
				});
			}
			save("tulpae", tulpae);
			out = proper(cfg.lang) + " registered successfully!\nName: " + tulpa.name + "\nBrackets: " + `${brackets[0]}text${brackets[1]}` + "\nUse `" + cfg.prefix + "rename`, `" + cfg.prefix + "brackets`, `" + cfg.prefix + "avatar`, and `" + cfg.prefix + "form` to set/update your " + cfg.lang + "'s info.";
		}
		send(msg.channel, out);
	}
}