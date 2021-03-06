/*

 Generates Data for a count-statistic words/links/hashtags...

 Format:
 {
	 {
		 "id": "#aufschrei",
		 "count": 48232,
		 "counts": {
			 "unknown": 38193,
			 "outcry": 1294,
			 "comment": 2283,
			 "troll": 5513,
			 "report": 413,
			 "spam": 536
		 }
	 },
 ...
 ]

 */
var tokenizer = require('./tweet_tokenizer').MyLittleTweetTokenizer();

exports.MyLittleWordStat = function () {
	var me = this;

	function sortdDataByCat(data, cat) {
		data.sort(
			function (a, b) {
				if ((a.counts[cat] || 0) > (b.counts[cat] || 0)) {
					return -1;
				}
				if ((a.counts[cat] || 0) < (b.counts[cat] || 0)) {
					return 1;
				}
				return 0;
			});
		return data;
	}

	function generateBarData(params, callback) {
		var wordstat = {};
		params.store.enumerateTweetsAndCats(params.voteuserid, function (tweet) {
			if (tweet) {
				var arr = [];
				switch (params.kind) {
					case 'hash':
						arr = tokenizer.extractHashTags(tweet.text);
						break;
					case 'user':
						arr = [tweet.user];
						break;
					case 'client':
						arr = [tokenizer.extractClient(tweet.source)];
						break;
					case 'link':
						arr = tokenizer.extractLinks(tweet.text);
						var longurls = tokenizer.validateLongUrls(tweet.longurls);
						var i;
						if (longurls) {
							for (i = 0; i < arr.length; i++) {
								if (longurls[arr[i]])
									arr[i] = longurls[arr[i]];
							}
						}
						for (i = 0; i < arr.length; i++) {
							if (arr[i][arr[i].length - 1] === '/') {
								arr[i] = arr[i].substring(0, arr[i].length - 1);
							}
						}
						break;
					default: //case 'words':
						arr = tokenizer.tokenize(tweet.text);
						break;
				}
				var tweetcat = tweet[params.mode];
				arr.forEach(function (s) {
					if (s.length > 1) {
						var stat = wordstat[s];
						if (!stat)
							stat = {};
						stat[tweetcat] = (stat[tweetcat] || 0) + 1;
						wordstat[s] = stat;
					}
				});
			} else {
				var data = [];
				for (var key in wordstat) {
					var stat = wordstat[key];
					var total = 0;
					for (var cat in stat) {
						total += stat[cat];
					}
					data.push({id: key, count: total, counts: stat});
				}
				data.sort(
					function (a, b) {
						if (a.count > b.count) {
							return -1;
						}
						if (a.count < b.count) {
							return 1;
						}
						return 0;
					});
				callback(data);
			}
		});
	}

	function filter(data, cat) {
		data = sortdDataByCat(data, cat);
		var result = {};
		data.forEach(function (entry) {
			var count = entry.counts[cat] || 0;
			if (count > 0) {
				result[entry.id] = count;
			}
		});
		return result;
	}

	me.prepareData = function (params, data, callback) {
		if (params.cat) {
			callback(filter(data, params.cat));
		} else {
			callback(data);
		}
	};

	me.getData = function (params, callback) {
		generateBarData(params, function (data) {
			me.prepareData(params, data, callback);
		});
	};

	return me;
};
