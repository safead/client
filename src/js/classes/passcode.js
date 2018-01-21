'use strict';

var Passcode = function(container, cb){

	this._container = container;
	this._cb = cb || null;
	this._currentPinLength = 0;
	this._minLength = 4;
	this._maxLength = 15;
	this._triesToFail = 3;
	this._blockTime = 300; //seconds
	this._timeout = null;
	this._result = '';

};

Passcode.prototype._done = function(result){

	this._res(result);
	delete(this._res);

};

Passcode.prototype._checkTouchId = function(){

	return new Promise(function(res){

		if(!app) return res(-1);

		window.plugins.touchid.verifyFingerprintWithCustomPasswordFallback(l[504], function(){ // success

			res(true);
		
		}, function(msg){

			return res(msg.code === -2 ? false : -1);

		}.bind(this));

	}.bind(this));

};

Passcode.prototype.check = function(currentPasscode, multiTry, useTouchID){

	multiTry = multiTry || false;

	return new Promise(function(res){

		var cb;

		if(this._res){

			cb = res;

		}else{

			cb = this._done;
			this._res = res;

		}

		I.checkTouchId().then(function(touchIdEnabled){

			if(useTouchID) return this._checkTouchId().then(function(result){

				if(!result || result === -1){

					return this.check(currentPasscode, multiTry).then(function(result){

						return cb.call(this, result);

					}.bind(this));

				}else return cb.call(this, true);

			}.bind(this));

			if(!currentPasscode) return this._done(true);
			this._currentPinLength = currentPasscode.length;

			var triesLeft = U.passTries(), subTitle = triesLeft < this._triesToFail ? l[495].ucFirst() + ': ' + triesLeft : '';

			return this._action(multiTry ? l[492].ucFirst() : l[498].ucFirst(), subTitle, touchIdEnabled && (typeof useTouchID !== 'undefined' && !useTouchID)).then(function(result){

				return currentPasscode === result;

			}).then(function(result){

				if(result) return U.setDeviceVars({passBlocked: 0, passTries: this._triesToFail}).then(function(){

					return cb.call(this, true);

				}.bind(this));

				app && navigator.vibrate(300);
				triesLeft = U.passTries();
				var params = {passTries: --triesLeft};
				triesLeft === 0 && (params['passBlocked'] = Math.floor(Date.now() / 1000));
				return U.setDeviceVars(params).then(function(){

				}.bind(this)).then(function(){

					return multiTry || triesLeft > 0 ? this.check(currentPasscode, multiTry, useTouchID) : false;

				}.bind(this)).then(function(result){

					cb.call(this, result);

				}.bind(this));

			}.bind(this)).catch(function(e){

				if(e === l[537]){//user selects touchId

					U.setDeviceVars({touchId: true});

					return this._checkTouchId().then(function(result){

						if(!result || result === -1){
							
							return this.check(currentPasscode, multiTry).then(function(result){

								return cb.call(this, result);

							}.bind(this));

						}else return cb.call(this, true);

					}.bind(this));

				}

				return cb.call(this, false);

			}.bind(this));

		}.bind(this));

	}.bind(this));

};

Passcode.prototype.change = function(currentPasscode){

	return new Promise(function(res){

		this._res = res;

		return (currentPasscode ? this.check(currentPasscode, true) : Promise.resolve(true)).then(function(result){

			if(!result) throw new Error(l[497]);
			return this.set();

		}.bind(this)).then(function(result){

			this._done(result);

		}.bind(this)).catch(function(){

			this._done(false);

		}.bind(this));
	
	}.bind(this));

};

Passcode.prototype.set = function(){

	return new Promise(function(res){

		var cb;

		if(this._res){

			cb = res;

		}else{

			cb = this._done;
			this._res = res;

		}

		this._currentPinLength = 0;
		var firstPasscode;

		this._action(l[493].ucFirst(), '').then(function(result){

			firstPasscode = result;
			this._currentPinLength = firstPasscode.length;
			return this._action(l[494].ucFirst());

		}.bind(this)).then(function(result){

			if(firstPasscode !== result){

				app && navigator.vibrate(300);

				return this.set().then(function(result){

					return cb.call(this, result);

				}.bind(this));

			}else{

				U.setDeviceVars({passBlocked: 0, passTries: this._triesToFail, passCode: firstPasscode}).then(function(){

					return cb.call(this, true);

				}.bind(this));

			}

		}.bind(this)).catch(function(){

			cb.call(this, false);

		}.bind(this));

	}.bind(this));

};

Passcode.prototype._action = function(title, subTitle, showTouchButton){

	return new Promise(function(res, rej){

		var _action = function(){

			DOM.loader();
			subTitle = subTitle || '';
			this._result = '';
			this._df = I.template('passcode');
			this._container.customClear();
			this._pointsBlock = this._df.getElementById('points');
			this._domNumbersBlock = this._df.getElementById('numbers');
			this._domNumbers = this._domNumbersBlock.getElementsByTagName('li');
			this._touchIdButton = this._domNumbersBlock.getElementById('touchIdButton');

			if(this._currentPinLength){

				this._pointsBlock.innerHTML = '';
				for(var i = 0; i < this._currentPinLength; i++) this._pointsBlock.appendChild(document.createElement('li'));

			}

			this._points = this._pointsBlock.getElementsByTagName('li');

			for(i = 0; i < this._domNumbers.length; i++) this._domNumbers[i].onclick = function(e){

				if(U.passTries() === 0) return;
				this._buttonPressed(e.target);

				if(this._currentPinLength && this._result.length === this._currentPinLength){

					res(this._result);
					this._result = '';

				}

			}.bind(this);

			this._df.getElementById('title').innerHTML = title;
			this._subTitle = this._df.getElementById('subTitle');

			if(subTitle){

				this._subTitle.innerHTML = subTitle;
				this._subTitle.show();

			}

			for(i = 0; i < this._points.length; i++) this._points[i].className = '';
			this._delete = this._df.getElementById('delete');

			this._delete.onclick = function(){

				I.clickSound();
				this._result = this._result.slice(0, -1);
				
				if(this._currentPinLength){

					this._points[this._result.length].className = '';

				}else this._result.length < this._maxLength && this._subTitle.hide();

				if(this._result){

					if(!this._currentPinLength){

						this._result.length < this._minLength && this._set.hide();
						this._pointsBlock.lastChild.remove();

					}

				}else this._currentPinLength || (this._pointsBlock.innerHTML = '&nbsp;');

			}.bind(this);

			this._set = this._df.getElementById('set');

			this._set.onclick = function(){

				I.clickSound();
				res(this._result);
				this._result = '';

			}.bind(this);

			this._cancel = this._df.getElementById('cancel');

			this._cancel.onclick = function(){

				I.clickSound();
				clearTimeout(this._timeout);
				this._timeout = null;
				rej(new Error(l[500]));

			}.bind(this);

			if(showTouchButton){

				this._domNumbersBlock.classList.remove('open');

				this._touchIdButton.onclick = function(){

					rej(l[537]);

				};

			}

			this._container.appendChild(this._df);

			if(this._blockTime - (Math.floor(Date.now() / 1000) - U.passBlocked()) > 0){

				this._pointsBlock.innerHTML = '&nbsp;';
				this._subTitle.innerHTML = l[496].ucFirst() + ': ' + (this._blockTime - (Math.floor(Date.now() / 1000) - U.passBlocked()));

				var _waiter = function(){

					this._timeout = setTimeout(function(){

						if(app && app.paused) return;
						var timeLeft = this._blockTime - (Math.floor(Date.now() / 1000) - U.passBlocked());

						if(timeLeft <= 0){

							return U.setDeviceVars({passBlocked: 0, passTries: this._triesToFail}).then(function(){

								if(this._timeout) return this._action(title, '').then(function(result){

									res(result);

								}).catch(function(){

									rej(new Error(l[500]));

								});

							}.bind(this));

						}else{

							this._subTitle.innerHTML = l[496].ucFirst() + ': ' + timeLeft;
							_waiter();

						}

					}.bind(this), 1000);

				}.bind(this);

				_waiter();

			}else if(U.passTries() === 0){

				this._subTitle.hide();
				return U.setDeviceVars({passBlocked: 0, passTries: this._triesToFail});

			}

		};

		I.deployed = false;

		app ? window.plugins.nativepagetransitions.flip({

			direction : 'left',
			duration: common.transitionSpeed,
			iosdelay :  -1,
			androiddelay :  -1,

		}, function(){

			_action.call(this);
			app && window.plugins.nativepagetransitions.executePendingTransition();

		}.bind(this)) : _action.call(this);

	}.bind(this));

};

Passcode.prototype._buttonPressed = function(button){

	I.clickSound();
	if(this._result.length === this._maxLength) return;
	this._result += button.findSelfOrParentByTagname('li').getAttribute('data-id');

	if(this._currentPinLength){ // check passcode mode

		this._points[this._result.length - 1].classList.add('active');

	}else{ //new passcode mode

		var el = document.createElement('li');
		el.className = 'active';
		this._pointsBlock.getElementsByTagName('li').length || (this._pointsBlock.innerHTML = '');
		this._pointsBlock.appendChild(el);
		this._result.length >= this._minLength && this._set.show();

	}

	this._delete.show();
	if(this._result.length === this._maxLength) return this._subTitle.innerHTML = l[502];

};