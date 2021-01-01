const reserved = ["add", "remove", "rename", "list", "listurls"];

module.exports = function (bot) {
	return {
		help: cfg => `Configure alternate forms for ${cfg.singularArticle} ${cfg.singular}  (will change \`${cfg.prefix}avatar\`)`,
		usage: cfg => [
			`form <name> <formName> [formUrl] - Switch or update ${cfg.singularArticle} ${cfg.singular}'s form`,
			`form <name> add <formName> <formUrl> - Add a new named form to ${cfg.singularArticle} ${cfg.singular} (${bot.config.maxForms} max)`,
			`form <name> remove <formName> - Remove a named form from ${cfg.singularArticle} ${cfg.singular}.  Cannot remove their last form`,
			`form <name> rename <oldName> <newName> - Rename ${cfg.singularArticle} ${cfg.singular}'s form`,
			`form <name> [list] - list ${cfg.singularArticle} ${cfg.singular}'s forms, including active form if set`
		],
		aliases: ["forms"],
		permitted: () => true,
		execute: async (msg, args, cfg) => {
			let out = "";
			

			if (!args[0]) 
				return bot.commands.help.execute(msg, ["form"], cfg);
			

			let tulpa = bot.tulpae.getTulpa(msg, args[0]);

			if (!tulpa)
				throw `You don't have ${cfg.singularArticle} ${cfg.singular} with that name registered.`;


			tulpa.forms = tulpa.forms || { default: tulpa.url };

			if (!args[1] || args[1].toLowerCase() == "list") {
				out = `${tulpa.name}'s current forms:`;
				for (var form in tulpa.forms) {
					out = out + "\n`" + form + "`";
					if (tulpa.forms[form] == tulpa.url)
						out = out + " (current)";
				}
			} else {

				let cmd = args[1].toLowerCase();
				if (reserved.includes(cmd)) {
					let param1 = args[2];
					let form1 = bot.resolvers.resolveKey(tulpa.forms, param1);
					let param2 = args[3];
					let form2 = bot.resolvers.resolveKey(tulpa.forms, param2);

					// Command

					switch (cmd) {
						case "add":
							if (Object.keys(tulpa.forms).length >= bot.config.maxForms)
								throw `Cannot add more than ${bot.config.maxForms} forms`;

							if (reserved.includes(param1))
								throw "Cannot add a form name matching a reserved keyword";

							if (form1)
								throw `${tulpa.name} already has a form matching '${param1}'`;

							let url = await bot.resolvers.resolveImage(msg);
							tulpa.forms[param1] = url;
							bot.configuration.markDirty("hosts");
							out = `Added new form.  Select this form with \`${cfg.prefix}form ${tulpa.name} ${args[2].toLowerCase()}\``;

							break;
						case "remove":
							if (!form1)
								throw `No forms registered matching '${param1}'.`;

							if (tulpa.forms.length <= 1)
								throw "Cannot remove the only registered form.";

							delete tulpa.forms[form1];
							out = `Removed form '${form1}'.  If this was the active form, please select a new form.`;
							bot.configuration.markDirty("hosts");

							break;
						case "rename":
							if (!param2)
								throw "Please provide both an old and new name for renaming";

							if (!form1)
								throw `No form registered matching ${Param1}'.`;

							if (form2 && form1.toLowerCase() != form2.toLowerCase())
								throw `Form name ${form2} already registered.`;

							if (reserved.includes(param2))
								throw "Cannot rename form to match a reserved keyword";

							tulpa.forms[param2] = tulpa.forms[form1];
							delete tulpa.forms[form1];
							out = "Renamed form '" + form1 + "' to '" + param2 + "'.";
							bot.configuration.markDirty("hosts");


							break;
						case "listurls":

							out = `${tulpa.name}'s current forms:`;
							for (var form in tulpa.forms) {
								out = out + `\n\`${form}\`: \`${tulpa.forms[form]}\``;
								if (tulpa.forms[form] == tulpa.url)
									out = out + " (current)";
							}

							break;
						case "list":
							// Handled above.
							break;
					}

				} else {
					// Change/update form
					let param1 = args[1];
					let form1 = bot.resolvers.resolveKey(tulpa.forms, param1);

					if (!form1)
						throw `No form registered with the name '${param1}'.`;

					if (args[2] || msg.attachments[0]) {

						let active = tulpa.forms[form1] == tulpa.url;
						tulpa.forms[form1] = await bot.resolvers.resolveImage(msg)
						bot.configuration.markDirty("hosts");
						if (active) {
							tulpa.url = tulpa.forms[form1];
							out = "Current form updated.";
						} else
							out = "Form URL updated.";
					} else {
						tulpa.url = tulpa.forms[form1];
						out = "Switched to form '" + form1 + "'";
						bot.configuration.markDirty("hosts");
					}

				}
			}

			return out;
		}
	};
}