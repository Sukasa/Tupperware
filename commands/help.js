const zwsp = String.fromCharCode(8203); //zero-width space for embed formatting

module.exports = function (bot) {


	// TODO crash 
	function checkPermissions(cmd, msg, args) {
		return (msg.author.id === bot.config.owner) || (bot.commands[cmd].permitted(msg, args));
	};

	return {
		help: () => "Print this message, or get help for a specific command",
		usage: () => ["help - print list of commands",
			"help [command] - get help on a specific command"],
		permitted: () => true,
		execute: function (message, args, servercfg) {
			let output = "";
			if (args[0]) { //help for a specific command
				if (bot.commands[args[0]] && checkPermissions(args[0], message, args) && bot.commands[args[0]].usage) {
					output = {
						embed: {
							title: "Bot Command | " + args[0],
							description: bot.commands[args[0]].help(servercfg) + "\n\n**Usage:**\n",
							timestamp: new Date().toJSON(),
							color: 0x999999,
							author: {
								name: bot.config.name,
								icon_url: bot.user.avatarURL
							},
							footer: {
								text: "If something is wrapped in <> or [], do not include the brackets when using the command. They indicate whether that part of the command is <required> or [optional]."
							}
						}
					};
					for (let u of bot.commands[args[0]].usage(servercfg))
						output.embed.description += `${servercfg.prefix + u}\n`;
					if (bot.commands[args[0]].desc)
						output.embed.description += `\n${bot.commands[args[0]].desc(servercfg)}`;
				} else output += "Command not found.";
			} else { //general help
				output = {
					embed: {
						title: `${bot.config.name} | Help`,
						description: `I am ${bot.config.name}, a bot made to give ` + servercfg.plural + " a voice using Discord webhooks.\nTo get started, register a " + servercfg.singular + " with `" + servercfg.prefix + "register` and enter a message with the brackets you set!\n\n**Command List**\nType `" + servercfg.prefix + "help command` for detailed help on a command.\n" + zwsp + "\n",
						timestamp: new Date().toJSON(),
						color: 0x999999,
						author: {
							name: bot.config.name,
							icon_url: bot.user.avatarURL
						},
						footer: {
							text: "By Sukasa#1011, original by Kartelant https://github.com/Sukasa/Tupperware"
						}
					}
				};
				for (let cmd of Object.keys(bot.commands)) {
					if (bot.commands[cmd].help && bot.commands[cmd].permitted(message, args))
						output.embed.description += `**${servercfg.prefix + cmd}**  -  ${bot.commands[cmd].help(servercfg)}\n`;
				}
			}
			bot.messaging.send(message.channel, output);
		}

	};
}