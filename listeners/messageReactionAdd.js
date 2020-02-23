module.exports = function (bot) {

	async function Run(message, emoji, userID) {
		if (emoji.name == "\u274c" && bot.messaging.isRecent(message, userID)) {

			if (!message.channel.guild || message.channel.permissionsOf(bot.user.id).has("manageMessages")) {
				bot.deleteMessage(message.channel.id, message.id).catch(e => { if (e.code != 10008) throw e; });
			}

			return;
		}
	};

	return {
		exec: Run
	};
}