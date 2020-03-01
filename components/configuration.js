const fs = require("fs");

module.exports = function (bot) {

	var dirty = [];

	function getServerConfig(guild) {
		if (!guild)
			throw "getServerConfig() with NULL guild"
		guild = guild.channel || guild;
		guilg = guild.guild || guild;
		guild = guild.id || guild;
		if (bot.serverConfig[guild])
			return bot.serverConfig[guild];

		bot.serverConfig[guild] = JSON.parse(JSON.stringify(bot.defaultServerConfig)); // Deep copy
		markDirty("serverConfig");
		return bot.serverConfig[guild];
    };

	function validateGuildCfg(guild) {
		var config = getServerConfig(guild);
		if (config.prefix == undefined)
			config.prefix = "tul!";
		if (config.rolesEnabled == undefined)
			config.rolesEnabled = false;
		if (config.singular == undefined)
			config.singular = cfg.lang || "tulpa";
		if (config.plural == undefined)
			config.plural = "tulpae";
		if (config.log == undefined)
			config.log = null;
		config.singularArticle = bot.language.article(config.singular);

		save("config", bot.serverConfig);
	}

	function save(filename, configFile) {
		return fs.writeFile(`${__dirname}/config/${filename}.json`, JSON.stringify(configFile, null, 2), console.error);
	};

	function doSaves() {
		var file;
		while (file = dirty.shift()) {
			save(file, bot[file]);
		}
	}

	function markDirty(file) {
		if (!dirty.includes(file))
			dirty.unshift(file);
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