module.exports = function (bot) {

	return {
		usage: cfg => ["cfg blacklist <add|remove> <channel(s)> - Proxy blacklist management."],
		exec: async (msg, cfg, args) => {
			let out = "";
			if (!args[0])
				if (cfg.blacklist)
					return `Currently blacklisted channels: ${cfg.blacklist.map(id => "<#" + id + ">").join(" ")}`;
				else
					return "No channels currently blacklisted.";


			let cmd = args.shift().toLowerCase();
			let channels = args.map(arg => bot.resolvers.resolveChannel(msg, arg)).map(ch => ch && ch.id);

			switch (cmd) {
				case "add":
					if (!args[0])
						throw "Must provide name/mention/id of channel to blacklist.";

					if (!channels.find(ch => ch))
						throw `Could not find ${channels.length > 1 ? "any of those channels" : "that channel"}.`;

					if (channels.find(ch => !ch)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args[i];
						throw out;
					}

					cfg.blacklist = cfg.blacklist.concat(channels);
					bot.configuration.markDirty("servers");
					return `Channel${channels.length > 1 ? "s" : ""} blacklisted successfully.`;

				case "remove":
					if (!args[0])
						throw "Must provide name/mention/id of channel to blacklist.";

					if (!channels.find(ch => ch))
						throw `Could not find ${channels.length > 1 ? "any of those channels" : "that channel"}.`;

					if (channels.find(ch => !ch)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args[i];
						throw out;
					}

					channels.forEach(ch => { if (cfg.blacklist.includes(ch)) cfg.blacklist.splice(cfg.blacklist.indexOf(ch), 1); });
					bot.configuration.markDirty("servers");
					return `Channel${channels.length > 1 ? "s" : ""} removed from blacklist.`;

				default:
					throw "Invalid argument: must be 'add' or 'remove'";

			}
		}
	};
}