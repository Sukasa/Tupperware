module.exports = function (bot) {

    return {
		usage: cfg => ["cfg cmdblacklist <add|remove> <channel(s)> - Command blacklist management"],
		exec: async (msg, cfg, args) => {
			let out = "";
			cfg.cmdblacklist = cfg.cmdblacklist || [];
			if (!args[0])
				if (cfg.cmdblacklist.length)
					return `Currently command-blacklisted channels: ${cfg.cmdblacklist.map(id => "<#" + id + ">").join(" ")}`;
				else
					return "No channels currently command-blacklisted.";


			let cmd = args.shift().toLowerCase();
			let channels = args.map(arg => bot.resolvers.resolveChannel(msg, arg)).map(ch => ch && ch.id);

			switch (cmd) {
				case "add":
					if (!args[0])
						throw "Must provide name/mention/id of channel to command-blacklist.";

					if (!channels.find(ch => ch))
						throw `Could not find ${channels.length > 1 ? "any of those channels" : "that channel"}.`;

					if (channels.find(ch => !ch)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args[i];
						throw out;
					}

					cfg.cmdblacklist = cfg.cmdblacklist.concat(channels);
					bot.configuration.markDirty("servers");
					return `Channel${channels.length > 1 ? "s" : ""} command-blacklisted successfully.`;

				case "remove":
					if (!args[0])
						throw "Must provide name/mention/id of channel to command-blacklist.";

					if (!channels.find(ch => ch))
						throw `Could not find ${channels.length > 1 ? "any of those channels" : "that channel"}.`;

					if (channels.find(ch => !ch)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args[i];
						throw out;
					}

					channels.forEach(ch => { if (cfg.cmdblacklist.includes(ch)) cfg.cmdblacklist.splice(cfg.cmdblacklist.indexOf(ch), 1); });
					bot.configuration.markDirty("servers");
					return `Channel${channels.length > 1 ? "s" : ""} removed from command blacklist.`;

				default:
					throw "Invalid argument: must be 'add' or 'remove'";

			}
        }
    };
}