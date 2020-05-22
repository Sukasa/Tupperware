module.exports = function (bot) {
	return {
		help: cfg => `Update status`,
		usage: cfg => [`setstatus <message>`],
		desc: cfg => `(OWNER ONLY): Update bot status`,
		permitted: () => false,
		execute: function (msg, args, cfg, raw) {
			bot.updateStatus(raw);
			return "Status updated";
		}
	};
}