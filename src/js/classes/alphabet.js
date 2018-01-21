'use strict';

var Alphabet = function(container){

	if(!(container instanceof HTMLElement)) throw new Error(l[362]);
	this._container = container;
	this._lastElement = null;
	this._container.addEventListener('touchstart', this._scrollTo);
	this._container.addEventListener('touchmove', this._scrollTo);
	this.scale();

};

Alphabet.prototype._scrollTo = function(e){

	e.stopPropagation();
	e.preventDefault();
	I.closeAllAnimated();
	var element = document.elementFromPoint(parseInt(e.changedTouches[0].clientX), parseInt(e.changedTouches[0].clientY));
	if(this._lastElement === element) return;
	this._lastElement = element;
	var letter = element.id;
	if(letter.indexOf('letter') !== 0) return;
	C.scrollTo(letter.substr(6, letter.length).toLowerCase());

};

Alphabet.prototype.scale = function(){

	var availHeight = window.innerHeight,
		block = document.getElementById('alphabetSize');

	if(availHeight <= 375){

		block.className = 'inner fontSize10 lineHeight10';

	}else if(availHeight <= 533){

		block.className = 'inner fontSize13 lineHeight15';

	}else if(availHeight <= 558){

		block.className = 'inner fontSize13 lineHeight15';

	}else if(availHeight <= 600){

		block.className = 'inner fontSize13 lineHeight16';

	}else if(availHeight <= 625){

		block.className = 'inner fontSize13 lineHeight17';

	}else if(availHeight <= 653){

		block.className = 'inner fontSize13 lineHeight18';

	}else if(availHeight <= 690){

		block.className = 'inner fontSize13 lineHeight19';

	}else if(availHeight <= 725){

		block.className = 'inner fontSize13 lineHeight20';

	}else if(availHeight <= 768){

		block.className = 'inner fontSize13 lineHeight21';

	}else if(availHeight <= 800){

		block.className = 'inner fontSize16 lineHeight22';

	}else if(availHeight <= 821){

		block.className = 'inner fontSize16 lineHeight24';

	}else if(availHeight <= 889){

		block.className = 'inner fontSize16 lineHeight26';

	}else if(availHeight <= 947){

		block.className = 'inner fontSize16 lineHeight28';

	}else if(availHeight <= 1000){

		block.className = 'inner fontSize16 lineHeight30';

	}else if(availHeight <= 1023){

		block.className = 'inner fontSize16 lineHeight31';

	}else if(availHeight <= 1067){

		block.className = 'inner fontSize16 lineHeight32';

	}else if(availHeight <= 1112){

		block.className = 'inner fontSize16 lineHeight33';

	}else{

		block.className = 'inner fontSize16 lineHeight39';

	}

	block.show();

};