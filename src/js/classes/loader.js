'use strict';

var Loader = function(container, documentFragment){

	if(!(container instanceof HTMLElement) || !(documentFragment instanceof DocumentFragment)) throw new Error(l[362]);
	this._container = container;
	this._body = documentFragment.firstChild;
	this._progressText = this._body.getElementById('loaderMessage');
	this._progressBar = this._body.getElementById('bootProgress');
	this._noProgress = this._body.getElementById('noProgress');
	this._emulate = false;
	this._progress = 0;
	this._closeAfterFull = false;
	I.isDesktop && (document.getElementById('panelMain') ? this._body.classList.add('inner') : this._body.classList.remove('inner'));
	container.firstChild ? container.insertBefore(this._body, container.firstChild) : container.appendChild(this._body);

};

Loader.prototype.text = function(val){

	this._progressText.innerHTML = val;
	this.show();

};

Loader.prototype.progress = function(val){

	if(val === -1){

		this._noProgress.classList.add('noProgress');

	}else{

		this._noProgress.classList.remove('noProgress');
		this._progressBar.className = val ? 'progress progress-width' + val : 'progress progress-width0';

	}

	this.show();

};

Loader.prototype.remove = function(){

	if(this._emulate) return this._closeAfterFull = true;
	this._body.remove();

};

Loader.prototype.show = function(){

	if(this._container.innerHTML) return;
	I.isDesktop && (document.getElementById('panelMain') ? this._body.classList.add('inner') : this._body.classList.remove('inner'));
	this._container.appendChild(this._body);

};

Loader.prototype.emulate = function(duration, step){

	this._emulate = true;
	this._progress = this._progress || 0;
	this._step = step;
	this._delay = Math.round(duration / ((100 - this._progress) / this._step));
	this._emulateProgress();

};

Loader.prototype._emulateProgress = function(){

	this._progress += this._step;

	if(this._progress > 100){

		this._emulate = false;
		if(this._closeAfterFull) this.remove();
		return;

	}

	this.progress(this._progress);
	setTimeout(this._emulateProgress.bind(this), this._delay);

};