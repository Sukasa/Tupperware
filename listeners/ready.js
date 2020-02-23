module.exports = function(bot) {

	function Run() {
		bot.logger.info(`Connected\nLogged in as:\n${bot.user.username} - (${bot.user.id})`);
		bot.updateStatus();
		setInterval(() => bot.updateStatus(), 1800000);

		setInterval(() => {bot.disconnects = Math.max(bot.disconnects - 1, 0)}, 43200000);
		bot.guilds.forEach(validateGuildCfg);
	};

	return {
		exec: Run
	};

};