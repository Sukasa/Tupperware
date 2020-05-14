module.exports = function (bot) {
	const priorities = bot.priorities;

	return {
		priority: priorities.HIGHEST,
		private: true,
		blacklist: (cfg) => cfg.cmdblacklist,

		test: function (msg) {
			let cfg = bot.configuration.getServerConfig(msg);
			return msg.content.toLowerCase().startsWith(cfg.prefix) && (!cfg.cmdblacklist || !cfg.cmdblacklist.includes(msg.channel.id));
		},

		execute: async (msg) => {
			let cfg = bot.configuration.getServerConfig(msg);
			var args = msg.content.substr(cfg.prefix.length).split(" ");
			var cmd = args.shift();
			if (bot.commands[cmd] && ((msg.author.id === bot.config.owner) || (bot.commands[cmd].permitted(msg, args)))) {
				let content;
				try {
					content = await bot.commands[cmd].execute(msg, args, cfg, bot);
					if (content)
						bot.messaging.send(msg.channel, content);
				} catch (e) {
					bot.messaging.send(msg.channel, `${e}`)
					bot.logger.error(e);
					console.log(e);
				}
			}
		}
	};
}