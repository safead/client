'use strict';

function ReaderStream(file){

	if(!(file instanceof Blob) && !(file instanceof File)) throw new TypeError('file is expected to be a Blob instance');
	var self = this, reader = new FileReader(), pos = 0;
	self.file = file;
	self.state = 0; // 0 READY, 1 READING, 2 DONE
	self.onerror = null;
	self.onprogress = null;
	self.ondata = null;
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	self.abort = function(reason){

		self.state = 2;
		reader.readyState === FileReader.LOADING && reader.abort();
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.read = function(len){

		if(self.state > 1) throw new Error('Bad state');
		self.state = 1;
		len = len || 1 << 20;

		if(reader.readyState !== FileReader.LOADING){

			if(pos < file.size){

				reader.readAsArrayBuffer(file.slice(pos, Math.min(pos += len, file.size)));
				reader.onerror = self.abort;

				reader.onload = function(e){

					_fire('ondata', e.target.result);
					_fire('onprogress', {read: pos - len + e.target.result.byteLength, total: file.size});

					if(pos >= file.size){

						self.state = 2;
						_fire( 'onend' );

					}

				};

			}else{

				self.state = 2;
				_fire( 'onend' );

			}

		}

		return self;

	};

	self.pipeTo = function(that){

		self.onerror = that.abort;
		self.onend = that.end;

		self.ondata = function(){

			if(that.state){

				self.abort(new Error('Pipe broken'));
				return;

			}

			that.write.apply(that, arguments);

		};

		self.onprogress = function(){

			that.state < 2 && that.onprogress && that.onprogress.apply(this, arguments);

		};

		that.ondrain = function(){

			self.state < 2 && self.read.apply(self, arguments);

		};

		return that;

	};

}

function WriterStream(options){

	options = options || {};
	var self = this, blob = new Blob();
	self.blobSize = 0;
	self.state = 0;
	self.onerror = null;
	self.onprogress = null;
	self.ondrain = null;
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	self.abort = function(reason){

		self.state = 2;
		blob = undefined;
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.write = function(data){

		if(self.state > 1) throw new Error('Bad state');

		if(data){

			if(options.saveByChunks){

				blob = new Blob([data]);
				self.blobSize += blob.size;
				_fire('onprogress', {written: self.blobSize, blob: blob});

			}else{

				blob = new Blob([blob, data]);
				_fire('onprogress', {written: blob.size});

			}

		}

		_fire('ondrain');
		return self;

	};

	self.end = function(){

		if(self.state > 1) throw new Error('Bad state');
		self.state = 2;
		_fire('onend', options.saveByChunks ? null : blob);
		blob = null;
		return self;

	};

}

function PakoStream(mode, options){

	options = options || {};
	var self = this, worker = null, reading = false, queued = [], compressed = 0;
	self.state = 0;
	self.onerror = null;
	self.onprogress = null;
	self.ondata = null;
	self.ondrain = null;
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	function _init(){

		worker = new Worker(options.workerUrl || '/js/workers/pako-worker.js');
		worker.onerror = function(e){ _fire('onerror', e); };
		worker.postMessage(['init', mode, options]);

		worker.onmessage = function(e){

			switch(e.data[0]){

			case 'data':

				reading = false;
				_fire('ondata', e.data[1]);
				break;

			case 'eof':

				self.state = 2;
				_terminate();
				_fire('onend');
				break;

			case 'status':

				if(!e.data[1]){

					compressed += queued.shift() || 0;
					_fire('onprogress', {compressed: compressed});
					!self.state && !queued.length && reading && _fire('ondrain');

				}else{

					self.abort(e.data[2]);

				}

			}

		};

	}

	function _terminate(){

		if(!worker) return;
		worker.terminate();
		worker = null;

	}

	self.abort = function(reason){

		self.state = 2;
		_terminate();
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.read = function(len){

		if(self.state > 1) throw new Error('Bad state');

		if(!self.state){

			reading = true;
			queued.length || _fire('ondrain', len);

		}

		return self;

	};

	self.write = function(data){

		if(self.state) throw new Error('Bad state');
		queued.push(data.byteLength);
		worker || _init();
		worker.postMessage(['data', data]);
		return self;

	};

	self.end = function(){

		self.state = 1;
		worker || _init();
		worker.postMessage(['eof']);
		return self;

	};

	self.pipeTo = function(that){

		self.onerror = that.abort;
		self.onend = that.end;

		self.ondata = function(){

			if(that.state){

				self.abort(new Error('Pipe broken'));
				return;

			}

			that.write.apply(that, arguments);

		};

		self.onprogress = function(){

			that.state < 2 && that.onprogress && that.onprogress.apply(this, arguments);

		};

		that.ondrain = function(){

			self.state < 2 && self.read.apply(self, arguments);

		};

		return that;

	};

}

function CipheringStream(mode, key, options){

	options = options || {};
	var self = this,
		iv = new Uint8Array(options.iv || crypto.getRandomValues(new Uint8Array(16))),
		qdata = new Uint8Array(0),
		reading = false,
		op = null;
	self.mode = mode || CipheringStream.ENCRYPT,
	self.state = 0,
	self.key = key,
	self.onerror = null,
	self.onprogress = null,
	self.ondata = null,
	self.ondrain = null,
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	function _encryptNext(){

		if(op) return;

		if(!self.state){

			var qlen = qdata.byteLength, clen = Math.floor((qlen - 1) / 16) * 16;

			if(!clen){

				reading && _fire('ondrain');
				return;

			}

			var chunk = qdata.subarray(0, clen);
			qdata = qdata.slice(clen, qlen);

			op = crypto.subtle.encrypt({name: 'AES-CBC', iv: iv}, key, chunk).then(function(echunk){

				reading = false;
				iv = echunk.slice(-32, -16);
				_fire('ondata', new Uint8Array(echunk, 0, clen));

			}).catch(function(err){

				self.abort(err);

			}).then(function(){

				op = null;
				_encryptNext();

			});

		}else if(self.state < 2){

			op = crypto.subtle.encrypt({name: 'AES-CBC', iv: iv}, key, qdata).then(function(echunk){

				reading = false;
				_fire('ondata', new Uint8Array(echunk));

			}).catch(function(err){

				self.abort(err);

			}).then(function(){

				self.state = 2;
				op = null;
				_fire('onend');

			});

		}

	}

	function _decryptNext(){

		if(op) return;

		if(!self.state){

			var qlen = qdata.byteLength, clen = Math.floor((qlen - 1) / 16) * 16;

			if(!clen){

				reading && _fire('ondrain');
				return;

			}

			var chunk = new Uint8Array(clen + 16);
			chunk.set(qdata.subarray(0, clen), 0);
			qdata = qdata.slice(clen, qlen);
			var quirk = new Uint8Array(16);
			for(var i = quirk.length; i--;) quirk[i] = 16;

			op = crypto.subtle.encrypt({name: 'AES-CBC', iv: chunk.subarray(-32, -16)}, key, quirk).then(function(padding){

				chunk.set(new Uint8Array(padding, 0, 16), clen);
				return crypto.subtle.decrypt({name: 'AES-CBC', iv: iv}, key, chunk);

			}).then(function(dchunk){

				reading = false;
				iv = chunk.slice(-32, -16);
				_fire('ondata', new Uint8Array(dchunk));

			}).catch(function(err){

				self.abort(err);

			}).then(function(){

				op = null;
				_decryptNext();

			});

		}else if(self.state < 2){

			op = crypto.subtle.decrypt({name: 'AES-CBC', iv: iv}, key, qdata).then(function(echunk){

				reading = false;
				_fire('ondata', new Uint8Array(echunk));

			}).catch(function(err){

				self.abort(err);

			}).then(function(){

				self.state = 2;
				op = null;
				_fire('onend');

			});

		}

	}

	var _modes = [

		_encryptNext,
		_decryptNext

	];

	self.abort = function(reason){

		self.state = 2;
		op = null;
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.read = function(len){

		if(self.state > 1) throw new Error('Bad state');

		if(!self.state){

			reading = true;
			op || _fire('ondrain', len);

		}

		return self;

	};

	self.write = function(data){

		if(self.state) throw new Error('Bad state');

		if(data && data.byteLength > 0){

			if(data instanceof ArrayBuffer) data = new Uint8Array(data);
			var qlen = qdata.byteLength, dlen = qlen + data.byteLength;
			var buf = new Uint8Array(dlen);
			buf.set(qdata, 0);
			buf.set(data, qlen);
			qdata = buf;
			op || _fire(_modes[mode]);

		}

		return self;

	};

	self.end = function(){

		if(self.state) throw new Error('Bad state');
		self.state = 1;
		_fire(_modes[mode]);
		return self;

	};

	self.pipeTo = function(that){

		self.onerror = that.abort;
		self.onend = that.end;

		self.ondata = function(){

			if(that.state){

				self.abort(new Error('Pipe broken'));
				return;

			}

			that.write.apply(that, arguments);

		};

		self.onprogress = function(){

			that.state < 2 && that.onprogress && that.onprogress.apply(this, arguments);

		};

		that.ondrain = function(){

			self.state < 2 && self.read.apply(self, arguments);

		};

		return that;

	};

}

CipheringStream.ENCRYPT = 0,
CipheringStream.DECRYPT = 1;

function UploadStream(fid, options){

	options = options || {};
	var self = this,
		cs = options.uploadChunk || 0,
		total = options.uploadSize || -1,
		url = (options.uploadUrl || config.files_url) + '/' + fid,
		queue = [],
		sent = 0,
		xhr = null;
	self.state = 0;
	self.onerror = null;
	self.onprogress = null;
	self.ondrain = null;
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	function _progress(e){

		try{

			self.onprogress && self.onprogress({loaded: sent - e.total + e.loaded});

		}catch(e){

			DEBUG_ERR(e);

		}

	}

	function _init(){

		xhr = new XMLHttpRequest();
		xhr.onerror = self.abort;
		xhr.onloadend = _next;
		xhr.upload.onprogress = _progress;

	}

	function _next(){

		if(!xhr || xhr.readyState & XMLHttpRequest.LOADING) return;

		if(xhr.readyState === XMLHttpRequest.DONE && xhr.status !== 201){

			self.abort(new Error('Wrong response: ' + xhr.status + ' ' + xhr.statusText));
			return;

		}

		var haveChunk = (self.state === 0 && queue.length && (!cs || queue[0].byteLength === cs)) || (self.state === 1 && queue.length);

		if(self.state === 0 && !haveChunk){

			_fire('ondrain');
			return;

		}

		if(self.state < 2 && haveChunk){

			var chunk = queue.shift();
			xhr.open('POST', url, true);
			xhr.setRequestHeader('Content-Type', 'application/octet-stream');
			xhr.setRequestHeader('Content-Range', 'bytes ' + sent + '-' + (sent + chunk.byteLength - 1) + '/' + (total < 0 ? '*' : total));
			xhr.send(chunk);
			sent += chunk.byteLength;
			return;

		}

		if(self.state === 1 && !queue.length){

			if(total < 0){

				total = sent;
				xhr.open('POST', url, true);
				xhr.setRequestHeader('Content-Range', 'bytes ' + (total - 1) + '-' + (total - 1) + '/' + total);
				xhr.send();
				xhr.onloadend = _last;

			}else _last();

		}

	}

	function _last(){

		_terminate();
		_fire('onend', total);

	}
	
	function _terminate(){

		self.state = 2;

		if(xhr && xhr.readyState & XMLHttpRequest.LOADING){
			
			xhr.onreadystatechange = xhr.onloadend = xhr.onprogress = null;
			xhr.abort();

		}

		xhr = null;

	}
	
	self.abort = function(reason){

		if(self.state < 2) _terminate();
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.write = function(data){

		if(self.state) throw new Error('Bad state');

		if(data && cs){

			data = new Uint8Array(data);
			var chunk = queue.pop() || new Uint8Array(new ArrayBuffer(cs), 0, 0),
				clen = chunk.byteLength,
				dlen = Math.min(cs - clen, data.byteLength);
			chunk = new Uint8Array(chunk.buffer, 0, clen + dlen);
			chunk.set(data.subarray(0, dlen), clen);
			queue.push(chunk);
			while(data.byteLength - dlen >= cs) queue.push(data.subarray(dlen, dlen += cs));

			if(dlen < data.byteLength){

				chunk = new Uint8Array(new ArrayBuffer(cs), 0, data.byteLength - dlen);
				chunk.set(data.subarray(dlen, data.byteLength), 0);
				queue.push(chunk);

			}

		}else if(data) queue.push(data);

		xhr || _init();
		_fire(_next);
		return self;

	};

	self.end = function(){

		if(self.state) throw new Error('Bad state');
		self.state = 1;

		if(total < 0 && queue.length){

			total = sent;
			for(var i = 0; i < queue.length; i++) total += queue[i].byteLength;

		}

		xhr || _init();
		_fire(_next);
		return self;

	};

}

function DownloadStream(fid, options){

	options = options || {};
	var self = this,
		url = (options.downloadUrl || config.files_url) + '/' + fid,
		recvd = 0,
		total = options.downloadSize || -1,
		xhr = null;
	self.state = 0;
	self.onerror = null;
	self.onprogress = null;
	self.ondata = null;
	self.onend = null;

	function _fire(fn, arg){

		setTimeout(function(){

			try{

				if(typeof fn === 'string') fn = self[fn];
				fn && fn.call(self, arg);

			}catch(e){

				DEBUG_ERR(e);

			}

		}, 0);

	}

	function _progress(e){

		try{

			self.onprogress && self.onprogress({ loaded: recvd + e.loaded, total: total });

		}catch(e){

			DEBUG_ERR(e);

		}

	}

	function _init(){

		xhr = new XMLHttpRequest();
		xhr.onerror = self.abort;
		xhr.onreadystatechange = _first;
		xhr.onloadend = _next;
		xhr.onprogress = _progress;

	}

	function _first(){

		if(xhr.readyState < XMLHttpRequest.HEADERS_RECEIVED) return;

		if(xhr.status !== 200 && xhr.status !== 206){

			self.abort(new Error(xhr.statusText));
			return;

		}

		var range = (xhr.getResponseHeader('Content-Range') || '').match(/bytes (\d+)-(\d+)\/(\d+|\*)/);

		if(!range){

			self.abort(new Error('Content-Range response header expected'));
			return;

		}

		if(range[3] === '*'){

			if(total < 0){

				self.abort(new Error('downloadSize is expected within the Content-Range response header'));
				return;
			}

		}else{

			var t = parseInt(range[3]);
			if(total < 0){

				total = t;

			}else if(total !== t){

				self.abort(new Error('downloadSize differs from that one in Content-Range response header'));
				return;

			}

		}

		xhr.onreadystatechange = null;

	}

	function _next(){

		if(!xhr || xhr.readyState & XMLHttpRequest.LOADING) return;

		if(xhr.readyState === XMLHttpRequest.DONE){

			if(xhr.status !== 200 && xhr.status !== 206){

				self.abort(new Error(xhr.statusText));
				return;

			}

			recvd += xhr.response.byteLength;
			_fire('ondata', xhr.response);

		}

		if(!xhr.readyState || recvd < total){

			xhr.open('GET', url, true);
			xhr.setRequestHeader('Range', 'bytes ' + recvd + '-');
			xhr.responseType = 'arraybuffer';
			xhr.send();

		}else _last();

	}

	function _last(){

		_terminate();
		_fire('onend');

	}

	function _terminate(){

		if(xhr.readyState & XMLHttpRequest.LOADING){

			xhr.onreadystatechange = xhr.onloadend = xhr.onprogress = null;
			xhr.abort();

		}

		self.state = 2;
		xhr = null;

	}

	self.abort = function(reason){

		if(self.state < 2) _terminate();
		_fire('onerror', reason instanceof Error ? reason : new Error(reason || 'Aborted'));
		return self;

	};

	self.read = function(){

		if(self.state) throw new Error('Bad state');
		xhr || _init();
		_fire(_next);
		return self;

	};

	self.pipeTo = function(that){

		self.onerror = that.abort;
		self.onend = that.end;

		self.ondata = function(){

			if(that.state){

				self.abort(new Error('Pipe broken'));
				return;

			}

			that.write.apply(that, arguments);

		};

		self.onprogress = function(){

			that.state < 2 && that.onprogress && that.onprogress.apply(this, arguments);

		};

		that.ondrain = function(){

			self.state < 2 && self.read.apply(self, arguments);

		};

		return that;

	};

}