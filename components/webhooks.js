const request = require("got");

module.exports = function (bot) {
	function fetchWebhook(channel) {
		return new Promise((resolve, reject) => {
			if (bot.serverWebhooks[channel.id])
				resolve(bot.serverWebhooks[channel.id]);
			else if (!channel.permissionsOf(bot.user.id).has("manageWebhooks"))
				reject("Proxy failed: Missing 'Manage Webhooks' permission in this channel.");
			else {
				channel.createWebhook({ name: "Tupperhook" }).then(hook => {
					bot.serverWebhooks[channel.id] = { id: hook.id, token: hook.token };
					resolve(bot.serverWebhooks[channel.id]);
					bot.configuration.markDirty("serverWebhooks");
				}).catch(e => { reject("Proxy failed with unknown reason: Error " + e.code); });
			}
		});
	}

	async function attach(url) {
		return (await request(url, { encoding: null })).body;
	}

	async function sendAttachmentsWebhook(msg, cfg, data) {
		let hook = await fetchWebhook(msg.channel);
		let files = [];
		for (let i = 0; i < msg.attachments.length; i++) {
			files.push({ file: await attach(msg.attachments[i].url), name: msg.attachments[i].filename });
		}
		data.file = files;
		return new Promise((resolve, reject) => {
			bot.executeWebhook(hook.id, hook.token, data)
				.catch(e => {
					console.log(e);
					if (e.code == 10015) {
						delete bot.serverWebhooks[msg.channel.id];
						return fetchWebhook(msg.channel).then(hook => {
							return bot.executeWebhook(hook.id, hook.token, data);
						}).catch(e => reject("Webhook deleted and error creating new one. Check my permissions?"));
					}
				}).then(() => {
					bot.logging.logMessage(msg, data.content, data.tulpa)

					// TODO tulpa stats elsewhere
					//if (!tulpa.posts)
					//	tulpa.posts = 0;
					//tulpa.posts++;

					// TODO recent check
					if (!recent[msg.channel.id] && !msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
						bot.messaging.send(msg.channel, "Warning: I do not have permission to delete messages. Both the original message and " + cfg.singular + " webhook message will show.");
					bot.messaging.addRecent(msg, webmsg, data);

					resolve();
				}).catch(reject);
		});
	};


	return {
		sendAttachment: sendAttachmentsWebhook,
		fetchWebhook: fetchWebhook
	};
}

