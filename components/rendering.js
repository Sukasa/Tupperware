module.exports = function (bot) {

	function generateTulpaField(tulpa) {
		var data = [""];

		tulpa.bio.forEach(field => {
			if (tulpa.bio[field])
				data.push([bot.language.parseCamelCase(field), tulpa.bio[field]]);
		});

		data.push(["Brackets", [tulpa.brackets[0] + "text" + tulpa.brackets[1]].concat(tulpa.alternates || []).reduce((a, c) => a + ", " + (c[0] + "text" + c[1]))]);
		data.push(["Avatar URL", tulpa.url]);

		if (tulpa.forms)
			data.push(["Forms", Object.keys(tulpa.forms).reduce((a, c) => a + ", " + (tulpa.url == tulpa.forms[c] ? `**${c}**` : `${c}`))]);

		data.push(["Messages Sent", tulpa.posts]);

		return {
			name: tulpa.fullName || tulpa.name,
			value: ([""].concat(data).reduce((a, c) => a + `${c[0]}: ${c[1]}\n`) + tulpa.desc)
		};
	};

	return {
		generateTulpaField: generateTulpaField
	};

}