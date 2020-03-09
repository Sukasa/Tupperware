const vowels = ["a", "e", "i", "o", "u"];

module.exports = function (bot) {

	return {
		proper: (text) => text.substring(0, 1).toUpperCase() + text.substring(1),

		article: (text) => vowels.includes(text.slice(0, 1)) ? "an" : "a",

		capitalize: (text) => text.substring(0, 1).toUpperCase() + text.substring(1),

		parseCamelCase: (text) => text.replace(/((?<!^)[A-Z](?![A-Z]))(?=\S)/g, ' $1').replace(/^./, x => x.toUpperCase())
	};
}