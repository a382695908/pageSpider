var async = require("async"),
	request = require("request"),
	cheerio = require('cheerio'),
	path = require('path'),
	fs = require('fs'),
	watcher = require('../utils/watchFile'),
	oldArticles; 

var cacheFileName = "fex.json",
	basicPath = './db/old/',
	preContent = '';

//添加对缓存文件的监控
var cacheDB = path.resolve(basicPath + cacheFileName);
watcher.watchFiles(cacheDB, null, require);


/**
 * [spiderArticles 创建任务执行的流程]
 * @return {[type]} [description]
 */
function spiderArticles(){
	async.waterfall([
		function(callback) {
			init(callback);
		},
		function(callback){
			//获取文章列表
			getArticleList(callback);
		},
		function(newArticles, callback) {
			// 获取每篇文章的内容
			getArticleDetail(newArticles, callback);
		},
		function(callback) {
			// 把爬取过的文章存在缓存中，用于下次爬取时过滤已经爬取过文章。
			writeOldArticles2Cache(callback);
		}
	], function(err, results) {
		if (!err) {
			console.log(new Date() + ': ' + results);

			// 任务执行完成自动退出，等待下次被执行。
			process.exit(0);
		} 
	});
}

/**
 * [init 获取缓存中已经爬取过的文章]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function init(callback){
	try {
		oldArticles = require(basicPath + cacheFileName);
	} catch(e) {
		oldArticles = [];
	}
	callback()
}


/**
 * [getArticleList 从github上FEX的weekly页面获取每周的文章， 并且把最新的文章返回给下一个流程]
 * @return {[type]} [description]
 */
function getArticleList(callback){
	var articleListUrl = 'https://github.com/zenany/weekly/tree/master/software/2014',
		basicUrl = 'https://raw.githubusercontent.com',
		articleList = [];

	// 发送请求获取文章列表
	request(articleListUrl, function (error, response, body) {
		var $ = cheerio.load(body),
	      	fileList = $('table.files .content a'),
	      	articleNum = fileList.length, i,
	      	articleLink = '',
	      	newArticles ;

	  	if (!error && response.statusCode == 200) {

	  		// 获取所有文章的url列表
	  		for(i = 0; i < articleNum; i++) {
	  			articleLink = basicUrl + $(fileList[i]).attr('href').replace(/\/blob/, '');
	  			articleList.push(articleLink); 
	  		}

	  		// 过滤掉旧的文章，即已经爬取过的文章
	  		newArticles = articleList.filter(function(article, index){
	  			var isNewFile = oldArticles.indexOf(article) === -1;
	  			if (isNewFile) {
	  				oldArticles.push(article);
	  			}
	  			return isNewFile;
	  		})

	  		//async的callback要传参数, 必须第一个参数是err.
	  		callback(null, newArticles);
	  	}
	});
}


/**
 * [getArticleDetail 获取文章详情]
 * @param  {[type]}   newArticles [description]
 * @param  {Function} callback    [description]
 * @return {[type]}               [description]
 */
function getArticleDetail(newArticles, callback) {
	if (!newArticles.length) {
		callback();
		return;
	}
	var tasks = {};

	// 根据最新文章的url构造爬取任务。
	newArticles.forEach(function(article, index){

		//截取1110.md为1110
		var title = article.slice(-7, -3);
		var now = new Date();
		tasks[title] = (function(md){

			//返回任务执行函数
			return function(cb){
					request(md, function (error, response, body) {
						var getArticleTime = now.getFullYear() + '-' + 
										now.getMonth() + '-' + now.getDate() + ' 00:00:00';
						if (!error) {
							var oneArticle = {
								title: '百度FEX-' + title,
								content: 
									'--- \r\n'  +
									'title: 百度FEX-' + title + '\r\n' +
									'date: ' + getArticleTime + '\r\n' +
									'categories: FEX-Weekly' + '\r\n' +
									'tags: [FEX]' + '\r\n' +
									'---\r\n \r\n' + body
							}
							cb(null, oneArticle);
						}
					});
			};
		})(article);
	})

	//并发的发送请求获取每篇文章的内容
	async.parallel(tasks, function(err, articles) {

		//获取到所以的文章后通过进程通信的方式发送给主进程，即pageSpider
		process.send({data: articles});
		callback();
	})
}


// 
function writeOldArticles2Cache(callback) {
	var filePath = path.resolve(basicPath + cacheFileName);

	if (!fs.existsSync(filePath)) {
		fs.openSync(filePath, 'w+');
	}

	// 格式化字符串
    oldArticles = JSON.stringify(oldArticles, null, 4);

    // 把最获取后的文章写回缓存
	fs.writeFileSync(filePath, oldArticles);
	callback(null, 'FEX-Weekly task done...')
}
spiderArticles();