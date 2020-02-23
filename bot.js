//dependencies
const Eris = require("eris");
const logger = require("winston");
const request = require("request");
const fs = require("fs");
const validUrl = require("valid-url");
const util = require("util");

// TODO keep/delete this?  And tidy up
//create data files if they don't exist
["/auth.json", "/tulpae.json", "/servercfg.json", "/webhooks.json"].forEach(file => {
	if (!fs.existsSync(__dirname + file))
		fs.writeFileSync(__dirname + file, "{ }", (err) => { if (err) throw err; });
});




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

// TODO the below needs to be refactored into a separate file in /listeners/
bot.on("guildCreate", validateGuildCfg);

bot.updateStatus = function (status) {
	bot.status = status || bot.status;
	bot.editStatus({ name: bot.status });
}

bot.launch = function () {

	bot.status = `Doing botty things`;
	bot.commands = {};
	bot.recent = {};
	bot.messageHandlers = [];
	bot.logger = logger;
	bot.disconnects = 0;

	// Load configuration
	fs.readdirSync("./config").forEach(file => bot[file.slice(0, -3)] = require("./config/" + file));

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

	// Load message handlers
	fs.readdirSync("./messageHandlers").forEach(file => bot.messageHandlers.push(require("./messageHandlers/" + file))(bot));
	
	bot.connect();
}



// TODO move all of the below into modules in /components/
// Then get those attached to the bot and/or require()'d as necessary in other files
// And patch up all references

function checkTulpa(msg, tulpa, clean) {

	let check = brackets => clean.startsWith(brackets[0]) && clean.endsWith(brackets[1]) && ((clean.length == (brackets[0].length + brackets[1].length) && msg.attachments[0]) || clean.length > (brackets[0].length + brackets[1].length));

	if (check(tulpa.brackets))
		return tulpa.brackets;

	for (idx in tulpa.alternates || Array()) {
		if (check(tulpa.alternates[idx]))
			return tulpa.alternates[idx];
	}

	return false;

}

function generateTulpaField(tulpa) {
	return {
		name: tulpa.name,
		value: `${tulpa.tag ? ("Tag: " + tulpa.tag + "\n") : ""}Brackets: ${[tulpa.brackets[0] + "text" + tulpa.brackets[1]].concat(tulpa.alternates || []).reduce((a, c) => a + ", " + (c[0] + "text" + c[1]))}
		Avatar URL: ${tulpa.url}${tulpa.birthday ? ("\nBirthday: " + new Date(tulpa.birthday).toDateString()) : ""}
		${ tulpa.forms ? "Forms: " + Object.keys(tulpa.forms).reduce((a, c) => a + ", " + c) + "\n" : ""}Total messages sent: ${tulpa.posts}${tulpa.desc ? ("\n" + tulpa.desc) : ""} `
	};
}

function checkTulpaBirthday(tulpa) {
	if (!tulpa.birthday) return false;
	let day = new Date(tulpa.birthday);
	let now = new Date();
	return day.getDate() == now.getDate() && day.getMonth() == now.getMonth();
}



process.on("unhandledRejection", console.log);

bot.launch();


