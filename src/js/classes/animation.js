'use strict';

var AnimationFactory = function(){

	this._objects = {};
	this._running = false;

};

AnimationFactory.prototype._action = function(time){

	var animTime, haveObjects = false, position;
	time = performance.now();

	for(var i in this._objects){

		animTime = time - this._objects[i].started;

		if(animTime >= this._objects[i].duration){ //object in final position

			if(this._objects[i].directCSS){

				this._objects[i].obj.style[this._objects[i].classPrefix] = this._objects[i].toPoint + this._objects[i].directCSS;

			}else this._objects[i].obj.className = this._objects[i].classPrefix + this._objects[i].toPoint;

			this._objects[i].obj.currentState = this._objects[i].toPoint;
			this._objects[i].callBack && this._objects[i].callBack();
			delete(this._objects[i]);

		}else{ //move object to new position

			if(this._objects[i].toPoint > this._objects[i].fromPoint){

				position = this._objects[i].fromPoint + (animTime / this._objects[i].duration * (this._objects[i].toPoint - this._objects[i].fromPoint));
				position = position > this._objects[i].toPoint ? this._objects[i].toPoint : position;

			}else{

				position = this._objects[i].fromPoint - (animTime / this._objects[i].duration * (this._objects[i].fromPoint - this._objects[i].toPoint));
				position = position < this._objects[i].toPoint ? this._objects[i].toPoint : position;

			}

			if(this._objects[i].directCSS){

				position = Math.abs(Math.round(position * 100) / 100);
				this._objects[i].obj.style[this._objects[i].classPrefix] = position + this._objects[i].directCSS;

			}else this._objects[i].obj.className = this._objects[i].classPrefix + Math.round(position);
			this._objects[i].obj.currentState = position;

		}

	}

	for(i in this._objects){

		haveObjects = true;
		break;

	}

	haveObjects ? animationFrame(this._action.bind(this)) : this._stop();

};

AnimationFactory.prototype.add = function(id, object, fromPoint, toPoint, duration, classPrefix, cb, directCSS){

	this._objects[id] = {

		obj: object,
		fromPoint : fromPoint,
		toPoint : toPoint,
		duration : duration,
		classPrefix : classPrefix,
		started: performance.now(),
		directCSS: directCSS || false,
		callBack: cb,

	};

	this._running || this._start();

};

AnimationFactory.prototype._break = function(object){

	for(var i in this._objects){

		if(this._objects[i].obj !== object) continue;
		delete(this._objects[i]);
		return;

	}

};

AnimationFactory.prototype._start = function(){

	this._running = true;
	animationFrame(this._action.bind(this));

};

AnimationFactory.prototype._stop = function(){

	this._running = false;

};