module.exports = async (message, emoji, userID, bot) => {
	if (emoji.name == "\u274c" && bot.recent[message.channel.id] && bot.recent[message.channel.id].find(r => r.userID == userID && message.id == r.id)) {

		if (!message.channel.guild || message.channel.permissionsOf(bot.user.id).has("manageMessages")) {
			bot.deleteMessage(message.channel.id, message.id).catch(e => { if (e.code != 10008) throw e; });
		}

		return;
	}
}