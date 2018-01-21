'use strict';

var SafeFeedback = function(){

	this._block = null;
	this._iframe = null;
	this._css = null;

};

SafeFeedback.prototype._init = function(){

	//you can set predefined email for answer in global SecureFeedbackEmailForAnswer variable
	var SecureFeedbackEmailForAnswer = SecureFeedbackEmailForAnswer || '';

	if(this._css) return this._show();
	this._css = document.createElement('link');
	this._css.setAttribute('rel', 'stylesheet');
	this._css.setAttribute('type', 'text/css');
	this._css.setAttribute('href', 'https://safe.ad/css/feedback_embedded.css');

	this._css.addEventListener('load', function(){

		this._show();

	}.bind(this));

	document.head.appendChild(this._css);

};

SafeFeedback.prototype._show = function(){

	var script = document.getElementById('secureFeedbackScript');

	if(!script){

		var message = 'Script with id \'secureFeedbackScript\' for activate Secure Feedback was not found on the page!';
		console.error(message);
		alert(message);
		return;

	}

	this._block = document.createElement('div');
	this._block.className = 'overlay open';
	this._block.setAttribute('id', 'SecureFeedback');

	this._block.innerHTML = '<div class="innerOverlay" id="SecureFeedbackOverlay"><div class="popupContact" id="SecureFeedbackPopup"><iframe src="https://safe.ad/html/feedback.html?' + script.src.replace(/.*\?(.*)/i, '$1') + (SecureFeedbackEmailForAnswer ? '/' + SecureFeedbackEmailForAnswer : '') + '" id="SecureFeedbackWindow"></iframe><div class="sf-popup-stamp"></div></div></div>';
	document.body.appendChild(this._block);
	this._iframe = document.getElementById('SecureFeedbackWindow');

	this._iframe.onload = function(){

		window.addEventListener('message', this._listener);

	}.bind(this);

	document.getElementById('SecureFeedbackPopup').onclick = function(e){

		e.stopPropagation();

	}.bind(this);

	document.getElementById('SecureFeedbackOverlay').onclick = function(e){

		e.stopPropagation();
		this._hide();

	}.bind(this);


};

SafeFeedback.prototype._hide = function(){

	this._block.parentNode.removeChild(this._block);
	this._iframe = null;
	this._block = null;

};

SafeFeedback.prototype._listener = function(event){

	if(event.data !== 'Close') return;
	window.removeEventListener('message', SafeFeedbackObject._listener);
	SafeFeedbackObject._block.parentElement.removeChild(SafeFeedbackObject._block);
	SafeFeedbackObject._iframe = null;
	SafeFeedbackObject._block = null;

};

window.addEventListener('load', function(){

	var clickElement;

	if(typeof secureFeedbackButtonId === 'string' && (clickElement = document.getElementById(secureFeedbackButtonId))){

		var _action = function(){

			SafeFeedbackObject = SafeFeedbackObject || new SafeFeedback();
			SafeFeedbackObject._init();

		};

		clickElement.addEventListener('click', _action);
		clickElement.addEventListener('showFeedback', _action);

	}else{
		
		var message = typeof secureFeedbackButtonId === 'string' ? 'Element with id \'' + secureFeedbackButtonId + '\' for activate Secure Feedback was not found on the page!' : 'secure feedback requires "secureFeedbackButtonId" to be defined!';
		console.error(message);

	}

});

var SafeFeedbackObject;