const Eris = require("eris");
const logger = require("winston");
const fs = require("fs");
const util = require("util");

// Configure logging
logger.configure({
    level: "debug",
    transports: [
        new logger.transports.Console(),
        new logger.transports.File({ filename: "output.log" })
    ],
    format: logger.format.combine(
        logger.format((info) => { info.message = util.format(info.message); return info; })(),
        logger.format.colorize(),
        logger.format.printf(info => `${info.level}: ${info.message}`)
    )
});

// Initialize Bot
var bot = new Eris(require("./config/config.json").discord);

bot.updateStatus = function(status) {
    bot.config.status = status || bot.config.status;
    bot.editStatus({ name: bot.config.status });
    if (status)
        bot.configuration.markDirty("config");
}

bot.launch = function() {
    bot.logger = logger;

    console.log("");
    logger.info("**********");
    logger.info("Launch");
    console.log("");

    bot.disconnects = 0;
    bot.paramRegex = /["‘’“”`'](.*?)["“”‘’`']|(\S+)/gi;

    bot.commands = {};
    bot.data = {};
    bot.diceEngines = {};
    bot.tasks = {};
    bot.taskData = {};

    // Load configuration
    fs.readdirSync("./config").forEach(file => {
        logger.info(`Loading config ${file}`);
        bot[file.slice(0, -5)] = JSON.parse(fs.readFileSync("./config/" + file, 'utf8'));
    });

    // Load components
    fs.readdirSync("./components").forEach(file => {
        logger.info(`Loading component ${file}`);
        if (bot[file.slice(0, -3)])
            throw `Unable to load component ${file} due to clobber`;
        bot[file.slice(0, -3)] = require("./components/" + file)(bot);
    });

    // Load Eris event listeners
    fs.readdirSync("./listeners").filter(x => x.endsWith(".js")).forEach(file => {
        logger.info(`Loading listener ${file}`);
        bot.on(file.slice(0, -3), require("./listeners/" + file)(bot).exec)
    });

    // Load commands (w/ aliases)
    fs.readdirSync("./commands").filter(x => x.endsWith(".js")).forEach(file => {
        logger.info(`Loading command ${file}`);
        var command = require("./commands/" + file)(bot);
        bot.commands[file.slice(0, -3)] = command;
        var aliases = command.aliases || [];
        aliases.forEach(alias => {
            bot.commands[alias] = command;
        });
    });

    // Load dice engines
    fs.readdirSync("./diceEngines").forEach(file => {
        logger.info(`Loading dice engine ${file}`);
        bot.diceEngines[file.slice(0, -3)] = require("./diceEngines/" + file)(bot);
    });

    // Load Tasks
    fs.readdirSync("./tasks").forEach(file => {
        logger.info(`Loading task ${file}`);
        bot.tasks[file.slice(0, -3)] = require("./tasks/" + file)(bot);
    });

    console.log("");
    logger.info("**********");
    logger.info("Connecting to Discord");

    bot.connect();
}

process.on("unhandledRejection", console.log);

bot.launch();

process.on('SIGINT', function() {
    logger.info("SIGINT");
    bot.configuration.doSaves(true);
    process.exit();
});

process.on('SIGTERM', function() {
    logger.info("SIGTERM");
    bot.configuration.doSaves(true);
    process.exit();
});
