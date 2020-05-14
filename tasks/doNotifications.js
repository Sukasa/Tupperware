module.exports = function (bot) {

    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function execute() {
        let count = 0;

        for (guildId in bot.guilds) {
            count++;
            let guild = bot.guilds[guildId];
            if (guild) {
                let cfg = bot.configuration.getServerConfig(guild);
                if (cfg.lastNotify < bot.config.notify.currNotify) {
                    count = 0;
                    let targetChannel;

                    // TODO this duplicates some code in notifyHandler.js

                    if (cfg.notify) {
                        if (cfg.notify == "none") {
                            cfg.lastNotify = Date.now();
                            continue;
                        }

                        targetChannel = guild.channels.get(cfg.notify);
                    }
                    else if (guild.systemChannelID)
                        targetChannel = guild.channels.get(guild.systemChannelID);

                    if (targetChannel) {
                        bot.messaging.send(targetChannel, bot.config.notify.notifyMessage.replace(/\%NAME\%/g, bot.config.name).replace(/\%PREFIX\%/g, cfg.prefix));
                        cfg.lastNotify = Date.now();
                    }

                    bot.configuration.markDirty("servers");
                    await snooze(1000);
                }
            }
            if (count > 100) {
                count = 0;
                await snooze(10);
            }
        }

        if (bot.taskData.notifyResponseChannel)
            setTimeout(() => bot.messaging.send(bot.taskData.notifyResponseChannel, "Completed notification to all servers"), 2500);

        bot.config.notify.busy = false;
        bot.configuration.markDirty("config");
    };

    if (bot.config.notify.busy) {
        console.log("- Queueing incomplete notification task on 10 second delay");
        setTimeout(execute, 10000);
    }

    return execute;
}