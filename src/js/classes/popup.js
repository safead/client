'use strict';

var Popup = function(df, container, _fillFunc, _clickedFunc){

	if(!(df instanceof DocumentFragment)) throw new Error(l[362]);
	this._fillFunc = _fillFunc;
	this._clickedFunc = _clickedFunc;
	this._popupBlock = df.firstChild;

	var _hide = function(){

		document.body.removeEventListener('click', _clickedOutside);
		this._popupBlock.remove();

	}.bind(this);

	var _show = function(){

		var rect = this._popupBlock.getBoundingClientRect();
		this._popupBlock.addEventListenerForTags('li', 'click', _click);
		document.body.offsetHeight - rect.top < rect.height && (this._popupBlock.style.height = (document.body.offsetHeight - rect.top - 40) + 'px');

		this._popupBlock.onwheel = function(e){ 

			if(

				e.wheelDelta > 0 && this._popupBlock.scrollTop <= 0 ||
				e.wheelDelta < 0 && this._popupBlock.scrollTop >= this._popupBlock.scrollHeight - this._popupBlock.getBoundingClientRect().height

			) return false;

			return true;

		}.bind(this);

		setTimeout(function(){

			document.body.addEventListener('click', _clickedOutside, true);

		}.bind(this), 10);

	}.bind(this);

	var _click = function(e){

		e.stopPropagation();
		var dataId = e.target.findSelfOrParentByTagname('li').getAttribute('data-id');
		this._clickedFunc && this._clickedFunc(isInteger(dataId) ? parseInt(dataId) : e.target.findSelfOrParentByTagname('li'));
		_hide();

	}.bind(this);

	var _clickedOutside = function(e){

		e.target.findSelfOrParentByElement(this._popupBlock.firstChild) || _hide();

	}.bind(this);

	if(container instanceof Event){

		this._popupBlock = this._fillFunc ? this._fillFunc(this._popupBlock, _hide) : this._popupBlock;
		this._popupBlock.classList.add('absolute');
		this._popupBlock.style.top = container.pageY + 'px';
		this._popupBlock.style.left = '-1000px';
		document.body.appendChild(this._popupBlock);
		this._popupBlock.style.left = (container.clientX + this._popupBlock.offsetWidth > window.innerWidth ? container.clientX - this._popupBlock.offsetWidth : container.clientX) + 'px';

	}else container.appendChild(this._fillFunc ? this._fillFunc(this._popupBlock, _hide) : this._popupBlock);

	_show();

};