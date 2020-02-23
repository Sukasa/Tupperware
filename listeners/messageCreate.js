// TODO this one's special.  I'll need to make it check all the messageHandlers and invoke test() on them.  Then for the one with the highest priority, call execute() on it
// TODO: allow passing data from test() to execute() where that makes sense (tulpa checks)

const aniRegex = /^<a:[^\s:]+:\d+>$/mi;

async function replaceMessage(msg, cfg, tulpa, content) {
	const hook = await fetchWebhook(msg.channel);
	const data = {
		wait: true,
		content: content,
		username: `${tulpa.name} ${tulpa.tag ? tulpa.tag : ""} ${checkTulpaBirthday(tulpa) ? "\uD83C\uDF70" : ""}`,
		avatarURL: tulpa.url,
	};

	if (recent[msg.channel.id] && msg.author.id !== recent[msg.channel.id][0].userID && data.username === recent[msg.channel.id][0].name) {
		data.username = data.username.substring(0, 1) + "\u200a" + data.username.substring(1);
	}

	if (msg.attachments[0]) {
		return sendAttachmentsWebhook(msg, cfg, data, content, hook);
	}

	let webmsg;
	try {
		webmsg = await bot.executeWebhook(hook.id, hook.token, data);
	} catch (e) {
		console.log(e);
		if (e.code === 10015) {
			delete webhooks[msg.channel.id];
			const hook = await fetchWebhook(msg.channel);
			return bot.executeWebhook(hook.id, hook.token, data);
		}
	}

	if (cfg.log && msg.channel.guild.channels.has(cfg.log)) {
		send(msg.channel.guild.channels.get(cfg.log),
			`Name: ${tulpa.name}\nRegistered by: ${msg.author.username}#${msg.author.discriminator}\nChannel: <#${msg.channel.id}>\nMessage: ${content}`);
	}

	if (!tulpa.posts) tulpa.posts = 0;
	tulpa.posts++;
	if (!recent[msg.channel.id] && !msg.channel.permissionsOf(bot.user.id).has("manageMessages")) {
		send(msg.channel, `Warning: I do not have permission to delete messages. Both the original message and ${cfg.lang} webhook message will show.`);
	}
	recent[msg.channel.id] = recent[msg.channel.id] || [];
	recent[msg.channel.id].unshift({
		userID: msg.author.id,
		name: data.username,
		tulpa: tulpa,
		id: webmsg.id,
		tag: `${msg.author.username}#${msg.author.discriminator}`
	});
	recent[msg.channel.id] = recent[msg.channel.id].slice(0, 8)
}


module.exports = async (msg, bot) => {
	if (msg.author.bot) return;
	if (msg.channel instanceof Eris.PrivateChannel)
		return send(msg.channel, "Use of this bot via private message has been disabled");



	let cfg = msg.channel.guild && config[msg.channel.guild.id] || { prefix: "t!", rolesEnabled: false, lang: "tulpa" };

	if (tulpae[msg.author.id] && !(msg.channel instanceof Eris.PrivateChannel) && (!cfg.blacklist || !cfg.blacklist.includes(msg.channel.id))) {
		let clean = msg.cleanContent || msg.content;
		if (aniRegex.test(clean))
			return;
		clean = clean.replace(/(<:.+?:\d+?>)|(<@!?\d+?>)/, "cleaned");
		let cleanarr = clean.split("\n");
		let lines = msg.content.split("\n");
		let replace = [];
		let bracketSet = null;
		for (let i = 0; i < lines.length; i++) {
			tulpae[msg.author.id].forEach(t => {
				if (bracketSet = checkTulpa(msg, t, cleanarr[i])) {
					replace.push([msg, cfg, t, lines[i].substring(bracketSet[0].length, lines[i].length - bracketSet[1].length)]);
				}
			});
		}

		if (replace.length < 2) replace = [];

		if (!replace[0]) {
			for (let t of tulpae[msg.author.id]) {
				if (bracketSet = checkTulpa(msg, t, clean)) {
					replace.push([msg, cfg, t, msg.content.substring(bracketSet[0].length, msg.content.length - bracketSet[1].length)]);
					break;
				}
			}
			if (!replace[0]) {
				// TODO check if we have a default set for the server
			}
		}

		if (replace[0]) {
			Promise.all(replace.map(r => replaceMessage(...r)))
				.then(() => {
					if (msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
						msg.delete().catch(e => { if (e.code == 50013) { send(msg.channel, "Warning: I'm missing permissions needed to properly replace messages."); } });
					save("tulpae", tulpae);
				}).catch(e => send(msg.channel, e));
		}
	}
}