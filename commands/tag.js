const { article, proper } = require("../components/language");

module.exports = function (bot) {
	return {
		help: cfg => `Remove or change a ${cfg.singular}'s tag (displayed after the  name when proxying)`,
		usage: cfg => [`tag <name> [tag] - if tag is given, change the ${cfg.singular}'s tag, if not, clear the tag`],
		desc: cfg => `A ${cfg.singular}'s tag is shown next to their name when speaking.`,
		permitted: () => true,
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0]) 
				return bot.commands.help.execute(msg, ["tag"], cfg);

			let tulpa = bot.tulpae.getTulpa(msg, args[0]);

			if (!tulpa) {
				out = `You don't have a ${cfg.singular} with that name registered.`;
			} else if (!args[1]) {
				delete tulpa.tag;
				bot.configuration.markDirty("users");
				out = "Tag cleared.";
			} else {
				let tag = args.slice(1).join(" ");
				if (tag.length + tulpa.name.length > 27) {
					out = `That tag is too long to use with that ${cfg.singular}'s name. The combined total must be less than 28 characters.`;
				} else {
					tulpa.tag = tag;
					bot.configuration.markDirty("users");
					out = "Tag updated successfully.";
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}