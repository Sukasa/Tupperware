const { article, proper } = require("../components/grammar");
const zwsp = String.fromCharCode(8203); //zero-width space for embed formatting

modules.exports = {
	help: () => "Print this message, or get help for a specific command",
	usage: () => ["help - print list of commands",
		"help [command] - get help on a specific command"],
	permitted: () => true,
	execute: function (message, args, servercfg) {
		let output = "";
		if (args[0]) { //help for a specific command
			if (bot.cmds[args[0]] && checkPermissions(args[0], message, args) && bot.cmds[args[0]].usage) {
				output = {
					embed: {
						title: "Bot Command | " + args[0],
						description: bot.cmds[args[0]].help(servercfg) + "\n\n**Usage:**\n",
						timestamp: new Date().toJSON(),
						color: 0x999999,
						author: {
							name: "Tupperware",
							icon_url: bot.user.avatarURL
						},
						footer: {
							text: "If something is wrapped in <> or [], do not include the brackets when using the command. They indicate whether that part of the command is required <> or optional []."
						}
					}
				};
				for (let u of bot.cmds[args[0]].usage(servercfg))
					output.embed.description += `${servercfg.prefix + u}\n`;
				if (bot.cmds[args[0]].desc)
					output.embed.description += `\n${bot.cmds[args[0]].desc(servercfg)}`;
			} else output += "Command not found.";
		} else { //general help
			output = {
				embed: {
					title: "Tupperbot | Help",
					description: "I am Tupperbot, a bot made to give " + servercfg.lang + "s a voice using Discord webhooks.\nTo get started, register a " + servercfg.lang + " with `" + servercfg.prefix + "register` and enter a message with the brackets you set!\n\n**Command List**\nType `" + servercfg.prefix + "help command` for detailed help on a command.\n" + zwsp + "\n",
					timestamp: new Date().toJSON(),
					color: 0x999999,
					author: {
						name: "Tupperbot",
						icon_url: bot.user.avatarURL
					},
					footer: {
						text: "By Keter#1730, Modifications by Sukasa#1011"
					}
				}
			};
			for (let cmd of Object.keys(bot.cmds)) {
				if (bot.cmds[cmd].help && bot.cmds[cmd].permitted(message, args))
					output.embed.description += `**${servercfg.prefix + cmd}**  -  ${bot.cmds[cmd].help(servercfg)}\n`;
			}
		}
		send(message.channel, output);
	}

}