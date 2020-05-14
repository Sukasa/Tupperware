module.exports = function(bot) {

	async function execute(guild) {
		bot.configuration.validateGuildCfg(guild);

		// TODO send the intro message here

	}

	return {
		exec: execute
	};
};