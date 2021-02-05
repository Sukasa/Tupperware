module.exports = function (bot) {

	async function Run(message, emoji, user) {
				
		if (emoji.name == "❌" && bot.messaging.isRecent(message, user.id)) {

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