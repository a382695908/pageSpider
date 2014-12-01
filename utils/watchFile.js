var path = require('path');
var fs = require('fs');

/**
 * 检测文件内容变化
 * @returns {Function}
 */
function watchFiles(dir, ext, outterRequire){
	function listenToChange(file) {
	    file = path.resolve(file);
	    function onChg(prev, now) {
	        if (prev.mtime == now.mtime) return;
	        delete outterRequire.cache[file];
	    }

	    fs.watchFile(file, { persistent: true, interval: 5007 }, onChg);
	}

	function mapDir(dir, ext) {
		var dir = path.resolve(dir);
	    fs.readdir(dir, function (err, files) {
	        if (err) return;
	        if (ext && !files.indexOf(ext)) return;
	        files.forEach(function (file) {
	            file = dir + '/' + file;
	            fs.lstat(file, function (err, stats) {
	                if (err) return;
	                if (stats.isDirectory()) {
	                    mapDir(file, ext);
	                } else if (stats.isFile()) {
	                    listenToChange(file);
	                }
	            });
	        });
	    });
	}
	mapDir(dir, ext);
}

exports.watchFiles = watchFiles;