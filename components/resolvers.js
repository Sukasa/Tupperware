const request = require("got");
const validUrl = require("valid-url");
const probe = require("probe-image-size");

module.exports = function (bot) {
	function resolveCompareText(a, b) {
		return a && b && (a.toLowerCase().indexOf(b.toLowerCase()) > -1 || b.toLowerCase().indexOf(a.toLowerCase()) > -1);
	}

	function resolveKey(haystack, needle) {
		for (var key in haystack)
			if (resolveCompareText(key, needle))
				return key;
		return null;
	};

	function resolveTulpa(msg, name) {
		return bot.tulpae.getTulpa(msg.author || msg, name);
	}

	function resolveUser(msg, text) {
		let target = msg.channel.guild.members[text] ||
			msg.channel.guild.members.find(m => resolveCompareText(m.id, text) || resolveCompareText(m.username, text) || resolveCompareText(m.nick, text) || resolveCompareText(text, `${m.username.toLowerCase()}#${m.discriminator}`));
		if (target && target.user) target = target.user;
		return target;
	};

	function getMatches(string, regex) {
		var matches = [];
		var match;
		while (match = regex.exec(string)) {
			match.splice(1).forEach(m => { if (m) matches.push(m); });
		}
		return matches;
	};

	function resolveChannel(msg, text) {
		let g = msg.channel.guild;
		return g.channels.get(/<#(\d+)>/.test(text) && text.match(/<#(\d+)>/)[1]) || g.channels.get(text) || g.channels.find(m => m.name.toLowerCase() == text.toLowerCase());
	};

	async function resolveImage(msg) {
		let parts = msg.content.split(' ');
		let url = "";
		if (msg.attachments[0]) {
			url = msg.attachments[0].url;
		} else {

			let idx = parts.findIndex(x => x.toLowerCase().indexOf("http") > -1);
			url = parts.slice(idx).join(" ");
		}

		if (!validUrl.isWebUri(url)) 
			throw "That is not a valid URI.";		

		if (url.indexOf("imgur.com/a/") != -1) 
			throw "That is an Imgur album link.  Please use the direct URL of the image in that album that you want used";
			// TODO use the imgur API to convert albumn link to image link?  Or scrape?
		
		let head;
		try {
			head = await request(url, { method: "HEAD" });
		} catch (e) {
			throw "I was unable to access that URL. Please try another.";
		}
		if (Number(head.headers["content-length"]) > 1048575)
			throw "That image is too large and Discord will not accept it. Please use an image under 1 MByte.";
		
		let res;
		try {
			res = await probe(url);
		} catch (e) {
			throw "There was a problem checking that image. Please try another.";
		}

		if (Math.max(res.width, res.height) >= bot.config.maxImageDimension)
			throw "That image is too large and Discord will not accept it. Please use an image where width and height are less than 1024 pixels.";


		return url;
	}

	return {
		resolveKey: resolveKey,
		resolveUser: resolveUser,
		resolveTulpa: resolveTulpa,
		resolveChannel: resolveChannel,
		getMatches: getMatches,
		resolveImage: resolveImage,
		resolveCompareText: resolveCompareText
	};
}