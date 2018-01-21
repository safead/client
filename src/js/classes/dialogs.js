'use strict';

var Dialogs = function(){

	this._container = document.getElementById('content-holder');
	this._overlay = null;
	this._current = null;
	this._close = null;
	this._submit = null;

};

Dialogs.prototype.h = function(change){

	this._current && this._current.remove();
	this._current = null;
	if(change) return;
	this._container.removeEventListener('keydown', this._globalKeyLock);
	hasScrollBar() && document.body.classList.remove('paddRight17');
	document.removeEventListener('keydown', this._keydown);
	enableScroll();
	I.previousActive && I.previousActive.focus();

	if(I.isDesktop){

		var elem = document.getElementById('dialogOverlay');
		elem && elem.remove();

	}

};

Dialogs.prototype._show = function(container, caption, buttons, cb, params){

	cb = cb || null;
	params = params || {};
	this._current ? this.h(true) : hasScrollBar() && document.body.classList.add('paddRight17');
	this._current = container;
	this._close = this._current.getElementById('btnClose');
	DOM.loader();

	this._close && (this._close.onclick = function(e){

		e.stopPropagation();
		e.preventDefault();
		typeof cb === 'function' ? cb(false) : this.h();

	}.bind(this));

	this._submit = this._current.getElementById('btnSubmit');

	this._submit && (this._submit.onclick = function(e){

		e.stopPropagation();
		e.preventDefault();
		if(this._submit.disabled) return;

		if(typeof cb === 'function'){

			this._submit.classList.add('_loading');
			cb(true);

		}else this.h();

	}.bind(this));

	var nodeList = this._current.getElementsByClassName('d-text');
	for(var i = 0; i < nodeList.length; i++) caption.length ? nodeList[i].innerHTML = caption.shift() : nodeList[i].customClear();
	nodeList = this._current.getElementsByClassName('d-btn');

	for(i = 0; i < nodeList.length; i++){

		buttons[i] ? nodeList[i].innerHTML = (buttons[i] instanceof Array ? buttons[i][0] : buttons[i]) : nodeList[i].customClear();

		if(nodeList[i] !== this._close && nodeList[i] !== this._submit){

			nodeList[i].onclick = function(e){

				e.stopPropagation();
				e.preventDefault();

				if(typeof cb === 'function'){

					var btnId = e.target.getAttribute('id');
					btnId && (btnId = parseInt(btnId));
					cb(typeof btnId === 'number' ? btnId : null);

				}else this.h();

			}.bind(this);

		}

	}

	document.addEventListener('keydown', this._keydown);
	this._container.removeEventListener('keydown', this._globalKeyLock);
	I.isDesktop && !this._container.getElementById('dialogOverlay') && this._container.appendChild(I.template('dialog overlay'));
	this._container.appendChild(this._current);
	params.scrollEnabled || disableScroll();

	if(document.activeElement){

		I.previousActive = document.activeElement;
		I.previousActive.blur();

	}

	if(!params.noAutoFocus){

		var el = document.getElementById('dialog').getElementsByTagName('input');
		el.length && el[0].focus();

	}

};

Dialogs.prototype._keydown = function(e){

	this._close = document.getElementById('btnClose');
	this._submit = document.getElementById('btnSubmit');

	if(e.which === 27){

		this._close && this._close.click();

	}else if(e.which === 13){

		this._submit ? this._submit.click() : this._close && this._close.click();

	}

};

Dialogs.prototype._globalKeyLock = function(e){

	e.preventDefault();
	e.returnValue = false;

};

Dialogs.prototype.m = function(caption, buttons, cb){

	this._show(I.template('dialog modal').firstChild, caption, buttons, cb);

};

Dialogs.prototype.i = function(caption, buttons, cb){

	this._show(I.template('dialog info').firstChild, caption, buttons, cb);

};

Dialogs.prototype.c = function(caption, buttons, cb){

	this._show(I.template('dialog confirm').firstChild, caption, buttons, cb);

};

Dialogs.prototype.u = function(caption, buttons, cb){

	this._show(I.template('dialog upgrade').firstChild, caption, buttons, cb);

};

Dialogs.prototype.x = function(caption, buttons, cb){

	this._show(I.template('dialog captcha').firstChild, caption, buttons, cb);

};

Dialogs.prototype.t = function(caption, buttons, cb){

	this._show(I.template('dialog input').firstChild, caption, buttons, cb);

};

Dialogs.prototype.contact = function(caption, buttons, cb){

	this._show(I.template('dialog contact').firstChild, caption, buttons, cb);

};

Dialogs.prototype.r = function(caption, buttons, cb){

	this._show(I.template('dialog avatar').firstChild, caption, buttons, cb, {scrollEnabled: true});

};

Dialogs.prototype.a = function(cb){

	this._show(I.template('dialog 2x auth').firstChild, [], [], cb, {noAutoFocus: true});

};

Dialogs.prototype.ac = function(){

	this._show(I.template('dialog 2x auth confirm').firstChild, [], []);

};

Dialogs.prototype.s = function(caption, buttons, cb){

	this._show(I.template('dialog textarea').firstChild, caption, buttons, cb);

};

Dialogs.prototype.p = function(caption, buttons, cb){

	this._show(I.template('dialog set password').firstChild, caption, buttons, cb);

};

Dialogs.prototype.b = function(buttons, cb){

	var df = I.template('dialog buttons only'), buttonDf;

	for(var i = 0; i < buttons.length; i++){

		buttonDf = I.template('dialog button');
		buttonDf.getElementById('title').setAttribute('id', buttons[i] instanceof Array ? buttons[i][1] : i);
		df.getElementById('buttonsContainer').appendChild(buttonDf);

	}

	this._show(df.firstChild, '', buttons, cb);

};

Dialogs.prototype.b3 = function(caption, buttons, cb){

	this._show(I.template('dialog 3 buttons').firstChild, caption, buttons, cb);

};