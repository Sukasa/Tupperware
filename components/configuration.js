const fs = require("fs");

module.exports = function (bot) {

	var dirty = [];

	function getServerConfig(guild) {
		if (!guild)
			throw "Apparently someone forgot to check if this was an Eris.PrivateChannel before calling getServerConfig()"

		if (!bot)
			throw "I'm a little busy having a personality crisis, I'll be back later";

		if (!bot.servers)
			throw "I appear to have alzheimers; I lost my server store";

		guild = guild.channel || guild;
		guild = guild.guild || guild;
		guild = guild.id || guild;

		if (bot.servers[guild])
			return bot.servers[guild];

		bot.servers[guild] = JSON.parse(JSON.stringify(bot.newServer)); // Deep copy
		markDirty("servers");
		return bot.servers[guild];
	};

	function validateGuildCfg(guild) {
		var config = getServerConfig(guild);
		if (config.prefix == undefined)
			config.prefix = bot.newServer.prefix;
		if (config.singular == undefined)
			config.singular = cfg.lang || bot.newServer.singular;
		if (config.plural == undefined)
			config.plural = bot.newServer.plural;
		if (config.log == undefined)
			config.log = null;
		config.singularArticle = bot.language.article(config.singular);

		markDirty("servers");
	}
	const path = require('path').dirname(require.main.filename);

	function save(filename, configFile) {
		bot.logger.debug(`saving ${filename} to ${path}/config/${filename}`);
		dirty[filename] = false;
		return fs.writeFile(`${path}/config/${filename}.json`, JSON.stringify(configFile, null, 2), () => { bot.logger.debug(`Saved ${filename}`); });
	};

	function doSaves() {
		for (var file in dirty)
			if (dirty[file])
				save(file, bot[file]);
	}

	function markDirty(file) {
		dirty[file] = true;
		if (bot.config.noDeferredSave)
			doSaves();
	}

	return {
		getServerConfig: getServerConfig,
		validateGuildCfg: validateGuildCfg,
		save: save,
		doSaves: doSaves,
		markDirty: markDirty
	};

}