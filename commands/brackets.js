const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "View or change a " + cfg.lang + "'s brackets",
	usage: cfg => ["brackets[alternate [#]] <name> [brackets] - if brackets are given, change the " + cfg.lang + "'s brackets, if not, simply echo the current one.  Can also specify alternate brackets, starting from 1.  Omit # to default to alternate 1"],
	desc: cfg => "Brackets must be the word 'text' surrounded by any symbols or letters, i.e. `[text]` or `>>text`",
	permitted: () => true,
	execute: function (msg, args, cfg) {

		let checkName = (idx) => tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[idx].toLowerCase());

		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["brackets"], cfg);
		} else if (args[0].toLowerCase() == "alternate" && (checkName(1) || (!isNaN(args[1]) && checkName(2)))) { // If we're prefixing 'alternate', and can find a valid name later down the line...
			const reducer = (a, c) => a + ", " + c;

			let nameIndex = checkName(1) ? 1 : 2;
			let tupper = checkName(nameIndex);

			let alternate = nameIndex == 2 ? Math.floor(Number(args[1])) : 1;

			if (alternate < 1) {
				out = "Cannot address this alternate";
			} else if (alternate > 4) {
				out = "YOu are limited to 4 alternates at this time";
			} else {
				let brackets = args.slice(nameIndex + 1).join(" ").split("text");

				if (brackets.length == 1 && brackets[0] == "") {
					tupper.alternates = tupper.alternates || Array();

					if (tupper.alternates.length >= alternate) {
						out = `Alternate brackets for ${tupper.name}: ${tupper.alternates[alternate - 1][0]}text${tupper.alternates[alternate - 1][1]}`;
					} else {
						out = "Unable to display alternate; does not exist";
					}
				} else if (brackets.length == 1 && brackets[0] == "remove") {
					tupper.alternates = tupper.alternates || Array();

					if (tupper.alternates.length >= alternate) {
						out = `Removing alternate bracket set ${alternate}`;
						tupper.alternates.splice(alternate - 1, 1);
						save("tulpae", tulpae);
					} else {
						out = "Unable to remove alternate; does not exist";
					}
				} else if (brackets.length < 2) {
					out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
				} else if (!brackets[0] && !brackets[1]) {
					out = "Need something surrounding 'text'.";
				} else {
					tupper.alternates = tupper.alternates || Array();
					tupper.alternates[alternate - 1] = brackets;
					save("tulpae", tulpae);
					out = "Alternate brackets updated successfully.";
				}
			}
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (!args[1]) {
			let brackets = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).brackets;
			out = `Brackets for ${args[0]}: ${brackets[0]}text${brackets[1]}`;
		} else {
			let brackets = args.slice(1).join(" ").split("text");
			if (brackets.length < 2) {
				out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
			} else if (!brackets[0] && !brackets[1]) {
				out = "Need something surrounding 'text'.";
			} else {
				tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).brackets = brackets;
				save("tulpae", tulpae);
				out = "Brackets updated successfully.";
			}
		}
		send(msg.channel, out);
	}
}