'use strict';

var Captcha = function(container, documentFragment, page, afterLoadFunc, optional){

	if(!container || !documentFragment || !page) throw new Error(l[362]);
	this.resolved = false;
	this._container = container;
	this._template = documentFragment.cloneNode(true).firstChild;
	this._img = this._template.getElementById('captchaImg');
	this._refreshBtn = this._template.getElementById('captchaRefresh');
	this._input = this._template.getElementById('captchaInput');
	this._errorHint = this._template.getElementById('captchaErrorHint');
	this._inputBlock = this._template.getElementById('inputBlock');
	this._page = page;
	this._optional = optional || false;
	this._afterLoadFunc = afterLoadFunc || null;
	this.answer = '';
	this.id = '';
	this._captchaLength = 0;
	if(!(this._img && this._input && this._refreshBtn && this._errorHint)) throw new Error(l[362]);
	this._img.addEventListener('click', this._new.bind(this));
	this._refreshBtn.addEventListener('click', this._new.bind(this));

	this._input.addEventListener('input', function(){

		this._input.value = this._input.value.trim().toLowerCase();
		this._error();
		this.answer = this._input.value.trim().toLowerCase();
		if(this.answer.length < this._captchaLength) return;
		this._input.readOnly = true;
		this._errorHint.innerHTML = l[54] + '...';

		A.captchaCheck(this.answer, this.id).then(function(result){

			if(result === 'cancelled') return;

			this.resolved = true;
			this._refreshBtn.invis();
			this._input.value = this.answer;
			this.answer = result.p;
			this._errorHint.innerHTML = '';
			this._input.blur();
			this._inputBlock.mok();
			this._done();

		}.bind(this)).catch(function(){

			this._new('', true);
			this._error(l[127]);
			return false;

		}.bind(this));

	}.bind(this));

};

Captcha.prototype.new = function(err){

	this.resolved = false;
	this._inputBlock.mnook();

	return new Promise(function(res){

		this._done = res;
		return this._new(err);

	}.bind(this));

};

Captcha.prototype.focusInput = function(){

	this._input.focus();

};

Captcha.prototype._new = function(err, focus){

	if(this.resolved) return Promise.resolve();
	this._optional || this._container.appendChild(this._template);
	this._refreshBtn.classList.add('rotate');
	this._refreshBtn.show();
	this._error(typeof err === 'string' ? err : '');

	return A.captchaGet(this._page).then(function(result){

		if(result === 'cancelled') return;
		this._afterLoadFunc && this._afterLoadFunc();

		if(!result.d){

			this.resolved = true;
			this._img.setAttribute('src', '');
			this._container.customClear();
			return this._done();

		}

		this._refreshBtn.classList.remove('rotate');
		this._input.readOnly = false;
		this._input.value = '';
		this._captchaLength = result.l;
		this.id = result.cs;
		this._img.setAttribute('src', 'data:image/png;base64,' + result.d);
		this._template.classList.remove('load');
		this._optional && this._container.appendChild(this._template);
		focus && this._input.focus();

	}.bind(this));

};

Captcha.prototype._error = function(errorText){

	if(errorText){

		this._inputBlock.error();
		this._errorHint.innerHTML = errorText;
		this._input.readOnly = false;
		this._input.value = '';

	}else{

		this._inputBlock.noerror();
		this._errorHint.innerHTML = '';

	}
	
};