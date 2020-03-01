module.exports = function (bot) {
	const aniRegex = /^<a:[^\s:]+:\d+>$/mi;
	const priorities = bot.priorities;

	function checkTulpa(msg, tulpa, clean) {

		let check = brackets => (clean.startsWith(brackets[0]) && clean.endsWith(brackets[1]))
			&& (msg.attachments[0] ?
				clean.length >= (brackets[0].length + brackets[1].length) :
				clean.length > (brackets[0].length + brackets[1].length));

		for (idx in tulpa.brackets) {
			if (check(tulpa.brackets[idx]))
				return tulpa.brackets[idx];
		}

		return false;
	}

	function test(msg, bot) {
		let clean = msg.cleanContent || msg.content;
		if (aniRegex.test(clean))
			return false;

		clean = clean.replace(/(<:.+?:\d+?>)|(<@!?\d+?>)/, "cleaned");
		let cleanLines = clean.split("\n");
		let lines = msg.content.split("\n");
		let replace = [];
		let cfg = bot.configuration.getServerConfig(msg);
		let user = bot.tulpae.getUser(msg);

		// First, attempt matching line-by-line to see if someone has put multiple tulpa's responses in one message
		for (var i = 0; i < cleanLines.length; i++) {
			var line = cleanLines[i];
			user.tulpae.forEach(tulpa => {
				if (bracketSet = checkTulpa(msg, tulpa, line)) {
					replace.push([msg, cfg, tulpa, lines[i].substring(bracketSet[0].length, lines[i].length - bracketSet[1].length)]);
				}
			});
		}

		// If only one tulpa matched, or none matched line-by-line, then clear the replacement array and redo the checks
		if (replace.length < 2) replace = [];

		// First, check the message as a whole
		if (!replace[0]) {
			user.tulpae.forEach(tulpa => {
				if (bracketSet = checkTulpa(msg, tulpa, clean)) {
					replace.push([msg, cfg, tulpa, msg.content.substring(bracketSet[0].length, msg.content.length - bracketSet[1].length)]);
					break;
				}
			});
		}

		// If we still had no tulpa match, then see if the user has a default tulpa set for the server
		if (!replace[0]) {
			if (user.defaults[msg.channel.guild.id]) {
				replace.push([msg, cfg, user.defaults[msg.channel.guild.id], msg.content]);
			}
		}

		// If we found match(es), return the array as a signal we can handle the message here (this will be passed to exec() as the state, so it's useful)
		if (replace[0])
			return replace;

		// Otherwise return false as a signal we can't handle the message here.
		return false;
	}

	async function createTulpaMessage(msg, cfg, tulpa, content) {
		const hook = await bot.serverWebhooks.fetchWebhook(msg.channel);
		const data = {
			wait: true,
			content: content,
			username: `${tulpa.name} ${tulpa.tag ? tulpa.tag : ""} ${bot.tulpae.checkBirthday(tulpa) ? "\uD83C\uDF70" : ""}`,
			avatarURL: tulpa.url,
			tulpa: tulpa
		};

		// If two tulpae with the same name but different hosts talk, then make sure the messages can't merge
		if (bot.messaging.isUsernameCollision(msg, data.username)) {
			data.username = data.username.substring(0, 1) + "\u200a" + data.username.substring(1);
		}

		// Add one post for that tulpa
		tulpa.posts++;

		// If there's an attachment, handle that separately
		if (msg.attachments[0]) {
			return bot.webhooks.sendAttachmentsWebhook(msg, cfg, data, content, hook);
		}

		// Otherwise post to the channel via webhook
		let webmsg;
		try {
			webmsg = await bot.executeWebhook(hook.id, hook.token, data);
		} catch (e) {
			console.log(e);
			if (e.code === 10015) {
				delete bot.serverWebhooks[msg.channel.id];
				const hook = await bot.webhooks.fetchWebhook(msg.channel);
				return bot.executeWebhook(hook.id, hook.token, data);
			}
		}

		// Then log the message
		bot.logging.logMessage(msg, content, tulpa);

		// Now handle recent updating
		bot.messaging.addRecent(msg, webmsg);
	}

	async function execute(msg, bot, state) {
		Promise.all(state.map(r => createTulpaMessage(...r)))
			.then(() => {
				if (msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
					msg.delete().catch(e => { if (e.code == 50013) { bot.messaging.send(msg.channel, "Warning: I'm missing permissions needed to properly replace messages."); } });
				bot.configuration.markDirty("users");
			}).catch(e => bot.messaging.send(msg.channel, e));
	}

	return {
		priority: priorities.LOWEST,
		inDMs: false,
		test: test,
		execute: execute
	};
}