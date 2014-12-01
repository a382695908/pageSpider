var async = require("async");
var path = require('path');
var fs = require('fs');
var schedule = require('node-schedule');
var child_process = require('child_process');

function PageSpider(){

}
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
			console.log('all done....');
		})
}

PageSpider.prototype.init = function(callback){
	var me = this,
		scheduleTable = require('./conf/schedule.json');
	me.scheduleTable = scheduleTable;
	callback();
}

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

PageSpider.prototype.save = function(data, basicPath){
	for (var key in data) {
		if (data.hasOwnProperty(key)) {
			var title = data[key].title;
			var content = data[key].content;
			var filename = path.resolve(basicPath + title + '.md');
			
			(function(filepath, con){
				fs.writeFile(filepath, con, {encoding: 'utf-8'}, function(err){
					if (err) {
						console.log(err);
					}
				})
			})(filename, content)
		}
	}
 }

var happySpider = new PageSpider();
happySpider.workflow();