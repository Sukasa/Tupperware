const { article, proper } = require("../components/grammar");


module.exports = {
	help: cfg => "Configure alternate forms for a tulpa (will change `" + cfg.prefix + "avatar`)",
	usage: cfg => [
		"form <name> <formName> - Switch a " + cfg.lang + "'s form",
		"form <name> add <formName> <formUrl> - Add a new named form to a " + cfg.lang + " (4 max)",
		"form <name> remove <formName> - Remove a named form from a " + cfg.lang + ".  Cannot remove their last form",
		"form <name> rename <oldName> <newName> - Rename a form"
	],
	aliases: ["forms"],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		let checkName = (idx) => tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[idx].toLowerCase());

		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["form"], cfg);
		}

		let tulpa = checkName(0);

		if (!tulpa) {
			out = "You don't have a " + cfg.lang + " with that name registered."
		} else {

			tulpa.forms = tulpa.forms || { default: tulpa.url };
			tulpa.currentForm = tulpa.currentForm || "default";

			if (!args[1]) {
				out = `${tulpa.name}'s current forms:`;
				for (var form in tulpa.forms) {
					out = out + "\n`" + form + "`";
					if (tulpa.forms[form] == tulpa.url)
						out = out + " (current)";
				}
			} else {

				switch (args[1].toLowerCase()) {
					case "add":
						if (Object.keys(tulpa.forms).length >= 4) {
							out = "Cannot add more forms - at form limit";
						} else if (["add", "remove", "rename"].includes(args[2])) {
							out = "Cannot add a form named matching a reserved keyword";
						} else if (resolveKey(tulpa.forms, args[2])) {
							out = tulpa.name + " already has a form named " + args[2];
						} else {
							if (!validUrl.isWebUri(args[3])) {
								out = "Malformed url.";
							} else if (args[3].indexOf("imgur.com/a/") != -1) {
								return send(msg.channel, "That is an Imgur album link.  You need to give me the direct URL of the image in that album that you want used");
							} else {
								request(args[3], { method: "HEAD" }, (err, res) => {
									if (err || !res.headers["content-type"] || !res.headers["content-type"].startsWith("image")) return send(msg.channel, "I couldn't find an image at that URL. Make sure it's a direct link (ends in .jpg or .png for example).");
									if (Number(res.headers["content-length"]) > 1000000) {
										return send(msg.channel, "That image is too large and Discord will not accept it. Please use an image under 1 megabyte.");
									}
									tulpa.forms[args[2].toLowerCase()] = args[3];
									save("tulpae", tulpae);
									send(msg.channel, "Added new form.  Select this form with `" + cfg.prefix + "form '" + tulpa.name + "' '" + args[2].toLowerCase() + "'`");
								});
								return;
							}
						}
						break;
					case "remove":
						let formName = resolveKey(tulpa.forms, args[2]);
						if (!formName) {
							out = "No form registered under the name " + args[2] + ".";
						} else if (Object.keys(tulpa.forms).length <= 1) {
							out = "Cannot remove the only registered form.";
						} else {
							delete tulpa.forms[formName];
							out = "Removed form '" + formName + "'.  If this was the active form, please select a new form.";
							save("tulpae", tulpae);
						}
						break;
					case "rename":
						if (!args[3]) {
							out = "Please provide both an old and new name for renaming";
						} else {
							let oldFormName = resolveKey(tulpa.forms, args[2]);
							let newFormName = args[3];

							if (!oldFormName) {
								out = "No form registered under the name " + args[2] + ".";
							} else if (resolveKey(tulpa.forms, newFormName) && oldFormName.toLowerCase() != newFormName.toLowerCase()) {
								out = "Form name " + args[3] + " already registered.";
							} else if (["add", "remove", "rename"].includes(newFormName)) {
								out = "Cannot rename form to match a reserved keyword";
							} else {
								tulpa.forms[newFormName] = tulpa.forms[oldFormName];
								delete tulpa.forms[oldFormName];
								out = "Renamed form '" + args[2] + "' to '" + args[3] + "'.";
								save("tulpae", tulpae);
							}
						}
						break;
					default:
						let selectForm = resolveKey(tulpa.forms, args[1]);
						// Select a form
						if (!selectForm) {
							out = "No form registered with the name '" + args[1] + "'.";
						} else {
							tulpa.url = tulpa.forms[selectForm];
							out = "Switched to form '" + args[1] + "'";
							save("tulpae", tulpae);
						}
				}
			}
		}


		send(msg.channel, out);
	}
}