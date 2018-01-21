'use strict';

var RedactorHeight = function(containerId){

	this._container = document.getElementById(containerId);
	if(!this._container) throw new Error(l[362]);
	this._redactorField = this._container.querySelector('.mce-edit-area');
	if(!this._redactorField) return;
	this._freeHeight = 0;
	this._minHeight = 170;
	this._notCountedHeight = 100;

	this._blocksOnPage = [

		document.querySelector('.compose-body-settings'),
		document.querySelector('.compose-body-buttons-segment'),
		document.querySelector('.compose-head'),
		document.querySelector('.footer-inner')

	];

	setTimeout(function(){

		this.resize();

	}.bind(this), 300);

	window.removeEventListener('resize', this.resize);
	window.addEventListener('resize', this.resize.bind(this));

};

RedactorHeight.prototype.resize = function(){

	var busyHeight = 0;
	this._blocksOnPage.forEach(function(x){ busyHeight += x.outerHeight(true); });
	this._freeHeight = window.innerHeight - busyHeight - this._notCountedHeight;
	this._freeHeight < this._minHeight && (this._freeHeight = this._minHeight);
	this._redactorField.style.height = this._freeHeight + 'px';

};