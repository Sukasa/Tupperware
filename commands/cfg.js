const fs = require("fs");
const Eris = require("eris");

module.exports = function (bot) {
	let handlers = [];

	fs.readdirSync("./commands/configHandlers").forEach(file => {
		bot.logger.info(`- Loading cfg handler ${file}`);
		handlers[file.slice(0, -3)] = require("./configHandlers/" + file)(bot)
	});

	return {
		help: cfg => "Configure server-specific settings",
		usage: cfg => Object.values(handlers).map(handler => handler.usage(cfg)).reduce((s,r) => s.concat(r), []),

		permitted: (msg) => (msg.member && msg.member.permission.has("administrator")),
		execute: function (msg, args, cfg) {
			let out = "";
			if (msg.channel instanceof Eris.PrivateChannel)
				throw "This command cannot be used in private messages.";

			if (!args[0])
				return bot.commands.help.execute(msg, ["cfg"], cfg);

			let selector = args.shift();
			let handler = handlers[selector];

			if (!handler)
				throw "invalid configuration option";

			out = handler.exec(msg, cfg, args);
			bot.configuration.markDirty("servers");
			
			return out;
		}
	};
}
