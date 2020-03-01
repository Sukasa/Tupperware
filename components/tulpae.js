module.exports = function (bot) {

	function getTulpa(user, name) {
		let user = getUser(user);
		if (user) {
			return user.tulpae.find(t => t.name.toLowerCase().indexOf(name.toLowerCase()) > -1);
		}
	};

	function getUserId(user) {
		user = user.author || user;
		user = user.userID || user.id || user;
		return user;
	}

	function getUser(usr) {
		let user = bot.users[getUserId(usr)];

		if (!user) {
			user = JSON.parse(JSON.stringify(bot.newUser));
			user.id = getUserId(usr)
			bot.users[user.id] = user;
		}
	};

	function listForMessage(msg) {
		return Object.keys(bot.users)
			.filter(id => id == msg.author.id || (msg.channel.guild && msg.channel.guild.members.has(id)))
			.reduce((arr, userId) => arr.concat(Object.values(bot.users[userId].tulpae)));
	}

	function parseBrackets(args) {
		let brackets = args.join(" ").split("text");
		if (brackets.length < 2) {
			throw "No 'text' found to detect brackets with. For the last part of your command, enter the word 'text' surrounded by any characters (except `''`).\nThis determines how the bot detects if it should replace a message.";
		} else if (!brackets[0] && !brackets[1]) {
			throw "Need something surrounding 'text'.";
		} else {
			return brackets;
		}
	}

	function validateBrackets(user, brackets) {
		// TODO validate that the brackets won't collide against any other existing brackets in use
		user = getUser(user);

		if (!user)
			throw "Internal error: invalid user @ validateBrackets()";

		if (user.tulpae.find(x => x.brackets[0].toLowerCase))
			throw "Bracket collision"; // TODO better text

		return brackets;
	}

	function register(usr, name, brackets) {
		let user = getUser(usr);

		if (user.tulpae[name])
			throw "A tulpa already exists with this name";

		let newTulpa = JSON.parse(JSON.stringify(bot.defaultTulpa));
		newTulpa.name = name;
		newTulpa.brackets = validateBrackets(brackets);
		newTulpa.host = user.id;


		user.tulpae[name] = newTulpa;
		bot.configuration.markDirty("users");
	};

	function checkBirthday(tulpa) {
		if (!tulpa.birthday) return false;
		let day = new Date(tulpa.birthday);
		let now = new Date();
		return day.getDate() == now.getDate() && day.getMonth() == now.getMonth();
	}

	return {
		getTulpa: getTulpa,
		getUser: getUser,
		register: register,
		parseBrackets: parseBrackets,
		validateBrackets: validateBrackets,
		listForMessage: listForMessage,
		checkBirthday: checkBirthday
	};
}