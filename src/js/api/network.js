'use strict';

var Network = function(){

	this._queue = [];
	this._maxSimRequests = 4;
	this._maxTries = 4; //default 4
	this._timeouts = [0, 0, 0, 0];

};

Network.prototype.request = function(url, post, params){

	params = params || {};
	params.maxTries = params.maxTries || 4;

	if(post){

		var promise = this._cancelDuplicate(post);
		if(promise) return promise;

	}

	return new Promise(function(res, rej){

		var xhr = this._getXHR();
		xhr.tries = params.maxTries;
		xhr.delay = 0;
		xhr.e = 0;
		xhr.url = url;
		post && (xhr.post = post);
		post = null;
		xhr.queueItem = {success: res, failed: rej, xhr: xhr};
		params.startPaused && (xhr.paused = true);
		params.wiredToPage && (xhr.wiredToPage = true);
		this._queue.push(xhr.queueItem);

		xhr.onerror = function(){

			this._error(xhr);

		}.bind(this);

		xhr.ontimeout = function(){

			this._error(xhr);

		}.bind(this);

		xhr.onabort = function(){

			return this._finished(xhr.queueItem, {success: false});

		}.bind(this);

		xhr.onload = function(e){

			var result = xhr.response || xhr.responseText || '';
			if([0, 200, 201, 304].indexOf(e.target.status) < 0) return this._error(xhr) ? false : this._finished(xhr.queueItem, {error: true}); //wrong response code
			this._finished(xhr.queueItem, {success: result});

		}.bind(this);

		xhr.onreadystatechange = function(){

			if(xhr.readyState === XMLHttpRequest.DONE) return;
			var timeout = this._timeouts[xhr.readyState] * I.connectionStates.coeff;

			try{

				timeout && (this.timeout = (new Date()).valueOf() - this.lastStateChange + timeout);
				this.lastStateChange = (new Date()).valueOf();

			}catch(e){
				//ignore
			}

		}.bind(this);

		this.startQueue();

	}.bind(this));

};

Network.prototype.startQueue = function(resume){

	resume = resume || false;
	if(!this._queue.length) return false;

	for(var i = 0, active = 0; i < this._queue.length; i++){

		if(this._queue[i].xhr.busy){

			active++;
			continue;

		}

		app && app.paused ? this._queue[i].xhr.paused = true : (resume && this._queue[i].xhr.paused && delete(this._queue[i].xhr.paused));
		if(this._queue[i].xhr.paused) continue;

		if(active >= this._maxSimRequests){

			app && window.plugins.toast.showShortTop(l[566]);
			break;

		}

		this._queue[i].xhr.busy = true;
		this._queue[i].xhr.timer = setTimeout(this._send.bind(this), this._queue[i].xhr.delay, this._queue[i].xhr);
		this._queue[i].xhr.delay || (this._queue[i].xhr.delay = 500);

	}

	app && app.paused && !this.haveActiveConnections() && cordova.plugins.backgroundMode.disable();
	return true;

};

Network.prototype.stopWiredToPage = function(){

	for(var i in this._queue){

		if(!this._queue[i].xhr.wiredToPage) continue;
		var requestObject = this._queue[i];
		this._queue.splice(i, 1);
		requestObject.xhr.abort();
		requestObject.xhr = null;
		requestObject.success(false);

	}

};

Network.prototype.stopWiredToSession = function(){

	for(var i in this._queue){

		if(!this._queue[i].xhr.wiredToSession) continue;
		var requestObject = this._queue[i];
		this._queue.splice(i, 1);
		requestObject.xhr.abort();
		requestObject.xhr = null;
		requestObject.success(false);

	}

};

Network.prototype.haveActiveConnections = function(){

	for(var i in this._queue) if(this._queue[i].xhr.busy) return true;
	return false;

};

Network.prototype._finished = function(poolObj, result){

	for(var i in this._queue){

		if(this._queue[i] !== poolObj) continue;
		var requestObject = this._queue[i];
		this._queue.splice(i, 1);
		requestObject.xhr = null;

		if(result.error){

			requestObject.success(null);

		}else{

			this.startQueue(true);
			requestObject.success(result.success);

		}

		break;

	}

	app && app.paused && !this.haveActiveConnections() && cordova.plugins.backgroundMode.disable();

};

Network.prototype._cancelDuplicate = function(post){

	for(var i = 0; i < this._queue.length; i++){

		if(this._queue[i].xhr.post !== post) continue;
		this._queue[i].success(false);

		return new Promise(function(res, rej){

			this._queue[i].success = res;
			this._queue[i].failed = rej;

		}.bind(this));

	}

	return false;

};

Network.prototype._send = function(xhr){

	xhr.lastStateChange = (new Date()).valueOf();
	xhr.open(xhr.post ? 'POST' : 'GET', xhr.url, true);
	xhr.timeout = this._timeouts[0] * I.connectionStates.coeff;
	xhr.send(xhr.post);

};

Network.prototype._error = function(xhr){

	app && window.plugins.toast.showShortTop(l[349].ucFirst());
	if(++xhr.e >= xhr.tries) return this._finished(xhr.queueItem, {error: true});
	xhr.delay && (xhr.delay *= 2);
	xhr.busy = false;
	this.startQueue();
	return true;

};

Network.prototype._getXHR = function(){

	return (typeof XDomainRequest !== 'undefined' && typeof ArrayBuffer === 'undefined') ? new XDomainRequest() : new XMLHttpRequest();

};