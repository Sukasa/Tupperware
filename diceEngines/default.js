let diceRegex = /!(?:(?:roll\s|dice\s)?((?:\d+)?)d(\d+))\s*((?:\s*?(?:-|\+|\*|top|bottom|drop|tn)\s*-?[0-9.]*[0-9]+\s*?)+)?/gi;
let modifierRegex = /(?:(\+|\-|\*|top|bottom|drop|tn)\s*(-?[0-9.]*[0-9]+))/gi;
const crypto = require("crypto");

module.exports = function () {

	// Should test the message and return any matches, to be passed to execute()
	function test(msg) {
		let resultSets = [];

		while (match = diceRegex.exec(msg.content))
			resultSets.push(match);

		return resultSets[0] && resultSets;
	}

	function doRoll(rollMatch, engineCfg) {
		let numDice = rollMatch[1] || 1;
		let numSides = rollMatch[2];
		let modifiers = rollMatch[3];
		let finalAdjust = 0;
		let multiplier = 1;
		let tn;

		let rolls = [];

		let bytes = Math.floor(Math.log2(numSides - 1) / 8) + 1;
		let cap = Math.pow(2, bytes * 8) - (Math.pow(2, bytes * 8) % numSides);
		let sanity = 0;
		do {
			let rollsRaw = crypto.randomBytes(numDice * bytes);
			if (++sanity > 10)
				throw "Failed to generate dice rolls, please try again";

			for (var d = numDice - 1; d >= 0; d--) {
				let rollBytes = rollsRaw.slice(d * bytes, d * bytes + bytes + 1);
				let rollValue = rollBytes.reduce((a, b) => a * 256 + b);
				if (rollValue % numSides < cap)
					rolls.unshift({ value: (rollValue % numSides) + 1, valid: true });
			}
		} while (rolls.length < numDice);

		rolls = rolls.slice(0, numDice);

		if (modifiers != null) {
			var modifier;
			while (modifier = modifierRegex.exec(modifiers)) {
				// Apply modifier
				var by = modifier[2];
				var indice = 0;
				switch (modifier[1]) {
					case "top":
						by = numDice - by;
					case "drop":
						for (var passes = 0; passes < by; passes++) {
							indice = rolls.reduce((iMin, x, i, arr) => x.value < arr[iMin].value && x.valid ? i : iMin, 0)
							rolls[indice].valid = false;
						}
						break;
					case "bottom":
						by = numDice - by;
						for (var passes = 0; passes < by; passes++) {
							indice = rolls.reduce((iMax, x, i, arr) => x.value > arr[iMax].value && x.valid ? i : iMax, 0)
							rolls[indice].valid = false;
						}
						break;
					case "tn":
						tn = by;
						break;
					case "+":
						finalAdjust = Number(finalAdjust) + Number(by);
						break;
					case "-":
						finalAdjust = Number(finalAdjust) - Number(by);
						break;
					case "*":
						multiplier = multiplier * Number(by);
						break;
				}
			}
		}

		// Modifiers applied and final adjustment done.  Now to make the output string.
		var finalResult = rolls.map(x => x.valid ? `${x.value}` : `||${x.value}||`).join(", ");
		var output = `**${numDice}d${numSides}${modifiers ? ` ${modifiers}` : ""}**: ${finalResult}`;
		let finalRoll = rolls.reduce((s, r) => s + (r.valid && r.value), 0) * multiplier;

		if (tn) {
			tn = Number(tn) + Number(finalAdjust);
			var degrees = 0;

			if (engineCfg.tnstyle == "tens") {
				degrees = Math.abs(Math.floor(tn / 10) - Math.floor(finalRoll / 10)) + 1;
			} else {
				degrees = Math.floor(Math.abs(tn - Math.floor(finalRoll)) / 10) + 1;
			}

			return `${output} = ** ${finalRoll}** (TN = ${tn}).**  ${finalRoll <= tn ? "Pass" : "Fail"}** by **${degrees}** degree${(degrees > 1 ? "s" : "")}`;
		} else {
			if (finalAdjust > 0)
				output = `${output} + ${finalAdjust}`;
			if (finalAdjust < 0)
				output = `${output} - ${Math.abs(finalAdjust)}`;

			return `${output} = **${finalRoll + finalAdjust}**`; 
		}
	}

	function execute(state, cfg) {
		return state.map(x => doRoll(x, cfg));
	}

	return {
		test: test,
		execute: execute,
		settings: {"tnstyle": ["default","tens"]}
	};

}