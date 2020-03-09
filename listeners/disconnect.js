module.exports = function(bot) {

	function Run() {
		bot.logger.warn("Bot disconnected! Attempting to reconnect.");
		bot.disconnects++;
		if (bot.disconnects < 50)
			bot.connect();
	};

	return {
		exec: Run
	};

};