module.exports = function (bot) {
	return {
		help: cfg => `View or change ${cfg.singularArticle} ${cfg.singular}'s avatar`,
		usage: cfg => [`avatar <name> [url] - if url is specified, change the ${cfg.singular}'s avatar, if not, simply echo the current one`],
		permitted: () => true,
		desc: cfg => "The specified URL must be a direct link to an image - that is, the URL should end in .jpg or .png or another common image filetype. Also, the linked image cannot be over 1 MByte in size, as Discord will not accept images over this size as webhook avatars.",
		execute: async (msg, args, cfg) => {
			

			if (!args[0])
				return bot.commands.help.execute(msg, ["avatar"], cfg);

			let tulpa = bot.tulpae.getTulpa(msg, args[0]);

			if (!tulpa)
				throw `You don't have ${cfg.singularArticle} ${cfg.singular} matching that name registered.`;

			if (!args[1] && !msg.attachments[0])
				return `${tulpa.name}'s avatar is : ${tulpa.url}`;

			tulpa.url = await bot.resolvers.resolveImage(msg);
			bot.configuration.markDirty("hosts");
			return `${tulpa.name}'s avatar has been changed successfully.`;

		}
	};
}