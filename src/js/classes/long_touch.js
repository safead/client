'use strict';

var LongTouch = function(element, funcAction){

	if(!(element instanceof HTMLElement) || !(funcAction instanceof Function)) throw new Error(l[362]);
	this._funcAction = funcAction;
	this._timeOut = 0;
	this._delay = 500;
	element.addEventListener('touchstart', this._touchstart.bind(this), true);
	element.addEventListener('touchend', this._failed.bind(this), true);
	element.addEventListener('touchmove', this._failed.bind(this), true);

};

LongTouch.prototype._touchstart = function(){

	this._activated = false;
	this._timeStart = new Date();
	this._waitMore();

};

LongTouch.prototype._failed = function(e){

	clearTimeout(this._timeOut);

	if(this._activated){

		e.stopPropagation();
		e.preventDefault();

	}

};

LongTouch.prototype._waitMore = function(){

	this._timeOut = setTimeout(function(){

		if(!this._activated && new Date() - this._timeStart > this._delay){

			this._activated = true;
			this._funcAction();

		}

		this._waitMore();

	}.bind(this), 10);

};