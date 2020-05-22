module.exports = function (bot) {
	const priorities = bot.priorities;

	return {
		priority: priorities.LOWEST,
		allowBot: false,

		test: function (msg) {
			let cfg = bot.configuration.getServerConfig(msg);
			let engine = bot.diceEngines[cfg.dice];
			return engine && (!cfg.diceblacklist || !cfg.diceblacklist.includes(msg.channel.id)) && engine.test(msg, cfg.diceCfg);
		},

		execute: async (msg, state) => {

			let cfg = bot.configuration.getServerConfig(msg);
			let engine = bot.diceEngines[cfg.dice];
			let resultSets = engine.execute(state, cfg.diceCfg);

			const hook = await bot.webhooks.fetchWebhook(msg.channel)
			const data = {
				wait: true,
				content: `**${msg.author.username}**: \n` + resultSets.join("\n"),
				username: `Dice Roll${resultSets.length > 1 ? "s" : ""}`,
				avatarURL: "https://greenfirework.com/dicerollflat.png",
			};

			try {
				await bot.executeWebhook(hook.id, hook.token, data);
			} catch (e) {
				bot.logger.error(e);
				if (e.code === 10015) {
					delete bot.serverWebhooks[msg.channel.id];
					const hook = await bot.webhooks.fetchWebhook(msg.channel);
					return bot.executeWebhook(hook.id, hook.token, data);
				}
			}

			return;
		}
	};
}