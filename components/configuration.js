module.exports = function (bot) {

    function getServerConfig(guild) {
		return bot.config[guild] || (bot.config[guild] = bot.defaultServerConfig);
    };

	function validateGuildCfg(guild) {
		var config = getServerConfig(guild);
		if (config.prefix == undefined)
			config.prefix = "tul!";
		if (config.rolesEnabled == undefined)
			config.rolesEnabled = false;
		if (config.lang == undefined)
			config.lang = "tulpa";
		if (config.log == undefined)
			config.log = null;
		// TODO change save() call
		save("servercfg", config);
	}

	function save(filename, configFile) {
		return fs.writeFile(`${__dirname}/${filename}.json`, JSON.stringify(configFile, null, 2), console.error);
	};

    return {
		getServerConfig: getServerConfig,
		validateGuildCfg: validateGuildCfg,
		save: save
    };

}