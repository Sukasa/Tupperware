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

	function test(msg) {
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
			Object.values(user.tulpae).forEach(tulpa => {
				if (bracketSet = checkTulpa(msg, tulpa, line)) {
					replace.push([msg, cfg, tulpa, lines[i].substring(bracketSet[0].length, lines[i].length - bracketSet[1].length)]);
				}
			});
		}

		// If only one tulpa matched, or none matched line-by-line, then clear the replacement array and redo the checks
		if (replace.length < 2) replace = [];

		// First, check the message as a whole
		if (!replace[0]) {
			Object.values(user.tulpae).find(tulpa => {
				if (bracketSet = checkTulpa(msg, tulpa, clean)) {
					replace.push([msg, cfg, tulpa, msg.content.substring(bracketSet[0].length, msg.content.length - bracketSet[1].length)]);
					return true; // return from lambda
				}
			});
		}

		// If we still had no tulpa match, then see if the user has a default tulpa set for the server
		if (!replace[0]) {
			if (user.serverDefaults[msg.channel.guild.id]) {
				let tulpa = bot.tulpae.getTulpa(user, user.serverDefaults[msg.channel.guild.id])
				if (tulpa) // Sanity check
					replace.push([msg, cfg, tulpa, msg.content]);
			}
		}

		// If we found match(es), return the array as a signal we can handle the message here (this will be passed to exec() as the state, so it's useful)
		if (replace[0]) {
			
			// If we have multiple messages from the same tulpa in a row, merge them instead of submitting as separate messages
			for (var i = replace.length - 1; i > 0; i--) {
				if (replace[i - 1][2] == replace[i][2]) {
					replace[i - 1][3] = replace[i - 1][3] + "\n" + replace[i][3];
					replace.splice(i, 1);
				}
			}

			return replace;
		}

		// Otherwise return false as a signal we can't handle the message here.
		return false;
	}

	async function createTulpaMessage(msg, cfg, tulpa, content) {
		const hook = await bot.webhooks.fetchWebhook(msg.channel);
		const data = {
			wait: true,
			content: content,
			username: `${tulpa.name.replace(/(c)(lyde)/gi, "$1\u200a$2")} ${tulpa.tag ? tulpa.tag.replace(/(c)(lyde)/gi, "$1\u200a$2") : ""} ${bot.tulpae.checkBirthday(tulpa) ? "\uD83C\uDF70" : ""}`,
			avatarURL: tulpa.url,
			tulpa: tulpa
		};

		// If two tulpae with the same name but different hosts talk, then make sure the messages can't merge
		if (bot.messaging.isUsernameCollision(msg, data.username)) {
			data.username = data.username.substring(0, 1) + "\u200a" + data.username.substring(1);
		}

		// If there's an attachment, handle that separately
		if (msg.attachments[0]) {
			if (!msg.attachments.some(x => { bot.logger.debug(x.size); return x.size >= 8000000; })) {
				// Add one post for that tulpa
				tulpa.posts++;

				return bot.webhooks.sendAttachment(msg, cfg, data, content, hook);
			}
			return false;
		}

			// Add one post for that tulpa
			tulpa.posts++;

			// Otherwise post to the channel via webhook
			let webmsg;
			try {
				webmsg = await bot.executeWebhook(hook.id, hook.token, data);
			} catch (e) {
				bot.logger.error(e);
				if (e.code === 10015) {
					delete bot.serverWebhooks[msg.channel.id];
					const hook = await bot.webhooks.fetchWebhook(msg.channel);
					bot.executeWebhook(hook.id, hook.token, data);
				}
			}

			// Then log the message
			bot.logging.logMessage(msg, content, tulpa);

			// Now handle recent updating
			bot.messaging.addRecent(msg, webmsg, data);

			return true;
	}

	async function execute(msg, state) {
		Promise.all(state.map(r => createTulpaMessage(...r)))
			.then((result) => {
				if (result.every(x => x == true)) {
					if (msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
						msg.delete().catch(e => { if (e.code == 50013) { throw "Warning: I'm missing permissions needed to properly replace messages."; } });
					bot.configuration.markDirty("hosts");
				}
			}).catch(e => {
				bot.logger.error(e);
			});
	}

	return {
		priority: priorities.LOWEST,
		inDMs: false,
		test: test,
		allowBot: false,
		execute: execute,
		blacklist: (cfg) => cfg.blacklist
	};
}