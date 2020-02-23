modules.exports = function (bot) {
	return {
		help: () => "Get the bot's invite URL",
		usage: () => ["invite - sends the bot's oauth2 URL in this channel"],
		permitted: () => bot.auth.inviteCode != null,
		execute: function (msg) {
			send(msg.channel, `https://discordapp.com/api/oauth2/authorize?client_id=${auth.inviteCode}&permissions=805314560&scope=bot`);
		}
	}
};