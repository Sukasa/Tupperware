module.exports = function (bot) {

    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function execute() {
        let count = 0;

        bot.logger.info("Starting notification task");
        for (guild of bot.guilds) {
            count++;           
            guild = guild[1];
            if (guild) {
                bot.logger.debug(`Handling notification for ${guild.name} (${guild.id}); checking configuration...`);
                let cfg = bot.configuration.getServerConfig(guild.id);
                if (cfg.lastNotify < bot.config.notify.currNotify) {
                    count = 0;
                    let targetChannel;

                    if (cfg.notify) {
                        if (cfg.notify == "none") {
                            bot.logger.debug(`Notifications on this guild disabled`);

                            cfg.lastNotify = Date.now();
                            continue;
                        }

                        targetChannel = guild.channels.get(cfg.notify);
                    }
                    else if (guild.systemChannelID)
                        targetChannel = guild.channels.get(guild.systemChannelID);

                    if (targetChannel) {
                        bot.logger.debug(`Message sent to notification channel`);
                        // TODO this duplicates some code in notifyHandler.js
                        bot.messaging.send(targetChannel, "**Service Notification:**\n" + bot.config.notify.notifyMessage.replace(/\%NAME\%/g, bot.config.name).replace(/\%PREFIX\%/g, cfg.prefix));
                        cfg.lastNotify = Date.now();
                    } else {
                        bot.logger.debug(`Unable to determine notification channel, no notification sent`);
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

        bot.logger.info(`Completed notifications for ${count} guilds`);

        if (bot.taskData.notifyResponseChannel)
            setTimeout(() => bot.messaging.send(bot.taskData.notifyResponseChannel, "Completed notification to all servers"), 2500);

        bot.config.notify.busy = false;
        bot.configuration.markDirty("config");
    };

    if (bot.config.notify.busy) {
        bot.logger.info("- Queueing incomplete notification task on 10 second delay");
        setTimeout(execute, 10000);
    }

    return execute;
}