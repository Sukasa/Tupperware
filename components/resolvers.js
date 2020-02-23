module.exports = function (bot) {
	function resolveKey(haystack, needle) {
		for (var key in haystack)
			if (key.toLowerCase() == needle.toLowerCase())
				return key;
		return null;
	};

	function resolveUser(msg, text) {
		let target = bot.users.get(/<@!?(\d+)>/.test(text) && text.match(/<@!?(\d+)>/)[1]) || bot.users.get(text) || msg.channel.guild.members.find(m => m.username.toLowerCase() == text.toLowerCase() || (m.nick && m.nick.toLowerCase()) == text.toLowerCase() || text.toLowerCase() == `${m.username.toLowerCase()}#${m.discriminator}`);
		if (target && target.user) target = target.user;
		return target;
	};

	function getMatches(string, regex) {
		var matches = [];
		var match;
		while (match = regex.exec(string)) {
			match.splice(1).forEach(m => { if (m) matches.push(m); });
		}
		return matches;
	};

	function resolveChannel(msg, text) {
		let g = msg.channel.guild;
		return g.channels.get(/<#(\d+)>/.test(text) && text.match(/<#(\d+)>/)[1]) || g.channels.get(text) || g.channels.find(m => m.name.toLowerCase() == text.toLowerCase());
	};

	return {
		resolveKey: resolveKey,
		resolveUser: resolveUser,
		resolveChannel: resolveChannel,
		getMatches: getMatches,
	};		
}