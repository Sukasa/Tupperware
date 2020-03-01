module.exports = function (bot) {

    function logMessage(msg, content, tulpa, guild) {
        guild = guild || msg.channel.guild;
        var cfg = bot.configuration.getServerConfig(guild);

        if (cfg.log && guild.channels.has(cfg.log)) {
            let logchannel = guild.channels.get(cfg.log);
            if (!recent[msg.channel.id] && !logchannel.permissionsOf(bot.user.id).has("sendMessages")) {
                bot.messaging.send(msg.channel, "Warning: There is a log channel configured but I do not have permission to send messages to it. Logging has been disabled.");
                cfg.log = null;
                bot.configuration.save("config", config);
            }
            else if (logchannel.permissionsOf(bot.user.id).has("sendMessages"))
                bot.messaging.send(logchannel, `Name: ${tulpa.name}\nRegistered by: ${msg.author.username}#${msg.author.discriminator}\nChannel: <#${msg.channel.id}>\nMessage: ${content}`);
        }
    };

    return {
        logMessage: logMessage
    };

}