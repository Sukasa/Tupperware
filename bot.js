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

bot.updateStatus = function (status) {
	bot.status = status || bot.status;
	bot.editStatus({ name: bot.status });
}

bot.launch = function () {

	bot.status = `Doing botty things`;
	bot.logger = logger;
	bot.disconnects = 0;
	bot.paramRegex = /["`'](.*?)["`']|(\S+)/gi;

	bot.commands = {};
	bot.data = {};
	bot.diceEngines = {};

	// Load configuration
	fs.readdirSync("./config").forEach(file => {
		console.log(`Loading config ${file}`);
		bot[file.slice(0, -5)] = JSON.parse(fs.readFileSync("./config/" + file, 'utf8'));
	});

	// Load components
	fs.readdirSync("./components").forEach(file => {
		console.log(`Loading component ${file}`);
		if (bot[file.slice(0, -3)])
			throw `Unable to load component ${file} due to clobber`;
		bot[file.slice(0, -3)] = require("./components/" + file)(bot);
	});

	// Load Eris event listeners
	fs.readdirSync("./listeners").filter(x => x.endsWith(".js")).forEach(file => {
		console.log(`Loading listener ${file}`);
		bot.on(file.slice(0, -3), require("./listeners/" + file)(bot).exec)
	});

	// Load commands (w/ aliases)
	fs.readdirSync("./commands").filter(x => x.endsWith(".js")).forEach(file => {
		console.log(`Loading command ${file}`);
		var command = require("./commands/" + file)(bot);
		bot.commands[file.slice(0, -3)] = command;
		var aliases = command.aliases || [];
		aliases.forEach(alias => {
			bot.commands[alias] = command;
		});
	});

	// Load dice engines
	fs.readdirSync("./diceEngines").forEach(file => {
		console.log(`Loading dice engine ${file}`);
		bot.diceEngines[file.slice(0, -3)] = require("./diceEngines/" + file)(bot);
	});
	
	bot.connect();
}

process.on("unhandledRejection", console.log);

bot.launch();

