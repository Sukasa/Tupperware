module.exports = function (bot) {
	return {
		help: cfg => `Update service notifications`,
		usage: cfg => [`notify <message>`],
		desc: cfg => `(OWNER ONLY): Add service notification`,
		permitted: () => false,
		execute: function (msg, args, cfg, raw) {
			if (bot.config.notify.busy)
				return "Unable - previous notification task still active";

			bot.config.notify.currNotify = Date.now();
			bot.config.notify.notifyMessage = raw;
			bot.config.notify.busy = true;
			bot.configuration.markDirty("config");
			bot.taskData.notifyResponseChannel = msg.channel;
			setTimeout(bot.tasks.doNotifications, 250); 

			return `Notification updated.  Dispersion time estimated at ${Math.ceil(Object.keys(bot.servers).length / 60)} minutes`;
		}
	};
}