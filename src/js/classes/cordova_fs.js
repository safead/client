'use strict';

var CordovaFS = function(directory){

	this._directory = directory || cordova.file.tempDirectory;
	this._done = null;
	this._writeQueue = [];
	this._writer = null;
	this._stopAfterWrite = false;
	this.busy = false;

};

CordovaFS.prototype.getPath = function(dir, file){

	return new Promise(function(res, rej){

		window.resolveLocalFileSystemURL(dir, function(fs){

			var pos = fs.nativeURL.indexOf('/private/'), splitted = (typeof file === 'string' ? file : file.toURL()).split('/');
			pos < 0 && (pos = fs.nativeURL.indexOf('/var/'));
			if(pos < 0) return rej(l[479]);
			res('file://' + fs.nativeURL.substr(pos) + splitted[splitted.length - 1]);

		}, rej);

	});

};

CordovaFS.prototype.getWriter = function(dir, fn){

	this.busy = true;

	return new Promise(function(res, rej){

		window.resolveLocalFileSystemURL(dir, function(fs){

			fs.getFile(fn, {create: true, exclusive: false}, function(file){

				file.createWriter(function(fileWriter){

					this._writer = fileWriter;
					res(file);

				}.bind(this), rej);

			}.bind(this), rej);

		}.bind(this), rej);

	}.bind(this));

};

CordovaFS.prototype.writeDone = function(force){

	force = force || false;
	force && (this._writeQueue = []);
	if(this._writeQueue.length) return this._stopAfterWrite = true;
	this._writer = null;
	this.busy = false;

};

CordovaFS.prototype.waitWriterDone = function(){

	if(!this.busy) return Promise.resolve(true);

	return new Promise(function(res){

		this._done = res;

	}.bind(this));

};


CordovaFS.prototype.save = function(dir, fn, blob){

	return new Promise(function(res, rej){

		this.getWriter(dir, fn).then(function(result){

			var file = result[0], fileWriter = result[1];

			fileWriter.onwriteend = function(){

				res(file);

			};

			fileWriter.onerror = function(e){

				rej(e);

			};

			fileWriter.write(blob);

		}).catch(function(e){

			DEBUG_ERR('FAILED TO SAVE', e);

		});

	}.bind(this));

};

CordovaFS.prototype.append = function(blob){

	return new Promise(function(res, rej){

		if(!(this._writer instanceof FileWriter)) return rej(new Error(l[362]));

		this._writer.onwriteend = function(){

			if(this._writeQueue.length) return this.append(this._writeQueue.shift());

			if(this._stopAfterWrite){

				this._writer = null;
				this._stopAfterWrite = false;
				this.busy = false;

				if(this._done){

					this._done();
					this._done = null;

				}

			}

		}.bind(this);

		this._writer.onerror = function(e){

			if(this._done){

				this._done();
				this._done = null;

			}

			rej(e);

		};

		if(this._writer.readyState === FileWriter.WRITING){

			this._writeQueue.push(blob);
			return;

		}

		this._writer.seek(this._writer.length);
		this._writer.write(blob);

	}.bind(this));

};

CordovaFS.prototype.read = function(fn, dir){

	return new Promise(function(res){

		window.resolveLocalFileSystemURL((dir || this._directory) + fn, function(entry){

			entry.file(function(file){

				var reader = new FileReader();

				reader.onerror = function(){

				};

				reader.onloadend = function(){

					res(this.result);

				};

				reader.readAsArrayBuffer(file);

			}.bind(this), this._error);

		}.bind(this), this._error);

	}.bind(this));

};

CordovaFS.prototype.clearDirectory = function(dir){

	dir = dir || cordova.file.tempDirectory;

	return new Promise(function(res){

		window.resolveLocalFileSystemURL(dir, function(fs){

			fs.createReader().readEntries(function(entries){

				for(var i in entries) entries[i].remove();
				res();

			}, res);

		}, res);

	});

};

CordovaFS.prototype.listDirectory = function(dir){

	dir = dir || cordova.file.tempDirectory;

	return new Promise(function(res){

		window.resolveLocalFileSystemURL(dir, function(fs){

			DEBUG('--- cordova resolveLocalFileSystemURL done ---');

			fs.createReader().readEntries(function(entries){

				DEBUG('--- createReader, readEntries, cordova list directory ---');

				for(var i in entries){

					DEBUG(entries[i]);

				}

				DEBUG('--- listing done ---');

				res(true);

			}, function(e){

				DEBUG('--- can\'t read entries ---');
				DEBUG(e);

			});

		}, function(){

			DEBUG('--- can\'t resolveLocalFileSystemURL [' + dir + '] ---');
			DEBUG(e);

		});

	});

};

CordovaFS.prototype._error = function(e){

	this._done(new Error(l[479] + ' [' + e + ']'));

};