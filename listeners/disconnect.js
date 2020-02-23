module.exports = function(bot) {

	function Run() {
		logger.warn("Bot disconnected! Attempting to reconnect.");
		bot.disconnects++;
		if (bot.disconnects < 50)
			bot.connect();
	};

	return {
		exec: Run
	};

};