//dependencies
const Eris = require("eris");
const logger = require("winston");
const request = require("request");
const fs = require("fs");
const validUrl = require("valid-url");
const util = require("util");

//create data files if they don't exist
["/auth.json","/tulpae.json","/servercfg.json","/webhooks.json"].forEach(file => {
	if(!fs.existsSync(__dirname + file))
		fs.writeFileSync(__dirname + file, "{ }", (err) => { if(err) throw err; });
});
const auth = require("./auth.json");
const tulpae = require("./tulpae.json");
const config = require("./servercfg.json");
const webhooks = require("./webhooks.json");

const recent = {};
const feedbackID = "431722290971934721";

const zwsp = String.fromCharCode(8203); //zero-width space for embed formatting
var disconnects = 0;

var aniRegex = /^<a:[^\s:]+:\d+>$/mi;
var diceRegex = /!(?:(?:roll\s|dice\s)?((?:\d+)?)d(\d+))\s*((?:\s*?(?:-|\+|top|bottom)\s*-?\d+\s*?)+)?/gi;
var modifierRegex = /(?:(\+|\-|top|bottom)\s*(\d+))/gi;


function reduceDice(state, dice) {
	
	if (dice.valid) {
		state.content = state.content + state.sep + dice.value;
		state.sum = state.sum + dice.value;
	} else {
		state.content = state.content + state.sep + "||" + dice.value + "||";
	}
	state.sep = ", ";
	return state;
}

function handleDiceRoll(rollMatch) {
	var numDice = rollMatch[1] || 1;
	var numSides = rollMatch[2];
	var modifiers = rollMatch[3];
	var finalAdjust = 0;
	
	var rolls = [];
	for(var d = numDice; d > 0; d--)
		rolls.push({value : Math.floor(Math.random() * numSides) + 1, valid : true});
	
	if (modifiers != null) {
		var modifier;
		while (modifier = modifierRegex.exec(modifiers)) {
			// Apply modifier
			var by = modifier[2];
			var last;
			var indice = 0;
			switch(modifier[1]) {
				case "top":
					by = numDice - by;
					for (var passes = 0; passes < by; passes++) {
						last = numSides + 1;
						for (var test = 0; test < numDice; test++) {
							var roll = rolls[test];
							if (last > roll.value && roll.valid) {
								indice = test;
								last = roll.value;
							}
						}
						rolls[indice].valid = false;
					}
					break;
				case "bottom":
					by = numDice - by;
					for (var passes = 0; passes < by; passes++) {
						last = 0;
						for (var test = 0; test < numDice; test++) {
							var roll = rolls[test];
							if (last < roll.value && roll.valid) {
								indice = test;
								last = roll.value;
							}
						}
						rolls[indice].valid = false;
					}
					break;
				case "+":
					finalAdjust = Number(finalAdjust) + Number(by);
					break;
				case "-":
					finalAdjust = Number(finalAdjust) - Number(by);
					break;
			}
		}
	}
	// Modifiers applied and final adjustment done.  Now to make the output string.
	
	var finalResult = rolls.reduce(reduceDice, {content: "", sep: "", sum: 0});
	
	var output = "**" + numDice + "d" + numSides + (modifiers ? " " + modifiers : "") + "**: " + finalResult.content;
	if (finalAdjust > 0)
		output = output + " + " + finalAdjust;
	if (finalAdjust < 0)
		output = output + " - " + Math.abs(finalAdjust);
	
	return output + " = **" + (finalResult.sum + finalAdjust) + "**";
}

logger.configure({
	level: "debug",
	transports: [
		new logger.transports.Console(),
		new logger.transports.File({ filename: "output.log" })
	],
	format: logger.format.combine(
		logger.format((info) => {info.message = util.format(info.message); return info; })(),
		logger.format.colorize(),
		logger.format.printf(info => `${info.level}: ${info.message}`)
	)
});

// Initialize Bot
var bot = new Eris(auth.discord);

bot.on("ready", () => {
	logger.info(`Connected\nLogged in as:\n${bot.user.username} - (${bot.user.id})`);
	updateStatus();
	setInterval(updateStatus, 1800000);
	bot.guilds.forEach(validateGuildCfg);
});

bot.on("guildCreate", validateGuildCfg);

bot.on("disconnect", function() {
	logger.warn("Bot disconnected! Attempting to reconnect.");
	disconnects++;
	if(disconnects < 50)
		bot.connect();
});

bot.on("error", console.error);

bot.on("messageCreate", async function (msg) {
	if(msg.author.bot) return;
	if(msg.channel instanceof Eris.PrivateChannel)
		return send(msg.channel, "Use of this bot via private message has been disabled");
	let cfg = msg.channel.guild && config[msg.channel.guild.id] || { prefix: "t!", rolesEnabled: false, lang: "tulpa"};
	
	if (diceRegex.test(msg.content) && (!cfg.diceblacklist || !cfg.diceblacklist.includes(msg.channel.id))) {
		
		diceRegex.lastIndex = 0;
		var resultSets = [];
		var match;
		
		while (match = diceRegex.exec(msg.content))
			resultSets.push(handleDiceRoll(match));
		
		const hook = await fetchWebhook(msg.channel)
		const data = {
			wait: true,
			content: resultSets.join("\n"),
			username: `Dice Roll${resultSets.length > 1 ? "s" : ""}`,
			avatarURL: "https://greenfirework.com/dicerollflat.png",
		};
		
		try {
			await bot.executeWebhook(hook.id,hook.token,data);
		} catch (e) {
			console.log(e);
			if(e.code === 10015) {
				delete webhooks[msg.channel.id];
				const hook = await fetchWebhook(msg.channel);
				return bot.executeWebhook(hook.id,hook.token,data);
			}
		}
		
		return;
	}
	
	if (msg.content.toLowerCase().startsWith(cfg.prefix) && (!cfg.cmdblacklist || !cfg.cmdblacklist.includes(msg.channel.id))) {
		var args = msg.content.substr(cfg.prefix.length).split(" ");
		var cmd = args.shift();
		
		if(bot.cmds[cmd] && checkPermissions(cmd,msg,args)) {
			logger.info(`${msg.channel.guild ? msg.channel.guild.name + ": " : "private message: "}${msg.author.username} executed command ${msg.content}`);
			return bot.cmds[cmd].execute(msg, args, cfg);
		}
	} else if(tulpae[msg.author.id] && !(msg.channel instanceof Eris.PrivateChannel) && (!cfg.blacklist || !cfg.blacklist.includes(msg.channel.id))) {
		let clean = msg.cleanContent || msg.content;
		if (aniRegex.test(clean))
			return;
		clean = clean.replace(/(<:.+?:\d+?>)|(<@!?\d+?>)/,"cleaned");
		let cleanarr = clean.split("\n");
		let lines = msg.content.split("\n");
		let replace = [];
		let bracketSet = null;
		for(let i = 0; i < lines.length; i++) {
			tulpae[msg.author.id].forEach(t => {
				if(bracketSet = checkTulpa(msg, t, cleanarr[i])) {
					replace.push([msg,cfg,t,lines[i].substring(bracketSet[0].length, lines[i].length-bracketSet[1].length)]);
				}
			});
		}
		
		if(replace.length < 2) replace = [];
		
		if(!replace[0]) {
			for(let t of tulpae[msg.author.id]) {
				if(bracketSet = checkTulpa(msg, t, clean)) {
					replace.push([msg, cfg, t, msg.content.substring(bracketSet[0].length, msg.content.length-bracketSet[1].length)]);
					break;
				}
			}
		}
			
		if(replace[0]) {
			Promise.all(replace.map(r => replaceMessage(...r)))
				.then(() => {
					if(msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
						msg.delete().catch(e => { if(e.code == 50013) { send(msg.channel, "Warning: I'm missing permissions needed to properly replace messages."); }});
					save("tulpae",tulpae);
				}).catch(e => send(msg.channel, e));
		}
	}
});

bot.on("messageReactionAdd", async function (message, emoji, userID) {
	if (emoji.name == "\u274c" && recent[message.channel.id] && recent[message.channel.id].find(r => r.userID == userID && message.id == r.id)) {
		
		if(!message.channel.guild || message.channel.permissionsOf(bot.user.id).has("manageMessages")) {
			bot.deleteMessage(message.channel.id,message.id).catch(e => { if(e.code != 10008) throw e; });
		}
		
		return;
	}
});

async function replaceMessage(msg, cfg, tulpa, content) {
	const hook = await fetchWebhook(msg.channel);
	const data = {
		wait: true,
		content: content,
		username: `${tulpa.name} ${tulpa.tag ? tulpa.tag : ""} ${checkTulpaBirthday(tulpa) ? "\uD83C\uDF70" : ""}`,
		avatarURL: tulpa.url,
	};

	if(recent[msg.channel.id] && msg.author.id !== recent[msg.channel.id][0].userID && data.username === recent[msg.channel.id][0].name) {
		data.username = data.username.substring(0,1) + "\u200a" + data.username.substring(1);
	}

	if(msg.attachments[0]) {
		return sendAttachmentsWebhook(msg, cfg, data, content, hook);
	}

	let webmsg;
	try {
		webmsg = await bot.executeWebhook(hook.id,hook.token,data);
	} catch (e) {
		console.log(e);
		if(e.code === 10015) {
			delete webhooks[msg.channel.id];
			const hook = await fetchWebhook(msg.channel);
			return bot.executeWebhook(hook.id,hook.token,data);
		}
	}

	if(cfg.log && msg.channel.guild.channels.has(cfg.log)) {
		send(msg.channel.guild.channels.get(cfg.log),
			`Name: ${tulpa.name}\nRegistered by: ${msg.author.username}#${msg.author.discriminator}\nChannel: <#${msg.channel.id}>\nMessage: ${content}`);
	}

	if(!tulpa.posts) tulpa.posts = 0;
	tulpa.posts++;
	if(!recent[msg.channel.id] && !msg.channel.permissionsOf(bot.user.id).has("manageMessages")) {
		send(msg.channel, `Warning: I do not have permission to delete messages. Both the original message and ${cfg.lang} webhook message will show.`);
	}
	recent[msg.channel.id] = recent[msg.channel.id] || [];
	recent[msg.channel.id].unshift({
		userID: msg.author.id,
		name: data.username,
		tulpa: tulpa,
		id: webmsg.id,
		tag: `${msg.author.username}#${msg.author.discriminator}`
	});
	recent[msg.channel.id] = recent[msg.channel.id].slice(0,8)
}

function checkTulpa(msg, tulpa, clean) {
	
	let check = brackets => clean.startsWith(brackets[0]) && clean.endsWith(brackets[1]) && ((clean.length == (brackets[0].length + brackets[1].length) && msg.attachments[0]) || clean.length > (brackets[0].length + brackets[1].length));
	
	if (check(tulpa.brackets))
		return tulpa.brackets;
	
	for(idx in tulpa.alternates || Array()) {
		if (check(tulpa.alternates[idx]))
			return tulpa.alternates[idx];
	}
	
	return false;
	
}

async function sendAttachmentsWebhook(msg, cfg, data, content, hook, tulpa) {
	let files = [];
	for(let i = 0; i < msg.attachments.length; i++) {
		files.push({ file: await attach(msg.attachments[i].url), name: msg.attachments[i].filename });
	}
	data.file = files;
	return new Promise((resolve, reject) => {
		bot.executeWebhook(hook.id,hook.token,data)
			.catch(e => { 
				console.log(e);
				if(e.code == 10015) {
					delete webhooks[msg.channel.id];
					return fetchWebhook(msg.channel).then(hook => {
						return bot.executeWebhook(hook.id,hook.token,data);
					}).catch(e => reject("Webhook deleted and error creating new one. Check my permissions?"));
				}
			}).then(() => {
				if(cfg.log && msg.channel.guild.channels.has(cfg.log)) {
					let logchannel = msg.channel.guild.channels.get(cfg.log);
					if(!recent[msg.channel.id] && !logchannel.permissionsOf(bot.user.id).has("sendMessages")) {
						send(msg.channel, "Warning: There is a log channel configured but I do not have permission to send messages to it. Logging has been disabled.");
						cfg.log = null;
						save("servercfg",config);
					}
					else if(logchannel.permissionsOf(bot.user.id).has("sendMessages"))
						send(logchannel, `Name: ${tulpa.name}\nRegistered by: ${msg.author.username}#${msg.author.discriminator}\nChannel: <#${msg.channel.id}>\nMessage: ${content}`);
				}
				if(!tulpa.posts) tulpa.posts = 0;
				tulpa.posts++;
				if(!recent[msg.channel.id] && !msg.channel.permissionsOf(bot.user.id).has("manageMessages"))
					send(msg.channel, "Warning: I do not have permission to delete messages. Both the original message and " + cfg.lang + " webhook message will show.");
				
				recent[msg.channel.id] = recent[msg.channel.id] || [];
				recent[msg.channel.id].unshift({
					userID: msg.author.id,
					name: data.username,
					tulpa: tulpa,
					id: webmsg.id,
					tag: `${msg.author.username}#${msg.author.discriminator}`
				});
				recent[msg.channel.id] = recent[msg.channel.id].slice(0,8);
				resolve();
			}).catch(reject);
	});
}

function fetchWebhook(channel) {
	return new Promise((resolve, reject) => {
		if(webhooks[channel.id])
			resolve(webhooks[channel.id]);
		else if(!channel.permissionsOf(bot.user.id).has("manageWebhooks"))
			reject("Proxy failed: Missing 'Manage Webhooks' permission in this channel.");
		else {
			channel.createWebhook({ name: "Tupperhook" }).then(hook => {
				webhooks[channel.id] = { id: hook.id, token: hook.token };
				resolve(webhooks[channel.id]);
				save("webhooks",webhooks);
			}).catch(e => { reject("Proxy failed with unknown reason: Error " + e.code); });
		}
	});
}

function attach(url, name) {
	return new Promise(function(resolve, reject) {
		request({url:url,encoding:null}, (err, res, data) => {
			console.log(`${url}: ${data.length}`);
			resolve(data);
		});
	});
}

bot.cmds = {
	help: {
		help: cfg => "Print this message, or get help for a specific command",
		usage: cfg =>  ["help - print list of commands", 
			"help [command] - get help on a specific command"],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let output = "";
			if(args[0]) { //help for a specific command
				if(bot.cmds[args[0]] && checkPermissions(args[0],msg,args) && bot.cmds[args[0]].usage) {
					output = { embed: {
						title: "Bot Command | " + args[0],
						description: bot.cmds[args[0]].help(cfg) + "\n\n**Usage:**\n",
						timestamp: new Date().toJSON(),
						color: 0x999999,
						author: {
							name: "Tupperware",
							icon_url: bot.user.avatarURL
						},
						footer: {
							text: "If something is wrapped in <> or [], do not include the brackets when using the command. They indicate whether that part of the command is required <> or optional []."
						}
					}};
					for(let u of bot.cmds[args[0]].usage(cfg))
						output.embed.description += `${cfg.prefix + u}\n`;
					if(bot.cmds[args[0]].desc)
						output.embed.description += `\n${bot.cmds[args[0]].desc(cfg)}`;
				} else output += "Command not found.";
			} else { //general help
				output = { embed: {
					title: "Tupperware | Help",
					description: "I am Tupperware, a bot made to give " + cfg.lang + "s a voice using Discord webhooks.\nTo get started, register a " + cfg.lang + " with `" + cfg.prefix + "register` and enter a message with the brackets you set!\n\n**Command List**\nType `"+cfg.prefix+"help command` for detailed help on a command.\n" + zwsp + "\n",
					timestamp: new Date().toJSON(),
					color: 0x999999,
					author: {
						name: "Haven Tupperware",
						icon_url: bot.user.avatarURL
					},
					footer: {
						text: "By Keter#1730, Modifications by Sukasa#6109"
					}
				}};
				for(let cmd of Object.keys(bot.cmds)) {
					if(bot.cmds[cmd].help && bot.cmds[cmd].permitted(msg,args))
						output.embed.description += `**${cfg.prefix + cmd}**  -  ${bot.cmds[cmd].help(cfg)}\n`;
				}
			}
			send(msg.channel, output);
		}
	},
	
	form: {
		help: cfg => "Configure alternate forms for a tulpa (overrides `" + cfg.prefix + "avatar`)",
		usage: cfg =>  [ "form <name> <formName> - Switch a " + cfg.lang + "'s form",
			"form <name> add <formName> <formUrl> - Add a new named form to a " + cfg.lang + " (4 max)", 
			"form <name> remove <formName> - Remove a named form from a " + cfg.lang + ".  Cannot remove their last form",
			"form <name> rename <oldName> <newName> - Rename a form"],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);			
			let checkName = (idx) => tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[idx].toLowerCase());
			
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["form"], cfg);			
			}
			
			let tulpa = checkName(0);
			
			if (!tulpa) {
				out = "You don't have a " + cfg.lang + " with that name registered."
			} else {
				
				tulpa.forms = tulpa.forms || { default: tulpa.url};
				tulpa.currentForm = tulpa.currentForm || "default";
				
				if (!args[1]) {
					out = `${tulpa.name}'s current forms:`;
					for(var form in tulpa.forms) {
						out = out + "\n`" + form + "`";
						if (tulpa.forms[form] == tulpa.url)
							out = out + " (current)";
					}
				} else {
				
					switch(args[1].toLowerCase()) {
					case "add":
						if (Object.keys(tulpa.forms).length >= 4) {
							out = "Cannot add more forms - at form limit";
						} else if (["add", "remove", "rename"].includes(args[2])) {
							out = "Cannot add a form named matching a reserved keyword";
						} else if (resolveKey(tulpa.forms, args[2])) {
							out = tulpa.name + " already has a form named " + args[2];
						} else {
							if(!validUrl.isWebUri(args[3])) {
								out = "Malformed url.";
							} else if (args[3].indexOf("imgur.com/a/") != -1) {
								return send(msg.channel, "That is an Imgur album link.  You need to give me the direct URL of the image in that album that you want used");
							} else {
								request(args[3], { method: "HEAD" }, (err, res) => {
									if(err || !res.headers["content-type"] || !res.headers["content-type"].startsWith("image")) return send(msg.channel, "I couldn't find an image at that URL. Make sure it's a direct link (ends in .jpg or .png for example).");
									if(Number(res.headers["content-length"]) > 1000000) {
										return send(msg.channel, "That image is too large and Discord will not accept it. Please use an image under 1 megabyte.");
									}
									tulpa.forms[args[2].toLowerCase()] = args[3];
									save("tulpae",tulpae);
									send(msg.channel, "Added new form.  Select this form with `" + cfg.prefix + "form '" + tulpa.name + "' '" + args[2].toLowerCase() + "'`");
								});
								return;
							}
						}
						break;
					case "remove":
						let formName = resolveKey(tulpa.forms, args[2]);
						if (!formName) {
							out = "No form registered under the name " + args[2] + ".";
						} else if (Object.keys(tulpa.forms).length <= 1) {
							out = "Cannot remove the only registered form.";
						} else {
							delete tulpa.forms[formName];
							out = "Removed form '" + formName + "'.  If this was the active form, please select a new form.";
							save("tulpae",tulpae);
						}
						break;
					case "rename":
						if (!args[3]) {
							out = "Please provide both an old and new name for renaming";
						} else {
							let oldFormName = resolveKey(tulpa.forms, args[2]);
							let newFormName = args[3];
							
							if (!oldFormName) {
								out = "No form registered under the name " + args[2] + ".";
							} else if (resolveKey(tulpa.forms, newFormName) && oldFormName.toLowerCase() != newFormName.toLowerCase()) {
								out = "Form name " + args[3] + " already registered.";
							} else if (["add", "remove", "rename"].includes(newFormName)){
								out = "Cannot rename form to match a reserved keyword";
							} else {
								tulpa.forms[newFormName] = tulpa.forms[oldFormName];
								delete tulpa.forms[oldFormName];
								out = "Renamed form '" + args[2] + "' to '" + args[3] + "'.";
								save("tulpae",tulpae);
							}
						}
						break;
					default:
						let selectForm = resolveKey(tulpa.forms, args[1]);
						// Select a form
						if (!selectForm) {
							out = "No form registered with the name '" + args[1] + "'.";
						} else {
							tulpa.url = tulpa.forms[selectForm];
							out = "Switched to form '" + args[1] + "'";
							save("tulpae",tulpae);
						}
				}
				}
			}
			
			
			send(msg.channel, out);
		}
	},
	
	register: {
		help: cfg => "Register a new " + cfg.lang + "",
		usage: cfg =>  ["register <name> <brackets> - Register a new " + cfg.lang + ".\n\t<name> - the " + cfg.lang + "'s name, for multi-word names surround this argument in `''`\n\t<brackets> - the word 'text' surrounded by any characters on one or both sides"],
		desc: cfg => "Example use: `register Test >text<` - registers a " + cfg.lang + " named 'Test' that is triggered by messages surrounded by ><\nBrackets can be anything, one sided or both. For example `text<<` and `T:text` are both valid\nNote that you can enter multi-word names by surrounding the full name in apostrophes `''`.",
		permitted: () => true,
		execute: function(msg, args, cfg) {
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			let out = "";
			let brackets = args.slice(1).join(" ").split("text");
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["register"], cfg);
			} else if(!args[1]) {
				out = "Missing argument 'brackets'. Try `" + cfg.prefix + "help register` for usage details.";
			} else if(args[0].length < 2 || args[0].length > 28) {
				out = "Name must be between 2 and 28 characters.";
			} else if(brackets.length < 2) {
				out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
			} else if(!brackets[0] && !brackets[1]) {
				out = "Need something surrounding 'text'.";
			} else if(tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name === args[0])) {
				out = proper(cfg.lang) + " with that name under your user account already exists.";
			} else if(tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.brackets[0] == brackets[0] && t.brackets[1] == brackets[1])) {
				out = proper(cfg.lang) + " with those brackets under your user account already exists.";
			} else {
				if(!tulpae[msg.author.id]) tulpae[msg.author.id] = [];
				let tulpa = {
					name: args[0],
					url: "https://i.imgur.com/ZpijZpg.png",
					brackets: brackets,
					posts: 0,
					host: msg.author.id,
					alternates: Array()
				};
				tulpae[msg.author.id].push(tulpa);
				let guilds = Object.keys(config).filter(id => config[id].rolesEnabled && bot.guilds.has(id) && bot.guilds.get(id).members.has(msg.author.id)).map(id => bot.guilds.get(id));
				if(guilds[0]) {
					tulpa.roles = {};
					Promise.all(guilds.map(g => {
						return g.createRole({ name: tulpa.name, mentionable: true}).then(r => {
							tulpa.roles[g.id] = r.id;
							g.members.get(msg.author.id).addRole(r.id);
						});
					})).then(() => {
						save("tulpae",tulpae);
					});
				}
				save("tulpae",tulpae);
				out = proper(cfg.lang) + " registered successfully!\nName: " + tulpa.name + "\nBrackets: " + `${brackets[0]}text${brackets[1]}` + "\nUse `" + cfg.prefix + "rename`, `" + cfg.prefix + "brackets`, `" + cfg.prefix + "avatar`, and `" + cfg.prefix + "form` to set/update your " + cfg.lang + "'s info."; 
			}
			send(msg.channel, out);
		}
	},
	
	remove: {
		help: cfg => "Unregister a " + cfg.lang + "",
		usage: cfg =>  ["remove <name> - Unregister the named " + cfg.lang + " from your list"],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			let name = args.join(" ");
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["remove"], cfg);
			} else if(!tulpae[msg.author.id]) {
				out = "You do not have any " + cfg.lang + "s registered.";
			} else if(!tulpae[msg.author.id].find(t => t.name.toLowerCase() == name.toLowerCase())) {
				out = "Could not find " + cfg.lang + " with that name registered under your account.";
			} else {
				out = proper(cfg.lang) + " unregistered.";
				let arr = tulpae[msg.author.id];
				let tul = arr.find(t => t.name.toLowerCase() == name.toLowerCase());
				Object.keys(config).filter(t => config[t].rolesEnabled && bot.guilds.has(t)).map(t => bot.guilds.get(t)).forEach(g => {
					if(tul.roles && tul.roles[g.id]) g.deleteRole(tul.roles[g.id]);
				});
				arr.splice(arr.indexOf(tul), 1);
				save("tulpae",tulpae);
			}
			send(msg.channel, out);
		}
	},
	
	list: {
		help: cfg => "Get a detailed list of yours or another user's registered " + cfg.lang + "s",
		usage: cfg =>  ["list [user] - Sends a list of the user's registered " + cfg.lang + "s, their brackets, post count, and birthday (if set). If user is not specified it defaults to the message author."],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			let target;
			if(args[0]) {
				target = resolveUser(msg, args.join(" "));
			} else {
				target = msg.author;
			}
			if(!target) {
				out = "User not found.";
			} else if(!tulpae[target.id]) {
				out = (target.id == msg.author.id) ? "You have not registered any " + cfg.lang + "s." : "That user has not registered any " + cfg.lang + "s.";
			} else {
				out = { embed: {
					title: `${target.username}#${target.discriminator}'s registered ${cfg.lang}s`,
					author: {
						name: target.username,
						icon_url: target.avatarURL
					},
					fields: []
				}};
				let len = 200;
				let page = 1;
				tulpae[target.id].forEach(t => {
					let field = generateTulpaField(t);
					len += field.name.length;
					len += field.value.length;
					if(len < 5000) {
						out.embed.fields.push(field);
					} else {
						out.embed.title += ` (page ${page})`;
						send(msg.channel, out);
						len = 200;
						page++;
						out.embed.title = `${target.username}#${target.discriminator}'s registered ${cfg.lang}s (page ${page})`;
						out.embed.fields = [field];
					}
				});
			}
			send(msg.channel, out);
		}
	},
	
	rename: {
		help: cfg => "Change a " + cfg.lang + "'s name",
		usage: cfg =>  ["rename <name> <newname> - Set a new name for the " + cfg.lang + ""],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["rename"], cfg);
			} else if(!args[1]) {
				out = "Missing argument 'newname'.";
			} else if(args[1].length < 2 || args[1].length > 28) {
				out = "New name must be between 2 and 28 characters.";
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[1].toLowerCase())) {
				out = "You already have a " + cfg.lang + " with that new name.";
			} else {
				tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).name = args[1];
				save("tulpae",tulpae);
				out = proper(cfg.lang) + " renamed successfully.";
			}
			send(msg.channel, out);
		}
	},
	
	avatar: {
		help: cfg => "View or change a " + cfg.lang + "'s avatar",
		usage: cfg =>  ["avatar <name> [url] - if url is specified, change the " + cfg.lang + "'s avatar, if not, simply echo the current one"],
		permitted: () => true,
		desc: cfg => "The specified URL must be a direct link to an image - that is, the URL should end in .jpg or .png or another common image filetype. Also, it can't be over 1mb in size, as Discord doesn't accept images over this size as webhook avatars.",
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["avatar"], cfg);
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(!args[1]) {
				out = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).url;
			} else if(!validUrl.isWebUri(args[1])) {
				out = "Malformed url.";
			} else if (args[1].indexOf("imgur.com/a/") != -1) {
				return send(msg.channel, "That is an Imgur album link.  You need to give me the direct URL of the image in that album that you want used");
			} else {
				
				request(args[1], { method: "HEAD" }, (err, res) => {
					if(err || !res.headers["content-type"] || !res.headers["content-type"].startsWith("image")) return send(msg.channel, "I couldn't find an image at that URL. Make sure it's a direct link (ends in .jpg or .png for example).");
					if(Number(res.headers["content-length"]) > 1000000) {
						return send(msg.channel, "That image is too large and Discord will not accept it. Please use an image under 1mb.");
					}
					tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).url = args[1];
					save("tulpae",tulpae);
					send(msg.channel, "Avatar changed successfully.");
				});
				return;
			}
			send(msg.channel, out);
		}
	},
	
	describe: {
		help: cfg => "View or change a " + cfg.lang + "'s description",
		usage: cfg =>  ["describe <name> [desc] - if desc is specified, change the " + cfg.lang + "'s describe, if not, simply echo the current one"],
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["describe"], cfg);
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(!args[1]) {
				out = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).desc;
			} else {
				tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).desc = args.slice(1).join(" ").slice(0,500);
				save("tulpae",tulpae);
				out = "Description updated successfully.";
			}
			send(msg.channel, out);
		}
	},
		
	birthday: {
		help: cfg => "View or change a " + cfg.lang + "'s birthday, or see upcoming birthdays",
		usage: cfg =>  ["birthday [name] [date] -\n\tIf name and date are specified, set the named " + cfg.lang + "'s birthday to the date.\n\tIf name only is specified, show the " + cfg.lang + "'s birthday.\n\tIf neither are given, show the next 5 birthdays on the server."],
		desc: cfg => "Date must be given in format MM/DD/YY",
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				let tulps = Object.keys(tulpae)
					.filter(id => id == msg.author.id || (msg.channel.guild && msg.channel.guild.members.has(id)))
					.reduce((arr, tul) => arr.concat(tulpae[tul]), []);
				if(!tulps[0])
					return send(msg.channel, "No " + cfg.lang + "s have been registered on this server.");
				tulps = tulps.filter(t => !!t.birthday);
				if(!tulps[0])
					return send(msg.channel, "No " + cfg.lang + "s on this server have birthdays set.");
				let n = new Date();
				let now = new Date(n.getFullYear(),n.getMonth(),n.getDate());
				out = "Here are the next few upcoming " + cfg.lang + " birthdays in this server:\n" +
					tulps.sort((a,b) => {
						let first = new Date(a.birthday);
						first.setFullYear(now.getFullYear());
						if(first < now) first.setFullYear(now.getFullYear()+1);
						let second = new Date(b.birthday);
						second.setFullYear(now.getFullYear());
						if(second < now) second.setFullYear(now.getFullYear()+1);
						return first.getTime()-second.getTime();
					}).slice(0,5)
						.map(t => {
							let bday = new Date(t.birthday);
							bday.setFullYear(now.getFullYear());
							if(bday < now) bday.setFullYear(now.getFullYear()+1);
							return (bday.getTime() == now.getTime()) ? `${t.name}: Birthday today! \uD83C\uDF70` : `${t.name}: ${bday.toDateString()}`;
						}).join("\n");
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(!args[1]) {
				let bday = tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase()).birthday;
				out = bday ? new Date(bday).toDateString() : "No birthday currently set for " + args[0];
			} else if(!(new Date(args[1]).getTime())) {
				out = "I can't understand that date. Please enter in the form MM/DD/YYYY with no spaces.";
			} else {
				let date = new Date(args[1]);
				tulpae[msg.author.id].find(t => t.name.toLowerCase() === args[0].toLowerCase()).birthday = date.getTime();
				save("tulpae",tulpae);
				out = `${proper(cfg.lang)} '${args[0]}' birthday set to ${date.toDateString()}.`;
			}
			send(msg.channel, out);
		}
	},
	
	brackets: {
		help: cfg => "View or change a " + cfg.lang + "'s brackets",
		usage: cfg =>  ["brackets[alternate [#]] <name> [brackets] - if brackets are given, change the " + cfg.lang + "'s brackets, if not, simply echo the current one.  Can also specify alternate brackets, starting from 1.  Omit # to default to alternate 1"],
		desc: cfg => "Brackets must be the word 'text' surrounded by any symbols or letters, i.e. `[text]` or `>>text`",
		permitted: () => true,
		execute: function(msg, args, cfg) {
			
			let checkName = (idx) => tulpae[msg.author.id] && tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[idx].toLowerCase());
			
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["brackets"], cfg);
			} else if (args[0].toLowerCase() == "alternate"  &&(checkName(1) || (!isNaN(args[1]) && checkName(2)))) { // If we're prefixing 'alternate', and can find a valid name later down the line...
				const reducer = (a, c) => a + ", " + c;
				
				let nameIndex = checkName(1) ? 1 : 2;
				let tupper = checkName(nameIndex);
				
				let alternate = nameIndex == 2 ? Math.floor(Number(args[1])) : 1;
				
				if (alternate < 1) {
					out = "Cannot address this alternate";
				} else if (alternate > 4) {
					out = "YOu are limited to 4 alternates at this time";
				} else {					
					let brackets = args.slice(nameIndex + 1).join(" ").split("text");
					
					if(brackets.length == 1 && brackets[0] == "") {
						tupper.alternates = tupper.alternates || Array();
						
						if (tupper.alternates.length >= alternate) {
							out = `Alternate brackets for ${tupper.name}: ${tupper.alternates[alternate-1][0]}text${tupper.alternates[alternate-1][1]}`;
						} else {
							out = "Unable to display alternate; does not exist";
						}
					} else if(brackets.length == 1 && brackets[0] == "remove") {
						tupper.alternates = tupper.alternates || Array();
						
						if (tupper.alternates.length >= alternate) {
							out = `Removing alternate bracket set ${alternate}`;
							tupper.alternates.splice(alternate - 1, 1);
							save("tulpae",tulpae);
						} else {
							out = "Unable to remove alternate; does not exist";
						}
					} else if(brackets.length < 2) {
						out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
					} else if(!brackets[0] && !brackets[1]) {
						out = "Need something surrounding 'text'.";
					} else {
						tupper.alternates = tupper.alternates || Array();
						tupper.alternates[alternate - 1] = brackets;
						save("tulpae",tulpae);
						out = "Alternate brackets updated successfully.";
					}
			}
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(!args[1]) {
				let brackets = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).brackets;
				out = `Brackets for ${args[0]}: ${brackets[0]}text${brackets[1]}`;
			} else {
				let brackets = args.slice(1).join(" ").split("text");
				if(brackets.length < 2) {
					out = "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
				} else if(!brackets[0] && !brackets[1]) {
					out = "Need something surrounding 'text'.";
				} else {
					tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).brackets = brackets;
					save("tulpae",tulpae);
					out = "Brackets updated successfully.";
				}
			}
			send(msg.channel, out);
		}
	},
	
	tag: {
		help: cfg => "Remove or change a " + cfg.lang + "'s tag (displayed next to name when proxying)",
		usage: cfg => ["tag <name> [tag] - if tag is given, change the " + cfg.lang + "'s tag, if not, clear the tag"],
		desc: cfg => "A " + cfg.lang + "'s tag is shown next to their name when speaking.",
		permitted: () => true,
		execute: function(msg, args, cfg) {
			let out = "";
			args = getMatches(msg.content,/['](.*?)[']|(\S+)/gi).slice(1);
			if(!args[0]) {
				return bot.cmds.help.execute(msg, ["tag"], cfg);
			} else if(!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
				out = "You don't have a " + cfg.lang + " with that name registered.";
			} else if(!args[1]) {
				delete tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).tag;
				save("tulpae",tulpae);
				out = "Tag cleared.";
			} else if (args.slice(1).join(" ").length + tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).name.length > 27) {
				out = "That tag is too long to use with that " + cfg.lang + "'s name. The combined total must be less than 28 characters.";
			} else {
				tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).tag = args.slice(1).join(" ");
				save("tulpae",tulpae);
				out = "Tag updated successfully.";
			}
			send(msg.channel, out);
		}
	},
	
	showuser: {
		help: cfg => "Show the user that registered the " + cfg.lang + " that last spoke",
		usage: cfg =>  ["showuser - Finds the user that registered the " + cfg.lang + " that last sent a message in this channel"],
		permitted: (msg) => true,
		execute: function(msg, args, cfg) {
			if(!recent[msg.channel.id]) send(msg.channel, "No " + cfg.lang + "s have spoken in this channel since I last started up, sorry.");
			else {
				let user = bot.users.get(recent[msg.channel.id][0].userID);
				send(msg.channel, `Last ${cfg.lang} message sent by ${recent[msg.channel.id][0].tulpa.name}, registered to ${user ? user.username + "#" + user.discriminator : "(unknown user " + recent[msg.channel.id][0].userID + ")"}`);
			}
		}
	},
	
	find: {
		help: cfg => "Find and display info about " + cfg.lang + "s by name",
		usage: cfg =>  ["find <name> - Attempts to find a " + cfg.lang + " with exactly the given name, and if none are found, tries to find " + cfg.lang + "s with names containing the given name."],
		permitted: (msg) => true,
		execute: function(msg, args, cfg) {
			if(msg.channel instanceof Eris.PrivateChannel)
				return send(msg.channel, "This command cannot be used in private messages.");
			if(!args[0])
				return bot.cmds.help.execute(msg, ["find"], cfg);
			let all = Object.keys(tulpae)
				.filter(id => msg.channel.guild.members.has(id))
				.reduce((arr, tul) => arr.concat(tulpae[tul]), []);
			if(!all[0]) {
				return send(msg.channel, "There are no " + cfg.lang + "s registered on this server.");
			}
			let search = args.join(" ").toLowerCase();
			let tul = all.filter(t => t.name.toLowerCase() == search);
			if(!tul[0])
				tul = all.filter(t => t.name.toLowerCase().includes(search));
			if(!tul[0])
				send(msg.channel, "Couldn't find a " + cfg.lang + " with that name.");
			else {
				if(tul.length == 1) {
					let t = tul[0];
					let host = bot.users.get(t.host);
					let embed = { embed: {
						author: {
							name: t.name,
							icon_url: t.url
						},
						description: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${generateTulpaField(t).value}`,
					}};
					send(msg.channel, embed);
				} else {
					tul = tul.slice(0,10);
					let embed = { embed: {
						title: "Results",
						fields: []
					}};
					tul.forEach(t => {
						let host = bot.users.get(t.host);
						embed.embed.fields.push({name: t.name, value: `Host: ${host ? host.username + "#" + host.discriminator : "Unknown user " + t.host}\n${generateTulpaField(t).value}`});
					});
					send(msg.channel, embed);
				}
			}
		}
	},
	
	invite: {
		help: cfg => "Get the bot's invite URL",
		usage: cfg =>  ["invite - sends the bot's oauth2 URL in this channel"],
		permitted: (msg) => true,
		execute: function(msg, args, cfg) {
			send(msg.channel, `https://discordapp.com/api/oauth2/authorize?client_id=${auth.inviteCode}&permissions=805314560&scope=bot`);
		}
	},

	cfg: {
		help: cfg => "Configure server-specific settings",
		usage: cfg =>  ["cfg prefix <newPrefix> - Change the bot's prefix",
			"cfg roles <enable|disable> - Enable or disable automatically managed mentionable " + cfg.lang + " roles, so that users can mention " + cfg.lang + "s",
			"cfg rename <newname> - Change all instances of the default name 'tulpa' in bot replies in this server to the specified term",
			"cfg log <channel> - Enable the bot to send a log of all " + cfg.lang + " messages and some basic info like who registered them. Useful for having a searchable channel and for distinguishing between similar names.",
			"cfg blacklist <add|remove> <channel(s)> - Add or remove channels to the bot's proxy blacklist - users will be unable to proxy in blacklisted channels.",
			"cfg cmdblacklist <add|remove> <channel(s)> - Add or remove channels to the bot's command blacklist - users will be unable to issue commands in blacklisted channels."],
		
		permitted: (msg) => (msg.member && msg.member.permission.has("administrator")),
		execute: function(msg, args, cfg) {
			let out = "";
			if(msg.channel instanceof Eris.PrivateChannel) {
				out = "This command cannot be used in private messages.";
			} else if(!args[0] || !["prefix","roles","rename","log","blacklist","cmdblacklist"].includes(args[0])) {
				return bot.cmds.help.execute(msg, ["cfg"], cfg);
			} else if(args[0] == "prefix") {
				if(!args[1]) {
					out = "Missing argument 'prefix'.";
				} else {
					cfg.prefix = args[1];
					config.prefix = args[1];
					out = "Prefix changed to " + args[1];
					updateStatus();
					save("servercfg",config);
				}
			} else if(args[0] == "roles") {
				if(!msg.channel.guild.members.get(bot.user.id).permission.has("manageRoles")) {
					out = "I don't have permission to manage roles.";
				} else if(args[1] === "enable") {
					let guild = msg.channel.guild;
					if(cfg.rolesEnabled)
						out = proper(cfg.lang) + " roles already enabled on this server.";
					else {
						cfg.rolesEnabled = true;
						Promise.all(Object.keys(tulpae).filter(t => guild.members.has(t)).map(t => {
							let mem = guild.members.get(t);
							return Promise.all(tulpae[t].map(tul => {
								if(!mem.roles.find(r => guild.roles.get(r).name === tul.name))
									return guild.createRole({name: tul.name, mentionable: true}).then(r => {
										mem.addRole(r.id);
										if(!tul.roles) tul.roles = {};
										tul.roles[guild.id] = r.id;
									});
								return true;
							}));
						})).then(() => {
							save("tulpae",tulpae);
						});
						save("servercfg",config);
						out = proper(cfg.lang) + " roles enabled. Adding the roles may take some time.";
					}
				} else if(args[1] === "disable") {
					let guild = msg.channel.guild;
					if(!cfg.rolesEnabled)
						out = proper(cfg.lang) + " roles already disabled on this server.";
					else {
						cfg.rolesEnabled = false;
						Object.keys(tulpae).filter(t => guild.members.has(t)).forEach(t => {
							let mem = guild.members.get(t);
							tulpae[t].forEach(tul => {
								if(tul.roles && tul.roles[guild.id]) {
									guild.deleteRole(tul.roles[guild.id]);
									delete tul.roles[guild.id];
									if(!Object.keys(tul.roles)[0]) delete tul.roles;
								}
							});
						});
						save("tulpae",tulpae);
						save("servercfg",config);
						out = proper(cfg.lang) + " roles disabled. Deleting the roles may take some time.";
					}
				} else {
					out = "Missing argument 'enable|disable'.";
				}
			} else if(args[0] == "rename") {
				if(!args[1]) {
					out = "Missing argument 'newname'";
				} else {
					cfg.lang = args.slice(1).join(" ");
					out = "Entity name changed to " + cfg.lang;
					save("servercfg",config);
				}
			} else if(args[0] == "log") {
				if(!args[1]) {
					out = "Logging channel unset. Logging is now disabled.";
					cfg.log = null;
					save("servercfg",config);
				} else {
					let channel = resolveChannel(msg,args[1]);
					if(!channel) {
						out = "Channel not found.";
					} else {
						out = `Logging channel set to <#${channel.id}>`;
						cfg.log = channel.id;
						save("servercfg",config);
					}
				}
			} else if(args[0] == "blacklist") {
				if(!args[1]) {
					if(cfg.blacklist) out = `Currently blacklisted channels: ${cfg.blacklist.map(id => "<#"+id+">").join(" ")}`;
					else out = "No channels currently blacklisted.";
				} else if(args[1] == "add") {
					if(!args[2]) {
						out = "Must provide name/mention/id of channel to blacklist.";
					} else {
						let channels = args.slice(2).map(arg => resolveChannel(msg,arg)).map(ch => { if(ch) return ch.id; else return ch; });
						if(!channels.find(ch => ch != undefined)) {
							out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
						} else if(channels.find(ch => ch == undefined)) {
							out = "Could not find these channels: ";
							for(let i = 0; i < channels.length; i++)
								if(!channels[i]) out += args.slice(2)[i];
						} else {
							if(!cfg.blacklist) cfg.blacklist = [];
							cfg.blacklist = cfg.blacklist.concat(channels);
							out = `Channel${channels.length > 1 ? "s" : ""} blacklisted successfully.`;
							save("servercfg",config);
						}
					}
				} else if(args[1] == "remove") {
					if(!args[2]) {
						out = "Must provide name/mention/id of channel to allow.";
					} else {
						let channels = args.slice(2).map(arg => resolveChannel(msg,arg)).map(ch => { if(ch) return ch.id; else return ch; });
						if(!channels.find(ch => ch != undefined)) {
							out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
						} else if(channels.find(ch => ch == undefined)) {
							out = "Could not find these channels: ";
							for(let i = 0; i < channels.length; i++)
								if(!channels[i]) out += args.slice(2)[i] + " ";
						} else {
							if(!cfg.blacklist) cfg.blacklist = [];
							channels.forEach(ch => { if(cfg.blacklist.includes(ch)) cfg.blacklist.splice(cfg.blacklist.indexOf(ch),1); });
							out = `Channel${channels.length > 1 ? "s" : ""} removed from blacklist.`;
							if(!cfg.blacklist[0]) delete cfg.blacklist;
							save("servercfg",config);
						}
					}
				} else {
					out = "Invalid argument: must be 'add' or 'remove'";
				}
			} else if(args[0] == "cmdblacklist") {
				if(!args[1]) {
					if(cfg.cmdblacklist) out = `Currently cmdblacklisted channels: ${cfg.cmdblacklist.map(id => "<#"+id+">").join(" ")}`;
					else out = "No channels currently cmdblacklisted.";
				} else if(args[1] == "add") {
					if(!args[2]) {
						out = "Must provide name/mention/id of channel to cmdblacklist.";
					} else {
						let channels = args.slice(2).map(arg => resolveChannel(msg,arg)).map(ch => { if(ch) return ch.id; else return ch; });
						if(!channels.find(ch => ch != undefined)) {
							out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
						} else if(channels.find(ch => ch == undefined)) {
							out = "Could not find these channels: ";
							for(let i = 0; i < channels.length; i++)
								if(!channels[i]) out += args.slice(2)[i];
						} else {
							if(!cfg.cmdblacklist) cfg.cmdblacklist = [];
							cfg.cmdblacklist = cfg.cmdblacklist.concat(channels);
							out = `Channel${channels.length > 1 ? "s" : ""} blacklisted successfully.`;
							save("servercfg",config);
						}
					}
				} else if(args[1] == "remove") {
					if(!args[2]) {
						out = "Must provide name/mention/id of channel to allow.";
					} else {
						let channels = args.slice(2).map(arg => resolveChannel(msg,arg)).map(ch => { if(ch) return ch.id; else return ch; });
						if(!channels.find(ch => ch != undefined)) {
							out = `Could not find ${channels.length > 1 ? "those channels" : "that channel"}.`;
						} else if(channels.find(ch => ch == undefined)) {
							out = "Could not find these channels: ";
							for(let i = 0; i < channels.length; i++)
								if(!channels[i]) out += args.slice(2)[i] + " ";
						} else {
							if(!cfg.cmdblacklist) cfg.cmdblacklist = [];
							channels.forEach(ch => { if(cfg.cmdblacklist.includes(ch)) cfg.cmdblacklist.splice(cfg.cmdblacklist.indexOf(ch),1); });
							out = `Channel${channels.length > 1 ? "s" : ""} removed from cmdblacklist.`;
							if(!cfg.cmdblacklist[0]) delete cfg.cmdblacklist;
							save("servercfg",config);
						}
					}
				} else {
					out = "Invalid argument: must be 'add' or 'remove'";
				}
			}
			send(msg.channel, out);
		}
	}
};

// Some command aliasing
bot.cmds.forms = bot.cmds.form;
bot.cmds.unregister = bot.cmds.remove;

bot.cmds.showhost = {
	permitted: true,
	execute: bot.cmds.showuser.execute
};

if (!auth.inviteCode) {
	delete bot.cmds.invite;
}

function updateStatus() {
	bot.editStatus({ name: `Doing botty things`});
}

function validateGuildCfg(guild) {
	if(!config[guild.id])
		config[guild.id] = {};
	if(config[guild.id].prefix == undefined)
		config[guild.id].prefix = "tul!";
	if(config[guild.id].rolesEnabled == undefined)
		config[guild.id].rolesEnabled = false;
	if(config[guild.id].lang == undefined)
		config[guild.id].lang = "tulpa";
	if(config[guild.id].log == undefined)
		config[guild.id].log = null;
	save("servercfg",config);
}

function proper(text) {
	return text.substring(0,1).toUpperCase() + text.substring(1);
}

function save(name, obj) {
	return fs.writeFile(`${__dirname}/${name}.json`,JSON.stringify(obj,null,2), printError);
}

function generateTulpaField(tulpa) {
	return {
		name: tulpa.name,
		value: `${tulpa.tag ? ("Tag: " + tulpa.tag + "\n") : ""}Brackets: ${[tulpa.brackets[0]+"text"+tulpa.brackets[1]].concat(tulpa.alternates || []).reduce((a,c) => a + ", " + (c[0] + "text" + c[1]) )}
		Avatar URL: ${tulpa.url}${tulpa.birthday ? ("\nBirthday: "+new Date(tulpa.birthday).toDateString()) : ""}
		${ tulpa.forms ? "Forms: " + Object.keys(tulpa.forms).reduce((a, c) => a + ", " + c) + "\n" : ""}Total messages sent: ${tulpa.posts}${tulpa.desc ? ("\n"+tulpa.desc) : ""} `
	};
}

function checkTulpaBirthday(tulpa) {
	if(!tulpa.birthday) return false;
	let day = new Date(tulpa.birthday);
	let now = new Date();
	return day.getDate() == now.getDate() && day.getMonth() == now.getMonth();
}

function resolveKey(haystack, needle) {
	for (var key in haystack)
		if (key.toLowerCase() == needle.toLowerCase())
			return key;
	return null;
}

function resolveUser(msg, text) {
	let target = bot.users.get(/<@!?(\d+)>/.test(text) && text.match(/<@!?(\d+)>/)[1]) || bot.users.get(text) || msg.channel.guild.members.find(m => m.username.toLowerCase() == text.toLowerCase() || (m.nick && m.nick.toLowerCase()) == text.toLowerCase() || text.toLowerCase() == `${m.username.toLowerCase()}#${m.discriminator}`);
	if(target && target.user) target = target.user;
	return target;
}

function resolveChannel(msg, text) {
	let g = msg.channel.guild;
	return g.channels.get(/<#(\d+)>/.test(text) && text.match(/<#(\d+)>/)[1]) || g.channels.get(text) || g.channels.find(m => m.name.toLowerCase() == text.toLowerCase());
}

function checkPermissions(cmd, msg, args) {
	return (msg.author.id === auth.owner) || (bot.cmds[cmd].permitted(msg,args));
}

function printError(err) {
	if(err) return console.error(err);
}

function send(channel, message, file, typing) {
	if(typing) {
		return channel.sendTyping().then(() => {
			setTimeout(() => channel.createMessage(message,file), Math.min(6*message.length+750,4000));
		});
	}
	channel.createMessage(message, file);
}

function getMatches(string, regex) {
	var matches = [];
	var match;
	while (match = regex.exec(string)) {
		match.splice(1).forEach(m => { if(m) matches.push(m); });
	}
	return matches;
}

process.on("unhandledRejection", console.log);

bot.connect();


