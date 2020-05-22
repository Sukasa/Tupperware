module.exports = function (bot) {
	let confirmationCodes = {};

	const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

	return {
		help: cfg => `GDPR information and commands`,
		usage: cfg => [`gdpr policy - See the bot's GDPR policy`,
			`gdpr export - Be DM'd all data the bot has regarding you`,
			`gdpr delete - Request that the bot delete all information regarding you and any registered ${cfg.plural}.`],
		permitted: () => true,
		desc: cfg => "Information and commands related to the European GDPR regulations",
		execute: async (msg, args, cfg) => {
			

			if (!args[0])
				return bot.commands.help.execute(msg, ["gdpr"], cfg);

			let out;

			switch (args[0].toLowerCase()) {
				case "policy":
					out = [`This bot includes best-effort compliance with European GDPR regulations.  No user data is collected or stored until you opt in by registering ${cfg.singularArticle} ${cfg.singular}.`,
						`The Eris library that this bot is based on may collect user information such as nickname, Discord Id, username, discriminator, et al as necessary for its operation, however this data`,
						`is neither retransmitted, processed, or stored outside of what is minimally necessary to interoperate with Discord's API.`
					].join('\n');
					break;
				case "delete":
					if (args[1]) {
						let id = bot.tulpae.getUser(msg).id;
						let code = confirmationCodes[id];
						if (!code)
							throw "That code has expired or is not applicable to you.";
						if (args[1] != code)
							throw "That code is invalid or is not applicable to you.";

						bot.tulpae.userGDPR(msg);
						delete confirmationCodes[id];

						out = "GDPR deletion complete.";
					} else {
						let id = bot.tulpae.getUser(msg).id;
						let code = Math.random().toString(36).substring(2, 8);
						confirmationCodes[id] = code;
						out = `Are you sure you wish for this bot to delete ALL data relevant to you?  This will unregister ALL of your ${cfg.plural} and cannot be undone!\nPlease say \`${cfg.prefix}gdpr delete ${code}\` to confirm this operation.`;
					}
					break;
				case "export":

					let channel = await msg.author.getDMChannel();					
					let splits = JSON.stringify(bot.tulpae.getUser(msg), null, 1).split("\n");

					let working = "";

					for (s in splits) {
						let split = splits[s];
						if ((working.length + split.length) > 1500) {
							await bot.messaging.send(channel, working);
							await snooze(500);
							working = "";
						}
						working = working + "\n" + split;
					}
					await bot.messaging.send(channel, working);

					out = "Data has been DM'd to you";
					break;
				default:
					out = `Invalid command ${args[0]}`;
			}
			return out;
		}
	};
}