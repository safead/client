'use strict';

//LoginInput

var LoginInput = function(container, readyFunc, submitFunc){

	this._container = container;
	this._input = this._container.getElementById('inputValue');
	this._hint = this._container.getElementById('hint');
	this._icon = this._container.getElementById('iconCheck');
	this._error = '';
	this._readyFunc = readyFunc;
	if(!(this._input && this._hint)) throw new Error(l[362]);

	this._input.addEventListener('blur', function(){

		this._input.value = this._input.value.trim().toLowerCase();
		if(!this._input.value) return;

		if(this._input.value.length === 1){

			this._icon && (I.isDesktop ? this._icon.hide() : this._icon.show());
			this._container.error();
			this._hint.innerHTML = '2 ' + l[302];

		}else if(this._error){

			this._icon && (I.isDesktop ? this._icon.hide() : this._icon.show());
			this._container.error();
			this._hint.innerHTML = this._error;

		}else if(this._hint.innerHTML){

			this._container.error();
			this._icon && (I.isDesktop ? this._icon.hide() : this._icon.show());

		}

	}.bind(this));

	this._input.addEventListener('focus', function(){

		this._hint.innerHTML = '';
		this._container.noerror();

	}.bind(this));

	this._input.addEventListener('input', function(){

		this._container.mnook();
		this._hint.innerHTML = '';
		this._icon && this._icon.hide();
		this._icon && this._icon.invis();
		this._value = this._input.value.trim().toLowerCase();

		if(!this._value){

			this._container.noerror();
			return this._readyFunc(false);

		}

		if(this._value.length >= 2 && !checkEmailLogin(this._value)){

			this._container.error();
			this._hint.innerHTML = l[151];
			return this._readyFunc(false);

		}

		if(this._value.length < 2) return this._readyFunc(false);
		this._container.noerror();
		this._hint.innerHTML = l[54] + '...';

		A.userId(this._value, 's').then(function(result){

			if(result === 'cancelled' || result.login !== this._value) return;

			if(result.id){

				this._error = l[65];
				this._container.error();
				this._hint.innerHTML = this._error;
				return this._readyFunc(false);

			}

			this._error = '';
			this._hint.innerHTML = '';
			this._icon && this._icon.show();
			this._icon && this._icon.vis();
			this._container.mok();
			this._readyFunc(true);

		}.bind(this));

	}.bind(this));

	submitFunc && this._input.catchEnter(submitFunc);

};

LoginInput.prototype.ok = function(){

	return this._container.visible() ? this._container.isok() : true;

};

// NickInput

var NickInput = function(container, readyFunc, submitFunc){

	this._container = container;
	this._input = this._container.getElementById('nickname');
	this._hint = this._container.getElementById('nicknameHint');
	if(!this._input) throw new Error(l[362]);
	this._readyFunc = readyFunc;

	this._input.addEventListener('blur', function(){

		this._hint.innerHTML = '';
		this._input.value = safeBracket(this._input.value.trim());
		if(!this._input.value) return;

		if(this._input.value.length < 2){

			this._container.error();
			this._hint && (this._hint.innerHTML = '2 ' + l[302]);

		}

	}.bind(this));

	this._input.addEventListener('focus', function(){

		this._hint && (this._hint.innerHTML = '');
		this._container.noerror();

	}.bind(this));

	this._input.addEventListener('input', function(){

		var value = safeBracket(this._input.value.trim());
		this._hint && (this._hint.innerHTML = '');
		this._container.mnook();

		if(value.length >= 2){

			this._container.mok();
			this._hint && (this._hint.innerHTML = '');

		}

		this._readyFunc(false);

	}.bind(this));

	submitFunc && this._input.catchEnter(submitFunc);

};

NickInput.prototype.ok = function(){

	return this._container.visible() ? (safeBracket(this._input.value.trim()).length > 1) : true;

};

// PasswordConfirmInput

var PasswordConfirmInput = function(container, passwordInput, readyFunc, submitFunc){

	this._container = container;
	this._readyFunc = readyFunc;
	this._input = this._container.getElementById('passwordConfirm');
	this._passwordInput = passwordInput;
	this._hint = this._container.getElementById('passwordConfirmHint');
	this._icon = this._container.getElementById('passwordConfirmIcon');
	if(!(this._input && this._hint)) throw new Error(l[362]);
	this._baseClassName = this._container.className;

	this._input.onblur = function(){

		if(!this._input.value) return;
		this._compare();

	}.bind(this);

	this._input.onfocus = function(){

		this._hint.innerHTML = '';
		this._container.noerror();

	}.bind(this);

	this._input.oninput = this.oninput.bind(this);

	if(I.isDesktop){ //reset for desktop

	}else this._container.className = this._baseClassName + (this._container.visible() ? '' : ' hide');

	submitFunc && this._input.catchEnter(submitFunc);

};

PasswordConfirmInput.prototype.oninput = function(){

	this._icon && this._icon.hide();
	this._container.mnook();
	this._hint.innerHTML = '';

	if(this._passwordInput.value === this._input.value){

		this._container.mok();
		this._icon && this._icon.show();

	}

	this._readyFunc(false);

};

PasswordConfirmInput.prototype._compare = function(){

	this._hint.innerHTML = '';
	this._container.noerror();
	I.isDesktop || this._container.mnook();
	this._icon && this._icon.hide();
	if(!this._passwordInput.value || !this._input.value) return;
	I.isDesktop || (this._icon && this._icon.show());

	if(this._passwordInput.value !== this._input.value){

		this._container.error();
		this._hint.innerHTML = l[14];
		return;

	}

	this._container.mok();

};

PasswordConfirmInput.prototype.ok = function(){

	return this._container.visible() ? this._container.isok() : true;

};

// PasswordInput

var PasswordInput = function(container, readyFunc, submitFunc, passwordConfirmObject, anyPassword){

	this._container = container;
	this._input = this._container.getElementById('password');
	this._hint = this._container.getElementById('passwordHint');
	this._icon = this._container.getElementById('passwordIcon');
	this._passVisible = this._container.getElementById('passVisible');
	this._visible = false;
	if(!(this._input && this._hint && this._icon && this._passVisible)) throw new Error(l[362]);
	this._baseClassName = this._container.className;
	this._readyFunc = readyFunc || null;
	this._passwordConfirmObject = passwordConfirmObject || null;
	this._strength = {score: 0, entropy: 0};
	this._passwordOk = false;
	this._anyPassword = anyPassword || false;

	this._input.onfocus = function(){

		this._container.noerror();

	}.bind(this);

	this._passVisible.onclick = this._switchVisible.bind(this);
	this._icon.onclick = this._switchVisible.bind(this);
	this._input.onblur = this._blur.bind(this);
	this._input.oninput = this.oninput.bind(this);
	if(I.isDesktop){ //reset for desktop

	}else{

		this._container.className = this._baseClassName + (this._container.visible() ? '' : ' hide');

	}

	submitFunc && this._input.catchEnter(submitFunc);

};

PasswordInput.prototype.oninput = function(){

	this._input.value ? this._passVisible.hide() : this._passVisible.show();
	this._check();
	this._passwordConfirmObject && this._passwordConfirmObject._compare();
	this._readyFunc && this._readyFunc();

};

PasswordInput.prototype._switchVisible = function(){

	I.clickSound();
	this._visible = !this._visible;
	this._input.setAttribute('type', this._visible ? 'text' : 'password');
	this._passwordConfirmObject && this._passwordConfirmObject._input.setAttribute('type', this._visible ? 'text' : 'password');

};

PasswordInput.prototype._check = function(){

	if(!zxcvbn){

		alert('password strength check library is not ready');
		return;

	}

	this._icon.hide();

	if(!this._input.value){

		this._hint.innerHTML = '';

		if(I.isDesktop){ //desktop

			this._icon.className = '';
			this._container.noerror();

		}else{ //mobile

			this._container.className = this._baseClassName + (this._container.visible() ? '' : ' hide');

		}
		return;

	}

	this._strength = zxcvbn(this._input.value);
	this._passwordOk = true;
	this._hint.classList.add('goodPass');

	if(this._strength.score > 3 && this._strength.entropy > 75){

		this._hint.innerHTML = l[27];

		if(I.isDesktop){ //desktop
			
			this._icon.className = 'icon-password' + 5;

		}else{ //mobile

			this._icon.show();
			this._container.className = this._baseClassName;
			this._container.classList.add('reallyStrong');

		}

	}else if(this._strength.score > 2 && this._strength.entropy > 50){

		this._hint.innerHTML = l[26];

		if(I.isDesktop){ //desktop

			this._icon.className = 'icon-password' + 4;

		}else{ //mobile

			this._icon.show();
			this._container.className = this._baseClassName;
			this._container.classList.add('strong');

		}

	}else if(this._strength.score > 1 && this._strength.entropy > 40){

		this._hint.innerHTML = l[25];

		if(I.isDesktop){ //desktop

			this._icon.className = 'icon-password' + 3;

		}else{ //mobile

			this._icon.show();
			this._container.className = this._baseClassName;
			this._container.classList.add('medium');

		}

	}else if(this._strength.score > 0 && this._strength.entropy > 15){

		this._hint.innerHTML = l[24];

		if(I.isDesktop){ //desktop

			this._icon.className = 'icon-password' + 2;

		}else{ //mobile

			this._icon.show();
			this._container.className = this._baseClassName;
			this._container.classList.add('easy');

		}

	}else{

		this._passwordOk = this._anyPassword || false;
		this._hint.innerHTML = l[23];
		this._passwordOk = false;

		if(I.isDesktop){ //desktop

			this._icon.className = 'icon-password' + 1;
			this._hint.classList.remove('goodPass');

		}else{ //mobile

			this._icon.show();
			this._container.className = this._baseClassName;
			this._container.classList.add(this._anyPassword ? 'easy' : 'easiest');
			this._container.classList.add('error');
			this._anyPassword || this._container.mnook();

		}

	}	

	I.isDesktop || this._container.mok();

};

PasswordInput.prototype._blur = function(){

	if(!this._input.value){

		this._hint.innerHTML = '';
		this._container.noerror();
		return;

	}

	if(!this._passwordOk){

		this._container.error();
		I.isDesktop || this._icon.show();

	}

};

PasswordInput.prototype.ok = function(){

	return this._container.visible() ? this._passwordOk : true;

};