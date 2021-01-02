const levenshtein = require("js-levenshtein");

module.exports = function (bot) {

	function getTulpa(user, name, maxDistance) {
		user = getUser(user);
		maxDistance = (maxDistance == null) ? 1.0 : maxDistance;

		if (user) {
			var matches = Object.values(user.tulpae).filter(t => t.name.toLowerCase().indexOf(name.toLowerCase()) > -1)

			var matchDistance = 10000; // arbitrarily high number
			var closestMatch = null;

			for (var i = 0; i < matches.length; i++) {
				var distance = levenshtein(matches[i].name, name);
				if (matchDistance > distance) {
					closestMatch = matches[i];
					matchDistance = distance;
				}
			}

			if (closestMatch) {
				matchDistance /= closestMatch.name.length;

				if (matchDistance <= maxDistance)
					return closestMatch;
			}
		}
	};

	function getUserId(user) {
		user = user.author || user;
		user = user.userID || user.id || user;
		return user;
	};

	function userGDPR(usr) {
		delete bot.hosts[getUserId(usr)];
		bot.configuration.markDirty("hosts");
	}

	// Doesn't do user searches - use bot.resolvers.resolveUser() for that
	function getUser(usr) {
		let user = bot.hosts[getUserId(usr)];

		if (!user) {
			user = JSON.parse(JSON.stringify(bot.newUser));
			user.id = getUserId(usr)
			// We don't store data here, for GDPR.
			// Instead, storing a user for long-term archival is done in register() below
		} else

			// Only collect/update GDPR-ish data (username, discriminator) for users that have a registered tulpa
			if (Object.keys(user.tulpae).length && usr.username && (usr.username != user.username || user.discriminator != usr.discriminator)) {
				bot.logger.info("Updating information for " + usr.username);
				user.username = usr.username;
				user.discriminator = usr.discriminator;
				bot.configuration.markDirty("hosts");
			}

		return user;
	};

	function listForMessage(msg) {
		let hostIds = Object.keys(bot.hosts).filter(id => id == msg.author.id || (msg.channel.guild && msg.channel.guild.members.has(id)));
		let tulpae = hostIds.map(id => Object.values(bot.hosts[id].tulpae))
		return tulpae.reduce((sum, next) => sum.concat(next));
	};

	function parseBrackets(args) {
		let brackets = args.join(" ").split("text");

		if (brackets.length < 2)
			throw "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";

		if (!brackets[0] && !brackets[1])
			throw "Need something surrounding 'text'.";

		return brackets;
	};

	// Validate that the brackets won't collide against any other existing brackets in use (except one tulpa, e.g. the one having brackets validated)
	function validateBrackets(user, brackets, exempt) {

		user = getUser(user);

		if (!user)
			throw "Internal error: invalid user @ tulpae::validateBrackets()";

		if (!brackets)
			throw "Unable to validate null brackets";

		let other;
		if (other = Object.values(user.tulpae).find(x => x != exempt && x.brackets.find(y => (y[0].toLowerCase() == brackets[0].toLowerCase()) &&
			(brackets[1].toLowerCase() == y[1].toLowerCase()))))
			throw `Those brackets are ambiguous with ${other.name}'s, please choose a different set`;

		return brackets;
	};

	function register(usr, name, brackets) {
		let user = getUser(usr, true);


		if (!Object.values(bot.hosts).includes(user))
			bot.hosts[user.id] = user;

		if (user.tulpae[name])
			throw "A tulpa already exists with this name";

		let newTulpa = JSON.parse(JSON.stringify(bot.newTulpa));
		newTulpa.name = name;
		newTulpa.brackets = [validateBrackets(user, brackets)];
		newTulpa.host = user.id;


		user.tulpae[name] = newTulpa;
		bot.configuration.markDirty("hosts");

		return newTulpa;
	};

	function checkBirthday(tulpa) {
		if (!tulpa.birthday) return false;
		let day = new Date(tulpa.birthday);
		let now = new Date();
		return day.getDate() == now.getDate() && day.getMonth() == now.getMonth();
	};

	return {
		getTulpa: getTulpa,
		getUser: getUser,
		register: register,
		parseBrackets: parseBrackets,
		validateBrackets: validateBrackets,
		listForMessage: listForMessage,
		checkBirthday: checkBirthday,
		userGDPR: userGDPR
	};
}