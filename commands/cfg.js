const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "Configure server-specific settings",
	usage: cfg => ["cfg prefix <newPrefix> - Change the bot's prefix",
		"cfg roles <enable|disable> - Enable or disable automatically managed mentionable " + cfg.lang + " roles, so that users can mention " + cfg.lang + "s",
		"cfg rename <newname> - Change all instances of the default name 'tulpa' in bot replies in this server to the specified term",
		"cfg log <channel> - Enable the bot to send a log of all " + cfg.lang + " messages and some basic info like who registered them. Useful for having a searchable channel and for distinguishing between similar names.",
		"cfg blacklist <add|remove> <channel(s)> - Add or remove channels to the bot's proxy blacklist - users will be unable to proxy in blacklisted channels.",
		"cfg cmdblacklist <add|remove> <channel(s)> - Add or remove channels to the bot's command blacklist - users will be unable to issue commands in blacklisted channels."],

	permitted: (msg) => (msg.member && msg.member.permission.has("administrator")),
	execute: function (msg, args, cfg) {
		let out = "";
		if (msg.channel instanceof Eris.PrivateChannel) {
			out = "This command cannot be used in private messages.";
		} else if (!args[0] || !["prefix", "roles", "rename", "log", "blacklist", "cmdblacklist"].includes(args[0])) {
			return bot.cmds.help.execute(msg, ["cfg"], cfg);
		} else if (args[0] == "prefix") {
			if (!args[1]) {
				out = "Missing argument 'prefix'.";
			} else {
				cfg.prefix = args[1];
				config.prefix = args[1];
				out = "Prefix changed to " + args[1];
				updateStatus();
				save("servercfg", config);
			}
		} else if (args[0] == "roles") {
			if (!msg.channel.guild.members.get(bot.user.id).permission.has("manageRoles")) {
				out = "I don't have permission to manage roles.";
			} else if (args[1] === "enable") {
				let guild = msg.channel.guild;
				if (cfg.rolesEnabled)
					out = proper(cfg.lang) + " roles already enabled on this server.";
				else {
					cfg.rolesEnabled = true;
					Promise.all(Object.keys(tulpae).filter(t => guild.members.has(t)).map(t => {
						let mem = guild.members.get(t);
						return Promise.all(tulpae[t].map(tul => {
							if (!mem.roles.find(r => guild.roles.get(r).name === tul.name))
								return guild.createRole({ name: tul.name, mentionable: true }).then(r => {
									mem.addRole(r.id);
									if (!tul.roles) tul.roles = {};
									tul.roles[guild.id] = r.id;
								});
							return true;
						}));
					})).then(() => {
						save("tulpae", tulpae);
					});
					save("servercfg", config);
					out = proper(cfg.lang) + " roles enabled. Adding the roles may take some time.";
				}
			} else if (args[1] === "disable") {
				let guild = msg.channel.guild;
				if (!cfg.rolesEnabled)
					out = proper(cfg.lang) + " roles already disabled on this server.";
				else {
					cfg.rolesEnabled = false;
					Object.keys(tulpae).filter(t => guild.members.has(t)).forEach(t => {
						let mem = guild.members.get(t);
						tulpae[t].forEach(tul => {
							if (tul.roles && tul.roles[guild.id]) {
								guild.deleteRole(tul.roles[guild.id]);
								delete tul.roles[guild.id];
								if (!Object.keys(tul.roles)[0]) delete tul.roles;
							}
						});
					});
					save("tulpae", tulpae);
					save("servercfg", config);
					out = proper(cfg.lang) + " roles disabled. Deleting the roles may take some time.";
				}
			} else {
				out = "Missing argument 'enable|disable'.";
			}
		} else if (args[0] == "rename") {
			if (!args[1]) {
				out = "Missing argument 'newname'";
			} else {
				cfg.lang = args.slice(1).join(" ");
				out = "Entity name changed to " + cfg.lang;
				save("servercfg", config);
			}
		} else if (args[0] == "log") {
			if (!args[1]) {
				out = "Logging channel unset. Logging is now disabled.";
				cfg.log = null;
				save("servercfg", config);
			} else {
				let channel = resolveChannel(msg, args[1]);
				if (!channel) {
					out = "Channel not found.";
				} else {
					out = `Logging channel set to <#${channel.id}>`;
					cfg.log = channel.id;
					save("servercfg", config);
				}
			}
		} else if (args[0] == "blacklist") {
			if (!args[1]) {
				if (cfg.blacklist) out = `Currently blacklisted channels: ${cfg.blacklist.map(id => "<#" + id + ">").join(" ")}`;
				else out = "No channels currently blacklisted.";
			} else if (args[1] == "add") {
				if (!args[2]) {
					out = "Must provide name/mention/id of channel to blacklist.";
				} else {
					let channels = args.slice(2).map(arg => resolveChannel(msg, arg)).map(ch => { if (ch) return ch.id; else return ch; });
					if (!channels.find(ch => ch != undefined)) {
						out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
					} else if (channels.find(ch => ch == undefined)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args.slice(2)[i];
					} else {
						if (!cfg.blacklist) cfg.blacklist = [];
						cfg.blacklist = cfg.blacklist.concat(channels);
						out = `Channel${channels.length > 1 ? "s" : ""} blacklisted successfully.`;
						save("servercfg", config);
					}
				}
			} else if (args[1] == "remove") {
				if (!args[2]) {
					out = "Must provide name/mention/id of channel to allow.";
				} else {
					let channels = args.slice(2).map(arg => resolveChannel(msg, arg)).map(ch => { if (ch) return ch.id; else return ch; });
					if (!channels.find(ch => ch != undefined)) {
						out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
					} else if (channels.find(ch => ch == undefined)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args.slice(2)[i] + " ";
					} else {
						if (!cfg.blacklist) cfg.blacklist = [];
						channels.forEach(ch => { if (cfg.blacklist.includes(ch)) cfg.blacklist.splice(cfg.blacklist.indexOf(ch), 1); });
						out = `Channel${channels.length > 1 ? "s" : ""} removed from blacklist.`;
						if (!cfg.blacklist[0]) delete cfg.blacklist;
						save("servercfg", config);
					}
				}
			} else {
				out = "Invalid argument: must be 'add' or 'remove'";
			}
		} else if (args[0] == "cmdblacklist") {
			if (!args[1]) {
				if (cfg.cmdblacklist) out = `Currently cmdblacklisted channels: ${cfg.cmdblacklist.map(id => "<#" + id + ">").join(" ")}`;
				else out = "No channels currently cmdblacklisted.";
			} else if (args[1] == "add") {
				if (!args[2]) {
					out = "Must provide name/mention/id of channel to cmdblacklist.";
				} else {
					let channels = args.slice(2).map(arg => resolveChannel(msg, arg)).map(ch => { if (ch) return ch.id; else return ch; });
					if (!channels.find(ch => ch != undefined)) {
						out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
					} else if (channels.find(ch => ch == undefined)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args.slice(2)[i];
					} else {
						if (!cfg.cmdblacklist) cfg.cmdblacklist = [];
						cfg.cmdblacklist = cfg.cmdblacklist.concat(channels);
						out = `Channel${channels.length > 1 ? "s" : ""} blacklisted successfully.`;
						save("servercfg", config);
					}
				}
			} else if (args[1] == "remove") {
				if (!args[2]) {
					out = "Must provide name/mention/id of channel to allow.";
				} else {
					let channels = args.slice(2).map(arg => resolveChannel(msg, arg)).map(ch => { if (ch) return ch.id; else return ch; });
					if (!channels.find(ch => ch != undefined)) {
						out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
					} else if (channels.find(ch => ch == undefined)) {
						out = "Could not find these channels: ";
						for (let i = 0; i < channels.length; i++)
							if (!channels[i]) out += args.slice(2)[i] + " ";
					} else {
						if (!cfg.cmdblacklist) cfg.cmdblacklist = [];
						channels.forEach(ch => { if (cfg.cmdblacklist.includes(ch)) cfg.cmdblacklist.splice(cfg.cmdblacklist.indexOf(ch), 1); });
						out = `Channel${channels.length > 1 ? "s" : ""} removed from cmdblacklist.`;
						if (!cfg.cmdblacklist[0]) delete cfg.cmdblacklist;
						save("servercfg", config);
					}
				}
			} else {
				out = "Invalid argument: must be 'add' or 'remove'";
			}
		}
		send(msg.channel, out);
	}
}