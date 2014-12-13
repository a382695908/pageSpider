var async = require("async"),
	path = require('path'),
	fs = require('fs'),
	schedule = require('node-schedule'),
	child_process = require('child_process');

function PageSpider(){

}

/**
 * [workflow PageSpider的工作流： 
 * 	1. 先进行初始化,获取每个任务执行条件； 
 * 	2. 创建子进程执行爬取任务，收集子进程的数据并且写如文件]
 *
 * 
 * @return {[type]} [description]
 */
PageSpider.prototype.workflow = function(){
	var me = this;
	async.waterfall([
			function(callback) {
				me.init(callback);
			},
			function(callback) {
				me.forkSpider(callback)
			}
		], function(err, results) {
			console.log('pageSider start....');
		})
}


/**
 * [init 获取任务列表，及其执行的日期]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
PageSpider.prototype.init = function(callback){
	var me = this,
		scheduleTable = require('./conf/schedule.json');
	me.scheduleTable = scheduleTable;
	callback();
}


/**
 * [forkSpider 遍历任务列表并且注册任务及监听子进程消息]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
PageSpider.prototype.forkSpider = function(callback){
	var me = this,
		scheduleTable = me.scheduleTable,
		jobs = [];

	me.articles = [];
	for (var key in scheduleTable) {
		if (scheduleTable.hasOwnProperty(key)) {
			var scheduleItem = scheduleTable[key];
			jobs.push(
				schedule.scheduleJob(scheduleItem['time'], function(){
				    var n = child_process.fork('./pages/' + key + '.js');
				    n.on('message', function(data) {
				      	me.articles.push(data.data);
				      	me.save(data.data, scheduleItem['dest']);
				    });
				})
			);
		}
	}
	me.jobs = jobs;
  	callback();
}


/**
 * [save 把接收到的消息保存写入文件]
 * @param  {[type]} data      [description]
 * @param  {[type]} basicPath [description]
 * @return {[type]}           [description]
 */
PageSpider.prototype.save = function(data, basicPath){
	for (var key in data) {
		if (data.hasOwnProperty(key)) {
			var title = data[key].title;
			var content = data[key].content;
			var filename = path.resolve(basicPath + title + '.md');
			


			(function(filepath, con){
				fs.open(filepath, "a", 0644, function(e, fd){
				    if(e) throw e;
					fs.write(fd, con, 0, 'utf8',function(e){
				        if(e) throw e;
				        fs.closeSync(fd);
					})
				});
			})(filename, content)
		}
	}
}

var happySpider = new PageSpider();
happySpider.workflow();