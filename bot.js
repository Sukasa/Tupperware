const Eris = require("eris");
const logger = require("winston");
const fs = require("fs");
const util = require("util");

// TODO keep/delete this?  And tidy it up if keeping
["/auth.json", "/tulpae.json", "/servercfg.json", "/webhooks.json"].forEach(file => {
	if (!fs.existsSync(__dirname + file))
		fs.writeFileSync(__dirname + file, "{ }", (err) => { if (err) throw err; });
});

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
var bot = new Eris(auth.discord);

bot.updateStatus = function (status) {
	bot.status = status || bot.status;
	bot.editStatus({ name: bot.status });
}

bot.launch = function () {

	bot.status = `Doing botty things`;
	bot.logger = logger;
	bot.disconnects = 0;

	bot.commands = {};
	bot.data = {};

	// Load configuration
	fs.readdirSync("./config").forEach(file => bot[file.slice(0, -3)] = require("./config/" + file));

	// TODO the below can clobber the above if there's a filename collision.  Should look into code to prevent that and throw an error

	// Load components
	fs.readdirSync("./components").forEach(file => bot[file.slice(0, -3)] = require("./components/" + file)(bot));

	// Load Eris event listeners
	fs.readdirSync("./listeners").forEach(file => bot.on(file.slice(0, -3), require("./listeners/" + file)(bot).exec));

	// Load commands (w/ aliases)
	fs.readdirSync("./commands").forEach(file => {
		var command = require("./commands/" + file)(bot).exec;
		bot.commands[file.slice(0, -3)] = command;
		var aliases = command.aliases || [];
		aliases.forEach(alias => {
			bot.commands[alias] = command;
		});
	});
	
	bot.connect();
}

process.on("unhandledRejection", console.log);

bot.launch();