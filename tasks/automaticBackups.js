const fs = require("fs");
const path = require('path').dirname(require.main.filename);

const maxBackups = 7;
const backupInterval = 86400000;

module.exports = function (bot) {

    async function execute() {

        bot.logger.info("Starting autobackup task");

        let configsToSave = ["config", "hosts", "servers"];

        if (!fs.existsSync(`${path}/autobackup`))
            fs.mkdirSync(`${path}/autobackup`);

        for (let i = maxBackups; i >= 2; i--) {
            for (var file in configsToSave) {
                if (fs.existsSync(`${path}/autobackup/${file}-${i - 1}.json`))
                    fs.renameSync(`${path}/autobackup/${file}-${i - 1}.json`, `${path}/autobackup/${file}-${i}.json`);
            }
        }

        for (var file in configsToSave) {
            fs.writeFileSync(`${path}/autobackup/${file}-1.json`, JSON.stringify(bot[file], null, 2));
            bot.logger.info("Completed autobackup task");
        }

    };

    setTimeout(execute, backupInterval);

    return execute;
}