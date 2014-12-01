var async = require("async"),
	request = require("request"),
	cheerio = require('cheerio'),
	path = require('path'),
	fs = require('fs'),
	watcher = require('../utils/watchFile'),
	oldArticles; 

var cacheFileName = "fex.json",
	basicPath = './db/old/';


//添加对缓存文件的监控
var cacheDB = path.resolve(basicPath + cacheFileName);
watcher.watchFiles(cacheDB, null, require);

function spiderArticles(){
	async.waterfall([
		function(callback) {
			init(callback);
		},
		function(callback){
			getArticleList(callback);
		},
		function(newArticles, callback) {
			getArticleDetail(newArticles, callback);
		},
		function(callback) {
			writeOldArticles2Cache(callback);
		}
	], function(err, results) {
		if (!err) {
			process.exit(0);
		} 
	});
}

function init(callback){
	try {
		oldArticles = require(basicPath + cacheFileName);
	} catch(e) {
		oldArticles = [];
	}
	callback()
}

function getArticleDetail(newArticles, callback) {
	if (!newArticles.length) {
		callback();
		return;
	}
	var tasks = {};
	newArticles.forEach(function(article, index){

		//截取1110.md为1110
		var title = article.slice(-7, -3);
		tasks[title] = (function(md){
			return function(cb){
					request(md, function (error, response, body) {
						if (!error) {
							var oneArticle = {
								title: '百度FEX-:' + title,
								content: body
							}
							cb(null, oneArticle);
						}
					});
			};
		})(article);
	})

	async.parallel(tasks, function(err, articles) {
		process.send({data: articles});
		callback();
	})
}

/**
 * [getArticleList 从github上FEX的weekly页面获取每周的文章]
 * @return {[type]} [description]
 */
function getArticleList(callback){
	var articleListUrl = 'https://github.com/zenany/weekly/tree/master/software/2014',
		basicUrl = 'https://raw.githubusercontent.com',
		articleList = [];

	request(articleListUrl, function (error, response, body) {
		var $ = cheerio.load(body),
	      	fileList = $('table.files .content a'),
	      	articleNum = fileList.length, i,
	      	articleLink = '',
	      	newArticles ;

	  	if (!error && response.statusCode == 200) {
	  		for(i = 0; i < articleNum; i++) {
	  			articleLink = basicUrl + $(fileList[i]).attr('href').replace(/\/blob/, '');
	  			articleList.push(articleLink); 
	  		}
	  		newArticles = articleList.filter(function(article, index){
	  			var isOldFile = oldArticles.indexOf(article) === -1;
	  			if (isOldFile) {
	  				oldArticles.push(article);
	  			}
	  			return isOldFile;
	  		})

	  		//async的callback要传参数, 必须第一个参数是err.
	  		callback(null, newArticles);
	  	}
	});
}

function writeOldArticles2Cache(callback) {
	var filePath = path.resolve(basicPath + cacheFileName);

	if (!fs.existsSync(filePath)) {
		fs.openSync(filePath, 'w+');
	}
    oldArticles = JSON.stringify(oldArticles, null, 4);
	fs.writeFileSync(filePath, oldArticles);
	callback(null, 'all done....')
}

spiderArticles();