module.exports = function(bot) {

	function Run() {
		bot.logger.info(`Connected`);
		bot.logger.info(`Logged in as ${bot.user.username} (${bot.user.id})`);
		bot.updateStatus();
		setInterval(() => bot.updateStatus(), 1800000);
		setInterval(() => bot.configuration.doSaves(), 60000);
		setInterval(() => { bot.disconnects = Math.max(bot.disconnects - 1, 0) }, 43200000);

		bot.guilds.forEach(bot.configuration.validateGuildCfg);
	};

	return {
		exec: Run
	};

};