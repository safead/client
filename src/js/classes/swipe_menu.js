'use strict';

var SwipeMenu = function(mainContent, container, opener, width, left){

	this.wiredMenu = null;
	this._blocked = false;
	this._container = container;
	this._mainContent = mainContent;
	this._opener = opener;
	this._left = left || false;
	this._mainPrefix = this._left ? 'left' : 'right';
	this._classPrefix = (this._left ? 'leftPanel ' : 'rightPanel ') + this._mainPrefix + '-';
	this._mainPrefix = 'allMainContentOuter ' + this._mainPrefix;
	this._type = 0;
	this._width = width;
	this._deltaToStart = 50;
	this._deltaToContinue = 100;
	this._startCoordsY = 0;
	this._startCoordsX = 0;
	this._endCoordsX = 0;
	this._mainContent.currentState = 0;
	this._container.currentState = this._width;
	this.opened = false;
	this.visible = false;
	this._isHorizontalMove = false;
	this._firstMove = false;
	this._menuAction = false;
	this._container.addEventListener('touchstart', this._touchStart.bind(this));
	this._container.addEventListener('touchmove', this._touchMove.bind(this));
	this._container.addEventListener('touchend', this._touchEnd.bind(this));
	this._mainContent.addEventListener('touchstart', this._touchStart.bind(this));
	this._mainContent.addEventListener('touchmove', this._touchMove.bind(this));
	this._mainContent.addEventListener('touchend', this._touchEnd.bind(this));

	this._opener.onclick = function(e){

		e.preventDefault();
		e.stopPropagation();
		I.clickSound();

		if(this._blocked){

			this.wiredMenu && (this.wiredMenu.close().then(function(){

				this.open();

			}.bind(this)));

		}else this.open();

	}.bind(this);

};

SwipeMenu.prototype.open = function(cb){

	if(this._blocked) return;
	this.wiredMenu && (this.wiredMenu._blocked = true);
	this.opened = true;
	this.visible = true;
	this.callBack = cb || null;
	I.swipingMenu = this;
	I.closeAllAnimated();
	disableScroll();

	if(app){

		window.plugins.nativepagetransitions.drawer({

			origin: this._left ? 'left' : 'right',
			action: 'open',
			duration: common.swipeSpeed,
			iosdelay :  -1,
			androiddelay :  -1,

		}, function(){

			this._container.className = this._left ? 'leftPanel left-0' : 'rightPanel right-0';

			window.plugins.nativepagetransitions.executePendingTransition(function(){

				I.swipingMenu = null;

			}.bind(this));

		}.bind(this));

	}else{

		AF.add(this._container.id, this._container, this._container.currentState, 0, common.swipeSpeed, this._classPrefix, function(){

			I.swipingMenu = null;

		});

		this._type && AF.add(this._container.id + 'm', this._mainContent, this._mainContent.currentState, this._width, common.swipeSpeed, this._mainPrefix);

	}

};

SwipeMenu.prototype.finalize = function(param){

	if(!this.callBack) return;
	this.callBack(param);
	delete(this.callBack);

};

SwipeMenu.prototype.close = function(showLoader, immidiatly){

	return new Promise(function(res){

		if(this._blocked) return res(false);
		I.swipingMenu = this;

		var _done = function(){

			I.swipingMenu = null;
			enableScroll();
			this.wiredMenu && (this.wiredMenu._blocked = false);
			this.opened = false;
			this.visible = false;
			F.setMode();
			this._container.scrollTop = 0;
			this.finalize(false);
			res(true);

		}.bind(this);

		if(app){

			window.plugins.nativepagetransitions.drawer({

				origin: this._left ? 'left' : 'right',
				action: 'close',
				duration: immidiatly ? 0 : common.swipeSpeed,
				iosdelay :  -1,
				androiddelay :  -1,

			}, function(){

				showLoader && DOM.loader('');
				this._container.className = this._left ? 'leftPanel left-290' : 'rightPanel right-280';

				window.plugins.nativepagetransitions.executePendingTransition(function(){

					_done();

				}.bind(this));

			}.bind(this));

		}else{

			showLoader && DOM.loader('');

			AF.add(this._container.id, this._container, this._container.currentState, this._width, immidiatly ? 0 : common.swipeSpeed, this._classPrefix, function(){

				_done();

			}.bind(this));

			this._type && AF.add(this._container.id + 'm', this._mainContent, this._mainContent.currentState, 0, immidiatly ? 0 : common.swipeSpeed, this._mainPrefix);

		}

	}.bind(this));

};

SwipeMenu.prototype._touchStart = function(e){

	if(this._blocked || I.swipingMenu) return;
	this._menuAction = e.target.findSelfOrParentByElement(this._container);
	this._startCoordsX = this._endCoordsX = parseInt(e.changedTouches[0].clientX);
	this._startCoordsY = parseInt(e.changedTouches[0].clientY);
	this._firstMove = true;
	this._actionDone = false;
	this._isHorizontalMove = false;

};

SwipeMenu.prototype._touchMove = function(e){

	if(this._blocked || I.swipingMenu) return;
	this._endCoordsX = parseInt(e.changedTouches[0].clientX);
	var deltaX = this._endCoordsX - this._startCoordsX;
	var deltaY = parseInt(e.changedTouches[0].clientY) - this._startCoordsY;
	if(this._actionDone) return;

	if(this._firstMove){

		if(Math.abs(deltaX) < this._deltaToStart && Math.abs(deltaY) < this._deltaToStart) return;
		this._firstMove = false;

		if(Math.abs(deltaX) > Math.abs(deltaY) * 2){

			this._isHorizontalMove = true;
			I.closeAllAnimated();
			document.activeElement && document.activeElement instanceof HTMLInputElement && document.activeElement.blur();
			disableScroll();

		}else{

			this._menuAction && enableScroll();
			this._isHorizontalMove = false;

		}

	}

	if(!this._isHorizontalMove){

		this._menuAction && ((deltaY > 0 && !this._container.scrollTop) || (deltaY < 0 && this._container.scrollHeight - this._container.scrollTop === this._container.offsetHeight)) && disableScroll();
		return;

	}

	e.preventDefault();
	e.stopPropagation();
	var menuDelta, mainDelta;

	if(this._left){

		if(deltaX > 0) this.wiredMenu && (this.wiredMenu._blocked = true); //left menu

		if(deltaX > this._deltaToStart && !this.opened){

			if(app){

				this._actionDone = true;
				this.open();

			}else{

				if(deltaX >= this._width) deltaX = this._width;
				menuDelta = this._width - deltaX;
				mainDelta = deltaX;
				this.visible = true;

			}

		}else if(deltaX < -this._deltaToStart && this.opened){

			if(app){

				this._actionDone = true;
				this.close();

			}else{

				if(deltaX <= -this._width) deltaX = -this._width;
				menuDelta = -deltaX;
				mainDelta = this._width + deltaX;
				this.visible = true;

			}

		}else if(deltaX <= 0 && !this.opened){

			menuDelta = this._width;
			mainDelta = 0;

		}

	}else{

		if(deltaX < 0) this.wiredMenu && (this.wiredMenu._blocked = true); //right menu

		if(deltaX < -this._deltaToStart && !this.opened){

			if(app){

				this._actionDone = true;
				this.open();

			}else{

				if(deltaX <= -this._width) deltaX = -this._width;
				menuDelta = this._width + deltaX;
				mainDelta = Math.abs(deltaX);
				this.visible = true;

			}

		}else if(deltaX > this._deltaToStart && this.opened){

			if(app){

				this._actionDone = true;
				this.close();

			}else{

				if(deltaX >= this._width) deltaX = this._width;
				menuDelta = deltaX;
				mainDelta = this._width - deltaX;
				this.visible = true;

			}

		}else if(deltaX >= 0 && !this.opened){

			menuDelta = this._width;
			mainDelta = 0;

		}

	}

	if(app || !menuDelta) return;
	AF.add(this._container.id, this._container, this._container.currentState, menuDelta, 0, this._classPrefix);

	if(this._type){

		!mainDelta && (mainDelta = '-' + mainDelta);
		AF.add(this._container.id + 'm', this._mainContent, this._mainContent.currentState, mainDelta, 0, this._mainPrefix);

	}

};

SwipeMenu.prototype._touchEnd = function(e){

	if(this._blocked) return;
	AF._break(this._container);

	var deltaX = parseInt(this._endCoordsX - this._startCoordsX);

	if(this.opened){

		if(!deltaX && !this._menuAction){

			if(!this.wiredMenu || !e.target.findSelfOrParentByElement(this.wiredMenu._opener)){

				e.preventDefault();
				e.stopPropagation();

			}

			this.close();
			return;

		}else if(this._menuAction) disableScroll();

	}

	if(!this._isHorizontalMove){

		this.opened || enableScroll();
		return;

	}

	e.preventDefault();
	e.stopPropagation();
	if(app) return;

	if(

		(!this._left && (deltaX < -this._deltaToContinue || ( Math.abs(deltaX) <= this._deltaToContinue && this.opened))) ||
		(this._left && (deltaX > this._deltaToContinue || ( Math.abs(deltaX) <= this._deltaToContinue && this.opened)))

	){

		this.open();

	}else if(

		(this._left && (deltaX !== 0 && Math.abs(deltaX) > this._deltaToContinue) || (Math.abs(deltaX) <= this._deltaToContinue && !this.opened)) ||
		(!this._left && (deltaX !== 0 && Math.abs(deltaX) > this._deltaToContinue) || (Math.abs(deltaX) <= this._deltaToContinue && !this.opened)))

	{

		this.close();

	}

};