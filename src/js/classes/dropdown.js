'use strict';

var Dropdown = function(dropLink, container, _fillFunc, _clickedFunc){

	this._container = container;
	this._dropLink = dropLink;
	this._fillFunc = _fillFunc;
	this._clickedFunc = _clickedFunc;
	if(!(this._container instanceof HTMLElement) || !(this._dropLink instanceof HTMLElement) || !(this._fillFunc instanceof Function)) throw new Error(l[362]);

	this._dropLink.onclick = function(e){

		I.clickSound();
		e.preventDefault();
		e.stopPropagation();
		I.closeAllAnimated(this);
		this.action();

	}.bind(this);

};

Dropdown.prototype.action = function(){

	this._dropLink.classList.toggle('opened');
	this._container.classList.toggle('opened');

	if(this._dropLink.classList.contains('opened')){

		I.dropdownOpened = this;
		this._container.show();

		if(this._dropLink.absoluteOffset().left + this._dropLink.offsetWidth / 2 < window.screen.availWidth) this._dropLink.classList.add('left');
		this._container.appendChild(this._fillFunc(this._dropLink));
		var allItems = this._container.getElementsByTagName('li');

		for(var i in allItems){

			if(!allItems[i].tagName) continue;

			allItems[i].onclick = function(e){

				e.preventDefault();
				e.stopPropagation();
				this._clickedFunc && this._clickedFunc(e.target.findSelfOrParentByTagname('li'));
				this.action();

			}.bind(this);

		}

	}else{

		this._container.customClear();
		this._container.hide();
		I.dropdownOpened = null;

	}

};