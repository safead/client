'use strict';

function cFeedback(id, email){

	this._xhr = null;
	this._subjMaxLength = 100;
	this._messageMaxLength = 10000;
	this._connectionTries = 3;
	this._apiUrl = 'https://api.safe.ad/';
	this._id = id;
	this._email = email || '';

}

cFeedback.prototype._init = function(){

	this._body = document.getElementById('feedback');
	this._preloader = document.getElementById('preloader');
	this._container = document.getElementById('container');
	this._formBody = document.getElementById('formBody');
	this._send = document.getElementById('send');
	this._cancel = document.getElementById('cancel');
	this._title = document.getElementById('title');
	this._feedbackSent = document.getElementById('feedbackSent');
	this._error = document.getElementById('error');
	this._mail = document.getElementById('mail');
	this._subj = document.getElementById('subj');
	this._message = document.getElementById('msg');
	this._close = document.getElementById('close');
	this._comment = document.getElementById('comment');

	this._email && !this._checkEmail(this._email) && (this._email = '');

	this._send.onclick = function(){

		if(this._send.classList.contains('_loading')) return;
		this._mail.value = this._mail.value.trim().toLowerCase();

		if(!this._checkEmail(this._mail.value)){

			this._mail.classList.add('error');
			return this._mail.focus();

		}

		this._subj.value = this._subj.value.trim();

		if(!this._subj.value){

			this._subj.classList.add('error');
			return this._subj.focus();

		}

		this._message.value = this._message.value.trim();

		if(!this._message.value){

			this._message.classList.add('error');
			return this._message.focus();

		}

		this._sendFeedback();

	}.bind(this);

	this._cancel.onclick = function(){

		parent.postMessage('Close', '*');

	};

	this._close.onclick = function(){

		parent.postMessage('Close', '*');

	};

	this._mail.onkeyup = function(e){

		e.target.classList.remove('error');
		if(e.keyCode === 27) this._cancel.click();
		if(e.keyCode === 13) this._send.click();

	}.bind(this);

	this._subj.onkeyup = function(e){

		e.target.classList.remove('error');
		if(e.keyCode === 27) this._cancel.click();
		if(e.keyCode === 13) this._send.click();

	}.bind(this);

	this._message.onkeyup = function(e){

		e.target.classList.remove('error');
		if(e.keyCode === 27) this._cancel.click();
		if(e.ctrlKey && e.keyCode === 13) this._send.click();

	}.bind(this);

	return this._request(this._apiUrl, {a: 'feedback', id: this._id}).then(function(response){

		try{

			var result = JSON.parse(response);

		}catch(e){

			throw new Error('Wrong api server response');

		}

		if(result.e) throw new Error('Script is not installed properly');
		if(typeof result.u !== 'string' || typeof result.n !== 'string' || typeof result.rsa !== 'string' || typeof result.key !== 'string') throw new Error('Wrong api server response');
		this._n = result.n;
		this._u = result.u;
		this._rsa = result.rsa;
		this._key = result.key;
		this._preloader.classList.add('hide');
		return Keyring.create(crypto.getRandomValues(new Uint8Array(48)));

	}.bind(this)).then(function(result){

		this._keyring = result;
		return this._keyring.importPublicKey('ENC', this._rsa);

	}.bind(this)).then(function(result){

		this._rsa = result;
		this._comment.innerHTML = '&nbsp;';

		this._formBody.classList.remove('hide');
		this._message.classList.remove('hide');
		this._mail.value = this._email;

		if(this._email){

			this._container.classList.add('noEmail');
			this._subj.focus();

		}else{

			this._mail.classList.remove('hide');
			this._mail.focus();

		}

	}.bind(this)).catch(function(ex){

		this._criticalError(ex.message + '.<br />Please get the new scipt code at <a href = "https://safe.ad" target="_blank">Safe Communications</a>');

	}.bind(this));

};

cFeedback.prototype._sendFeedback = function(){

	var subject = this._subj.value.trim();
	subject.length > this._subjMaxLength && (subject = subject.substr(0, this._subjMaxLength));
	var message = this._message.value.trim().replace(/[\n\r]/g, '<br />');
	message.length > this._messageMaxLength && (message = message.substr(0, this._messageMaxLength));

	var data = {

		n: a2u(this._n),
		u: this._u,
		f: this._mail.value,
		s: subject,
		m: message

	};

	this._mail.readOnly = true;
	this._subj.readOnly = true;
	this._message.readOnly = true;
	this._send.classList.add('_loading');

	return Encryption.encrypt(this._keyring, this._rsa.id, {data: msgpack.pack(data), aad: s2b('aad').buffer}).then(function(result){

		return this._request(this._apiUrl, {a: 'feedback', id: this._key, message: b2a(msgpack.pack(result))});

	}.bind(this)).then(function(result){

		try{

			result = JSON.parse(result);

		}catch(e){

			throw new Error('Wrong api server response');

		}

		if(result.e){

			if(result.e === 'N_S') throw new Error('Recipient do not have enought disc space');
			throw new Error('Bad server response');

		}

		this._body.classList.add('feedbackSent');
		this._formBody.parentElement.removeChild(this._formBody);
		this._title.parentElement.removeChild(this._title);
		this._preloader.parentElement.removeChild(this._preloader);
		this._error.parentElement.removeChild(this._error);
		this._feedbackSent.classList.remove('hide');
		this._close.classList.remove('hide');

	}.bind(this)).catch(function(ex){

		this._criticalError('Failed to send feedback.<div class="red">' + ex.message + '</div>Please read instructions at <a href = "https://safe.ad">Safe Communications</a>');

	}.bind(this));

};

cFeedback.prototype._criticalError = function(errorText){

	console.error(errorText);
	this._formBody.classList.add('hide');
	this._feedbackSent.classList.add('hide');
	this._preloader.classList.add('hide');
	this._error.innerHTML = errorText;
	this._error.classList.remove('hide');
	this._close.classList.remove('hide');

};

cFeedback.prototype._request = function(url, post){

	return new Promise(function(res, rej){

		this._xhr = (typeof XDomainRequest !== 'undefined' && typeof ArrayBuffer === 'undefined') ? new XDomainRequest() : new XMLHttpRequest();
		this._xhr.errors = 0;
		this._xhr.delay = 200;
		this._xhr.url = url;
		this._xhr.post = '[' + JSON.stringify(post) + ']';
		post = null;

		this._xhr.onerror = function(){

			console.error('xhr.onerror');
			if(this._networkError(this)) return;
			rej(new Error('Failed to get server response'));

		};

		this._xhr.onload = function(e){

			if(e.target.status !== (200)) return rej(new Error('Wrong server response'));
			res(this.response || this.responseText);

		};

		this._xhr.timer = setTimeout(this._network.bind(this), 0);

	}.bind(this));

};

cFeedback.prototype._network = function(){

	this._xhr.open('POST', this._xhr.url, true);
	this._xhr.send(this._xhr.post);

};

cFeedback.prototype._networkError = function(){

	if(++this._xhr.errors > this._connectionTries) return false;
	this._xhr.delay *= 2;
	clearTimeout(this._xhr.timer);
	this._xhr.timer = setTimeout(this._network.bind(this), this._xhr.delay);
	return true;

};

cFeedback.prototype._checkEmail = function(val){

	return /^([a-z0-9]([a-z0-9_.-])*)?[a-z0-9]@[a-z0-9][a-z0-9\-.]*[a-z0-9]\.[a-z]{2,7}$/.test(val);

};

cFeedback.prototype._clearTags = function(){

	return val.replace(/<\/?[^>]+(>|$)/g, '');

};

function s2b(s){

	var b = new Uint8Array(s.length);
	for(var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
	return b;

}

function b2a(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab;
	return btoa(b2s(b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

}

function b2s(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab, s = '';
	for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
	return s;

}

function a2u(s){

	s += '===', s = s.slice( 0, -s.length % 4 );
	return decodeURIComponent( escape( atob( s.replace(/-/g, '+').replace(/_/g, '/') ) ) );

}

window.onload = function(){

	var queryString = document.location.search.replace(/\?/, ''),
		pos = queryString.indexOf('/'),
		predefinedEmail = '';

	if(pos > 0){

		predefinedEmail = queryString.substr(pos + 1, queryString.length);
		queryString = queryString.substr(0, pos);

	}

	(new cFeedback(queryString, predefinedEmail))._init();

};