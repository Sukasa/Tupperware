module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s avatar`,
		usage: cfg => [`avatar <name> [url] - if url is specified, change the ${cfg.singular}'s avatar, if not, simply echo the current one`],
		permitted: () => true,
		desc: cfg => "The specified URL must be a direct link to an image - that is, the URL should end in .jpg or .png or another common image filetype. Also, the linked image cannot be over 1 MByte in size, as Discord will not accept images over this size as webhook avatars.",
		execute: function (msg, args, cfg) {
			let out = "";
			args = bot.resolvers.getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
			if (!args[0]) 
				return bot.commands.help.execute(msg, ["avatar"], cfg);

			let tulpa = bot.tulpae.getTulpa(msg, args[0]);

			if (!tulpa) {
				out = `You don't have ${cfg.singularArticle} ${cfg.singular} matching that name registered.`;
			} else if (!args[1]) {
				out = tulpa.url;
			} else {
				try {
					let url = bot.resolvers.resolveImage(msg);
					tulpa.url = url;
					bot.configuration.markDirty("users");
					out = `${tulpa.name}'s avatar has been changed successfully.`;
				} catch (e) {
					out = e;
				}
			}
			bot.messaging.send(msg.channel, out);
		}
	};
}