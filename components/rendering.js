module.exports = function (bot) {

	function generateTulpaField(tulpa) {
		var data = [""];

		if (tulpa.tag)
			data.push(["Tag", tulpa.tag]);

		Object.keys(tulpa.bio).forEach(key => {
			if (key && tulpa.bio[key])
				data.push([bot.language.parseCamelCase(key), tulpa.bio[key]]);
		});

		data.push(["Brackets", tulpa.brackets.map(c => `${c[0]}text${c[1]}`).join(", ")]);
		data.push(["Avatar URL", tulpa.url]);

		if (tulpa.birthday) {
			data.push(["Birthday", new Date(tulpa.birthday).toDateString()]);
		}

		if (tulpa.forms && (Object.keys(tulpa.forms).length > 1))
			data.push(["Forms", Object.keys(tulpa.forms).map(form => tulpa.url == tulpa.forms[form] ? `**${form}**` : form).join(", ")]);

		data.push(["Messages Sent", tulpa.posts]);

		return {
			name: tulpa.name,
			value: (data.reduce((a, c) => a + `${c[0]}: ${c[1]}\n`) + (tulpa.desc ? tulpa.desc : ""))
		};
	};

	return {
		generateTulpaField: generateTulpaField
	};

}