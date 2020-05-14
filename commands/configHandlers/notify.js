module.exports = function (bot) {

	return {
		usage: cfg => ["cfg notify <channel> - Select a channel for service notifications to be delivered to",
					   "cfg notify none - Disable service notifications on this channel"],
		exec: async (msg, cfg, args) => {
			let out = "";
			if (!args[0]) {
				out = "Notification channel unset. Notifies will be sent to the first channel to have a new message posted.";
				cfg.notify = null;
				bot.configuration.markDirty("servers");
			} else if (args[0] == "none") {
				out = "Notifications will not be sent to this server.";
				cfg.notify = "none";
				bot.configuration.markDirty("servers");
			} else {
				let channel = bot.resolvers.resolveChannel(msg, args[0]);
				if (!channel)
					throw "Channel not found.";

				out = `Notification channel set to <#${channel.id}>`;
				cfg.notify = channel.id;
				bot.configuration.markDirty("servers");

			}
			return out;
		}
	};
}