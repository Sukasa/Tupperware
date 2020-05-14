module.exports = function (bot) {
	return {
		help: cfg => `Flush datastore to disk`,
		usage: cfg => [`flush`],
		desc: cfg => `(OWNER ONLY): FLush datastores to disk`,
		permitted: () => false,
		execute: function (msg, args, cfg) {
			bot.configuration.doSaves();
			return "Flushed dirty configuration files to disk"
		}
	};
}