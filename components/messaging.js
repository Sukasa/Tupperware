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

	function addRecent(userMsg, botMsg, data) {
		
		recent[userMsg.channel.id] = recent[userMsg.channel.id] || [];
		recent[userMsg.channel.id].unshift({
			userID: userMsg.author.id,
			name: data ? data.username : tulpa.name,
			tulpa: data.tulpa,
			data: data,
			id: botMsg.id,
			tag: `${userMsg.author.username}#${userMsg.author.discriminator}`
		});
		recent[userMsg.channel.id] = recent[userMsg.channel.id].slice(0, 8);
	};

	function isRecent(msg, userID) {
		
		
		return recent && recent[msg.channel.id] && recent[msg.channel.id].find(r => r.userID == userID && msg.id == r.id);
	}

	// Checks if two dissimilar users might get merged by accident.  Also checks in case the avatar URL has changed (Form, etc)
	function isUsernameCollision(msg, username, url) {
		return recent && recent[msg.channel.id] && recent[msg.channel.id][0].userID != msg.author.id && recent[msg.channel.id][0].data && recent[msg.channel.id][0].data.username == username && recent[msg.channel.id][0].data.avatarURL != url;
	}

	function getRecent(channel) {
		channel = channel.channel || channel;
		channel = channel.id || channel;
		recent[channel] = recent[channel] || [];

		return recent[channel][0];
	}

	return {
		send: send,
		addRecent: addRecent,
		isRecent: isRecent,
		getRecent: getRecent,
		isUsernameCollision: isUsernameCollision
	};
}