const request = require("request");
const validUrl = require("valid-url");

const reserved = ["add", "remove", "rename"];

module.exports = {
	help: cfg => "Configure alternate forms for a " + cfg.singular + " (will change `" + cfg.prefix + "avatar`)",
	usage: cfg => [
		"form <name> <formName> [formUrl] - Switch or update a " + cfg.singular + "'s form",
		"form <name> add <formName> <formUrl> - Add a new named form to a " + cfg.singular + " (4 max)",
		"form <name> remove <formName> - Remove a named form from a " + cfg.singular + ".  Cannot remove their last form",
		"form <name> rename <oldName> <newName> - Rename a form",
		"form <name> list - list forms"
	],
	aliases: ["forms"],
	permitted: () => true,
	execute: function (msg, args, cfg) {
		let out = "";
		args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);

		if (!args[0]) {
			return bot.commands.help.execute(msg, ["form"], cfg);
		}

		let tulpa = bot.tulpae.getTulpae(msg, args[0]);

		if (!tulpa) {
			out = "You don't have a " + cfg.singular + " with that name registered."
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

				let cmd = args[1].toLowerCase();
				if (reserved.in(cmd)) {
					let param1 = args[2];
					let form1 = bot.resolvers.res(tulpa.forms, param1);
					let param2 = args[3];
					let form2 = bot.resolvers.res(tulpa.forms, param2);

					// Command

					switch (cmd) {
						case "add":
							if (tulpa.forms.length >= bot.config.maxForms) {
								out = "Cannot add more forms, at form limit";
							} else if (reserved.includes(param1)) {
								out = "Cannot add a form name matching a reserved keyword";
							} else if (form1) {
								out = tulpa.name + " already has a form matching `" + param1 + "`";
							} else {
								try {
									let url = bot.resolvers.resolveImage(msg);
									tulpa.forms[param1] = url;
									bot.configuration.markDirty("users");
									out = "Added new form.  Select this form with `" + cfg.prefix + "form '" + tulpa.name + "' '" + args[2].toLowerCase() + "'`";
								} catch (ex) {
									out = e;
								}
							}
							break;
						case "remove":
							if (!form1) {
								out = "No forms registered matching " + param1 + ".";
							} else if (tulpa.forms.length <= 1) {
								out = "Cannot remove the only registered form.";
							} else {
								delete tulpa.forms[form1];
								out = "Removed form '" + form1 + "'.  If this was the active form, please select a new form.";
								bot.configuration.markDirty("users");
							}
							break;
						case "rename":
							if (!param2) {
								out = "Please provide both an old and new name for renaming";
							} else {
								if (!form1) {
									out = "No form registered matching " + param1 + ".";
								} else if (form2 && form1.toLowerCase() != form2.toLowerCase()) {
									out = "Form name " + form2 + " already registered.";
								} else if (reserved.includes(param2)) {
									out = "Cannot rename form to match a reserved keyword";
								} else {
									tulpa.forms[param2] = tulpa.forms[form1];
									delete tulpa.forms[form1];
									out = "Renamed form '" + form1 + "' to '" + param2 + "'.";
									bot.configuration.markDirty("users");
								}
							}
							break;
						case "list":
							// TODO
					}

				} else {
					// Change/update form
					let param1 = args[1];
					let form1 = bot.resolvers.resolveKey(tulpa.forms, param1);

					if (!form1) {
						out = "No form registered with the name '" + param1 + "'.";
					} else {
						if (args[2] || msg.attachments[0]) {
							try {
								let url = bot.resolvers.resolveImage(msg);
								tulpa.forms[form1] = url;
								bot.configuration.markDirty("users");
								out = "Form URL updated.  If this is the active form, use `" + cfg.prefix + "form '" + tulpa.name + "' '" + form1 + "'` to apply the change";
							} catch (ex) {
								out = e;
							}
						} else {
							tulpa.url = tulpa.forms[form1];
							out = "Switched to form '" + form1 + "'";
							bot.configuration.markDirty("users");
						}
					}
				}

			}
		}


		bot.messaging.send(msg.channel, out);
	}
}