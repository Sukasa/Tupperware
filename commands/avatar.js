const { article, proper } = require("../components/grammar");

modules.exports = {
	help: cfg => "View or change a " + cfg.lang + "'s avatar",
	usage: cfg => ["avatar <name> [url] - if url is specified, change the " + cfg.lang + "'s avatar, if not, simply echo the current one"],
	permitted: () => true,
	desc: cfg => "The specified URL must be a direct link to an image - that is, the URL should end in .jpg or .png or another common image filetype. Also, it can't be over 1mb in size, as Discord doesn't accept images over this size as webhook avatars.",
	execute: function (msg, args, cfg) {
		let out = "";
		args = getMatches(msg.content, /['](.*?)[']|(\S+)/gi).slice(1);
		if (!args[0]) {
			return bot.cmds.help.execute(msg, ["avatar"], cfg);
		} else if (!tulpae[msg.author.id] || !tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase())) {
			out = "You don't have a " + cfg.lang + " with that name registered.";
		} else if (!args[1]) {
			out = tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).url;
		} else if (!validUrl.isWebUri(args[1])) {
			out = "Malformed url.";
		} else if (args[1].indexOf("imgur.com/a/") != -1) {
			return send(msg.channel, "That is an Imgur album link.  You need to give me the direct URL of the image in that album that you want used");
		} else {

			request(args[1], { method: "HEAD" }, (err, res) => {
				if (err || !res.headers["content-type"] || !res.headers["content-type"].startsWith("image")) return send(msg.channel, "I couldn't find an image at that URL. Make sure it's a direct link (ends in .jpg or .png for example).");
				if (Number(res.headers["content-length"]) > 1000000) {
					return send(msg.channel, "That image is too large and Discord will not accept it. Please use an image under 1mb.");
				}
				tulpae[msg.author.id].find(t => t.name.toLowerCase() == args[0].toLowerCase()).url = args[1];
				save("tulpae", tulpae);
				send(msg.channel, "Avatar changed successfully.");
			});
			return;
		}
		send(msg.channel, out);
	}
}