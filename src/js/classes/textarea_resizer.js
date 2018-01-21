'use strict';

var TextareaResizer = function(textarea, techDiv, freeLines){

	this._textarea = textarea;
	this._techDiv = techDiv;
	this._freeLines = freeLines || 0;
	this._textarea.oninput = this.change.bind(this);
	this.change();	

};

TextareaResizer.prototype.change = function(){

	var text = '', regexp = /\s+\s/, _m, rep;

	this._textarea.value.replace(/[<>]/g, '&lt;').split('\n').forEach(function(s){

		if(s[0] === ' ' && s[1] !== ' ') s = '&nbsp;' + s.substr(1, s.length);

		while(_m = s.match(regexp)){

			rep = '';
			for(var i = 0; i < _m[0].length - 1; i++) rep += '&nbsp;';
			s = s.replace(regexp, rep + ' ');

		}

		text += '<div>' + (s || '&nbsp;') + '</div>\n';

	});
			
	this._techDiv.innerHTML = text;
	var numberOfLineBreaks = this._techDiv.scrollHeight / parseInt(getComputedStyle(this._textarea).lineHeight, 10);
	this._textarea.style.height = (this._freeLines + numberOfLineBreaks) * 20 + 'px';

};