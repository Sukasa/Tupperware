const priorities = require("../component/priorities");
let diceRegex = /!(?:(?:roll\s|dice\s)?((?:\d+)?)d(\d+))\s*((?:\s*?(?:-|\+|top|bottom|drop)\s*-?\d+\s*?)+)?/gi;
let modifierRegex = /(?:(\+|\-|top|bottom|drop)\s*(\d+))/gi;


function reduceDice(state, dice) {
	if (dice.valid) {
		state.content = `${state.content}${state.sep}${dice.value}`;
		state.sum += dice.value;
	} else
		state.content = `${state.content}${state.sep}||${dice.value}||`;
	state.sep = ", ";
	return state;
}

function handleDiceRoll(rollMatch) {
	var numDice = rollMatch[1] || 1;
	var numSides = rollMatch[2];
	var modifiers = rollMatch[3];
	var finalAdjust = 0;

	var rolls = [];
	for (var d = numDice; d > 0; d--)
		rolls.push({ value: Math.floor(Math.random() * numSides) + 1, valid: true });

	if (modifiers != null) {
		var modifier;
		while (modifier = modifierRegex.exec(modifiers)) {
			// Apply modifier
			var by = modifier[2];
			var last;
			var indice = 0;
			switch (modifier[1]) {
				case "top":
					by = numDice - by;
				case "drop":
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

	var finalResult = rolls.reduce(reduceDice, { content: "", sep: "", sum: 0 });

	var output = "**" + numDice + "d" + numSides + (modifiers ? " " + modifiers : "") + "**: " + finalResult.content;
	if (finalAdjust > 0)
		output = output + " + " + finalAdjust;
	if (finalAdjust < 0)
		output = output + " - " + Math.abs(finalAdjust);

	return output + " = **" + (finalResult.sum + finalAdjust) + "**";
}


module.exports = function (bot) {

	return {
		priority: priorities.MEDIUM,

		test: function (msg, bot) {
			let cfg = msg.channel.guild && bot.config[msg.channel.guild.id] || { prefix: "t!", rolesEnabled: false, lang: "tulpa" };
			return (diceRegex.test(msg.content) && (!cfg.diceblacklist || !cfg.diceblacklist.includes(msg.channel.id)));
		},

		execute: async (msg, bot) => {
			diceRegex.lastIndex = 0;
			var resultSets = [];
			var match;

			while (match = diceRegex.exec(msg.content))
				resultSets.push(handleDiceRoll(match));

			const hook = await bot.fetchWebhook(msg.channel)
			const data = {
				wait: true,
				content: resultSets.join("\n"),
				username: `Dice Roll${resultSets.length > 1 ? "s" : ""}`,
				avatarURL: "https://greenfirework.com/dicerollflat.png",
			};

			try {
				await bot.executeWebhook(hook.id, hook.token, data);
			} catch (e) {
				console.log(e);
				if (e.code === 10015) {
					delete webhooks[msg.channel.id];
					const hook = await bot.fetchWebhook(msg.channel);
					return bot.executeWebhook(hook.id, hook.token, data);
				}
			}

			return;
		}
	};
}]