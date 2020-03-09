module.exports = function (bot) {
	return {
		help: () => "Get the bot's invite URL",
		usage: () => ["invite - sends the bot's oauth2 URL in this channel"],
		permitted: () => bot.config.inviteCode != null,
		execute: () => `https://discordapp.com/api/oauth2/authorize?client_id=${bot.config.inviteCode}&permissions=805314560&scope=bot`
	};
}