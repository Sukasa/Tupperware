module.exports = function (bot) {
	const priorities = bot.priorities;

	return {
		priority: priorities.HIGH,
		private: true,
		allowBot: false,
		exclusive: true,
		blacklist: (cfg) => cfg.cmdblacklist,

		test: function (msg) {
			let cfg = bot.configuration.getServerConfig(msg);
			return msg.content.toLowerCase().startsWith(cfg.prefix) && (!cfg.cmdblacklist || !cfg.cmdblacklist.includes(msg.channel.id));
		},

		execute: async (msg) => {
			let cfg = bot.configuration.getServerConfig(msg);
			let args = bot.resolvers.getMatches(msg.content.substr(cfg.prefix.length), bot.paramRegex);
			var cmd = args.shift();
			let raw = msg.content.substr(cfg.prefix.length + cmd.length + 1);
			let cmdobj = bot.commands[cmd];
			
			if (cmdobj && ((msg.author.id === bot.config.owner) || (cmdobj.permitted(msg, args)))) {
				let content;
				try {
					content = await bot.commands[cmd].execute(msg, args, cfg, raw);
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