module.exports = function (bot) {
	var webhooks = bot.webhooks;

	function fetchWebhook(channel) {
		return new Promise((resolve, reject) => {
			if (webhooks[channel.id])
				resolve(webhooks[channel.id]);
			else if (!channel.permissionsOf(_bot.user.id).has("manageWebhooks"))
				reject("Proxy failed: Missing 'Manage Webhooks' permission in this channel.");
			else {
				channel.createWebhook({ name: "Tupperhook" }).then(hook => {
					webhooks[channel.id] = { id: hook.id, token: hook.token };
					resolve(webhooks[channel.id]);
					bot.configuration.save("webhooks", webhooks); // TODO
				}).catch(e => { reject("Proxy failed with unknown reason: Error " + e.code); });
			}
		});
	}

	function attach(url) {
		return new Promise(function (resolve, reject) {
			request({ url: url, encoding: null }, (err, res, data) => {
				console.log(`${url}: ${data.length}`);
				resolve(data);
			});
		});
	}

	async function sendAttachmentsWebhook(msg, cfg, data) {
		let hook = await fetchWebhook(msg.channel);
		let files = [];
		for (let i = 0; i < msg.attachments.length; i++) {
			files.push({ file: await attach(msg.attachments[i].url), name: msg.attachments[i].filename });
		}
		data.file = files;
		return new Promise((resolve, reject) => {
			_bot.executeWebhook(hook.id, hook.token, data)
				.catch(e => {
					console.log(e);
					if (e.code == 10015) {
						delete webhooks[msg.channel.id];
						return _fetchWebhook(msg.channel).then(hook => {
							return _bot.executeWebhook(hook.id, hook.token, data);
						}).catch(e => reject("Webhook deleted and error creating new one. Check my permissions?"));
					}
				}).then(() => {
					bot.logging.logMessage(msg, data.content)

					// TODO tulpa stats elsewhere
					//if (!tulpa.posts)
					//	tulpa.posts = 0;
					//tulpa.posts++;

					if (!recent[msg.channel.id] && !msg.channel.permissionsOf(_bot.user.id).has("manageMessages"))
						send(msg.channel, "Warning: I do not have permission to delete messages. Both the original message and " + cfg.lang + " webhook message will show.");
					bot.messaging.addRecent(msg, webmsg);

					resolve();
				}).catch(reject);
		});
	};


	return {
		sendAttachment: sendAttachmentsWebhook,
		fetchWebhook: fetchWebhook
	};
}

