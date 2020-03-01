const priorities = require("../component/priorities");

module.exports = {
	priority: priorities.HIGHEST,
	private: true,

	test: function (msg, bot) {
		let cfg = msg.channel.guild && bot.config[msg.channel.guild.id];
		return msg.content.toLowerCase().startsWith(cfg.prefix) && (!cfg.cmdblacklist || !cfg.cmdblacklist.includes(msg.channel.id));
	},

	execute: async (msg, bot) => {
		let cfg = msg.channel.guild && bot.config[msg.channel.guild.id];
		var args = msg.content.substr(cfg.prefix.length).split(" ");
		var cmd = args.shift();

		if (bot.commands[cmd] && ((msg.author.id === bot.auth.owner) || (bot.commands[cmd].permitted(msg, args)))) {
			return bot.commands[cmd].execute(msg, args, cfg, bot);
		}
	}

}