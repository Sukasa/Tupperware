var recent = {};

module.exports = function (bot) {
	function send(channel, message, file, typing) {
		if (typing) {
			return channel.sendTyping().then(() => {
				setTimeout(() => channel.createMessage(message, file), Math.min(6 * message.length + 750, 4000));
			});
		} else {
			channel.createMessage(message, file);
		}
	};

	function addRecent(userMsg, botMsg) {
		recent[userMsg.channel.id] = recent[userMsg.channel.id] || [];
		recent[userMsg.channel.id].unshift({
			userID: userMsg.author.id,
			name: data.username,
			tulpa: tulpa,
			id: botMsg.id,
			tag: `${userMsg.author.username}#${userMsg.author.discriminator}`
		});
		recent[userMsg.channel.id] = recent[userMsg.channel.id].slice(0, 8);
	};

	function isRecent(msg, userID) {
		return recent && recent[msg.chann.id] && recent[msg.channel.id].find(r => r.userID == userID && msg.id == r.id);
	}

	return {
		send: send,
		addRecent: addRecent,
		isRecent: isRecent
	};
}