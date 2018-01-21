'use strict';

var Swipe = function(swipedBlock, menuFill, longSwipeFunc, classPrefix){

	if(!(swipedBlock instanceof HTMLElement) || !(menuFill instanceof Function)) throw new Error(l[362]);
	this._id = newUuid();
	this._container = swipedBlock;
	this._menuBlock = this._container.getElementById('swipeMenu');
	this._menuMaxWidth = 75; //% of available width
	this._menuFill = menuFill;
	this._classPrefix = classPrefix;
	this.longSwipeFunc = longSwipeFunc || null;
	this._container.addEventListener('touchstart', this._touchstart.bind(this));
	this._container.addEventListener('touchmove', this._touchmove.bind(this));
	this._container.addEventListener('touchend', this._touchend.bind(this));

};

Swipe.prototype.open = function(){

	this._menu || this._getMenu();

	if(!this._swipePanel){

		this._swipePanel = this._container.getElementById('swipePanel');
		this._swipePanel.currentState = 0;

	}

	I.closeAllAnimated(this._id);
	I.swipeOpened[this._id] = this;

	AF.add(this._menu._id, this._menu, this._menu.currentState, Math.round((this._menuWidth / this._container.offsetWidth) * 100), common.swipeSpeed, this._menu._classPrefix, null, '%');
	for(var i in this._icons) AF.add(this._icons[i]._id, this._icons[i], this._icons[i].currentState, 1, common.swipeSpeed, 'opacity', null, ' ');
	for(i in this._titles) AF.add(this._titles[i]._id, this._titles[i], this._titles[i].currentState, 1, common.swipeSpeed, 'opacity', null, ' ');

	AF.add(this._id, this._swipePanel, this._swipePanel.currentState, -this._menuWidth, common.swipeSpeed, this._classPrefix, function(){

		this.opened = true;
		enableScroll();

	}.bind(this));

};

Swipe.prototype.close = function(){

	if(!this._swipePanel) return;

	if(this._menu){

		AF.add(this._menu._id, this._menu, this._menu.currentState, 0, common.swipeSpeed, this._menu._classPrefix, null, '%');
		for(var i in this._icons) AF.add(this._icons[i]._id, this._icons[i], this._icons[i].currentState, 0, common.swipeSpeed, 'opacity', null, ' ');
		for(i in this._titles) AF.add(this._titles[i]._id, this._titles[i], this._titles[i].currentState, 0, common.swipeSpeed, 'opacity', null, ' ');

	}

	AF.add(this._id, this._swipePanel, this._swipePanel.currentState, 0, common.swipeSpeed, this._classPrefix, function(){

		enableScroll();
		this.remove();
		delete(this._longSwiped);
		delete(this._longSwipeInProgress);
		delete(this._firstMove);
		delete(this._isHorizontalMove);
		delete(this._swipePanel);
		delete(this._menu);
		delete(this._icons);
		delete(this._titles);
		delete(this._titles);
		delete(this._buttons);
		delete(this._blocked);
		delete(this.opened);
		delete(this._addX);
		delete(this._startCoordsX);
		delete(this._endCoordsX);
		delete(this._startCoordsY);
		delete(this._endCoordsY);
		delete(this.wasOpened);

	}.bind(this));

};

Swipe.prototype._touchstart = function(e){

	this._firstMove = true;
	this._isHorizontalMove = false;
	typeof this._menuWidth === 'undefined' && (this._menuWidth = 0);
	typeof this._blocked === 'undefined' && (this._blocked = false);
	typeof this.opened === 'undefined' && (this.opened = false);
	this.opened && (this.wasOpened = true);

	if(!this._swipePanel){

		this._swipePanel = this._container.getElementById('swipePanel');
		this._swipePanel.currentState = 0;

	}

	(I.panelLeft && I.panelRight) && (I.panelLeft.visible || I.panelRight.visible) && (this._blocked = true);
	if(this._blocked) return;
	this._addX = this.opened ? this._menuWidth : 0;
	this._startCoordsX = this._endCoordsX = parseInt(e.changedTouches[0].clientX);
	this._startCoordsY = this._endCoordsY = parseInt(e.changedTouches[0].clientY);

};

Swipe.prototype._touchmove = function(e){

	if(this._blocked || ((I.panelLeft && I.panelRight) && (I.panelLeft.visible || I.panelRight.visible))) return;
	this._endCoordsX = parseInt(e.changedTouches[0].clientX);
	var deltaX = this._endCoordsX - this._startCoordsX;

	if(this._firstMove){

		this._firstMove = false;
		this._endCoordsY = parseInt(e.changedTouches[0].clientY);
		var deltaY = this._endCoordsY - this._startCoordsY;

		if(Math.abs(deltaX) > Math.abs(deltaY)){

			this._isHorizontalMove = true;
			disableScroll();
			I.closeAllAnimated(this._id);

		}else this._isHorizontalMove = false;

	}

	if(!this._isHorizontalMove) return;
	if(deltaX < 0 || (deltaX > 0 && this.wasOpened)) e.stopPropagation();
	e.preventDefault();
	I.swipeOpened[this._id] = this;
	deltaX < 0 && (this._menu || this._getMenu());
	deltaX -= this._addX;

	if(deltaX > 0){ //final right point

		deltaX = 0;
		this.opened = false;

	}else if(deltaX < 0){

		this.opened = true;

		if(deltaX < -this._menuWidth){

			if(!this.longSwipeFunc){ //final left point
				
				deltaX = -this._menuWidth;

			}else return this._openLongSwipe(); //long swipe

		}else this._closeLongSwipe();

	}

	if(this._longSwipeInProgress) return;
	AF.add(this._id, this._swipePanel, this._swipePanel.currentState, deltaX, 0, this._classPrefix);

	if(this._menu){

		AF.add(this._menu._id, this._menu, this._menu.currentState, Math.round((Math.abs(deltaX) / this._container.offsetWidth) * 10000) / 100, 0, this._menu._classPrefix, null, '%');

		for(var i in this._icons){

			AF.add(this._icons[i]._id, this._icons[i], this._icons[i].currentState, Math.abs(deltaX) < this._menuWidth / 2 ? 0 : Math.round(((Math.abs(deltaX) / (this._menuWidth / 2)) - 1) * 100) / 100, 0, 'opacity', null, ' ');

		}

		for(i in this._titles){

			AF.add(this._titles[i]._id, this._titles[i], this._titles[i].currentState, Math.abs(deltaX) < this._menuWidth / 2 ? 0 : Math.round(((Math.abs(deltaX) / (this._menuWidth / 2)) - 1) * 100) / 100, 0, 'opacity', null, ' ');

		}

	}

};

Swipe.prototype._touchend = function(e){

	this._blocked = false;
	if(!this._isHorizontalMove) return;

	if((this._longSwiped) && this.longSwipeFunc){

		e.preventDefault();
		e.stopPropagation();
		return this.longSwipeFunc();

	}

	var deltaX = parseInt(this._endCoordsX - this._startCoordsX);

	if(deltaX > 0 || (deltaX < 0 && deltaX > -common.swipeDeltaToContinue)){

		if(!(I.panelLeft.visible || I.panelRight.visible)){

			e.preventDefault();
			e.stopPropagation();

		}

		this.close();

	}else if(deltaX < 0){

		e.preventDefault();
		e.stopPropagation();
		this.open();

	}

};

Swipe.prototype._stopAllAnimation = function(){

	for(var i = 0; i < this._buttons.length - 1; i++) AF._break(this._buttons[i]);
	AF._break(this._menu);
	AF._break(this._swipePanel);

};

Swipe.prototype._openLongSwipe = function(){

	if(this._longSwiped) return;
	this._longSwipeInProgress = true;
	this._longSwiped = true;
	this._stopAllAnimation();
	for(var i = 0; i < this._buttons.length - 1; i++) AF.add(this._buttons[i]._id, this._buttons[i], this._buttons[i].currentState, 0, common.swipeLongSpeed, 'width', null, '%');

	AF.add(this._id, this._swipePanel, this._swipePanel.currentState, -this._container.offsetWidth, common.swipeLongSpeed, this._classPrefix);
	AF.add(this._menu._id, this._menu, this._menu.currentState, 100, common.swipeLongSpeed, 'width', function(){

		this._longSwipeInProgress = false;

	}, '%');

};

Swipe.prototype._closeLongSwipe = function(){

	if(!this._longSwiped) return;
	this._longSwiped = false;
	this._stopAllAnimation();
	for(var i = 0; i < this._buttons.length - 1; i++) AF.add(this._buttons[i]._id, this._buttons[i], this._buttons[i].currentState, 100, common.swipeLongSpeed, 'width', null, '%');
	AF.add(this._id, this._swipePanel, this._swipePanel.currentState, -this._menuWidth, common.swipeLongSpeed, this._classPrefix);

	AF.add(this._menu._id, this._menu, this._menu.currentState, this._menuMaxWidth, common.swipeLongSpeed, 'width', function(){

		this._longSwipeInProgress = false;

	}, '%');

};

Swipe.prototype._getMenu = function(){

	this._menuWidth = Math.round(this._container.offsetWidth * (this._menuMaxWidth / 100));
	this._menuBlock.customClear();
	this._menuBlock.appendChild(this._menuFill());
	this._menu = this._menuBlock.firstChild;
	this._menu.currentState = 0;
	this._menu._id = newUuid();
	this._menu._classPrefix = 'width';
	this._icons = [];
	this._titles = [];
	this._buttons = this._menu.getChildsByTagName('span');

	for(var i = 0; i < this._buttons.length; i++){

		this._buttons[i]._id = newUuid();
		this._buttons[i].currentState = 100; //width
		var span = this._buttons[i].getElementsByTagName('span')[0];
		span._id = newUuid();
		span.currentState = -1; //opacity
		this._icons.push(span);
		span = this._buttons[i].getElementsByTagName('span')[1];
		if(!span) continue;
		span._id = newUuid();
		span.currentState = 0; //opacity
		this._titles.push(span);

	}

};

Swipe.prototype.remove = function(){

	delete(I.swipeOpened[this._id]);

};