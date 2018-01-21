'use strict';

var RecipientsHint = function(container, itemFragment, funcAction){

	if(!(container instanceof HTMLElement) || !(itemFragment instanceof DocumentFragment) || !(funcAction instanceof Function)) throw new Error(l[362]);
	this._container = container;
	this._df = itemFragment;
	this._action = funcAction;

};

RecipientsHint.prototype.getHint = function(e, value, exclude){

	var elem, sibling;

	if(I.isDesktop && (e.keyCode === 38 || e.keyCode === 40)){

		if(!this._container.innerHTML) return;
		elem = document.querySelectorAll('.compose-multi-help-link.hover');

		if(e.keyCode === 40){ //down

			if(elem.length){

				elem[0].classList.remove('hover');
				sibling = elem[0].parentElement.nextSibling;
				sibling ? sibling.getElementsByTagName('a')[0].classList.add('hover') : this._selectFirst();

			}else this._selectFirst();

		}else{

			if(elem.length){ //up

				elem[0].classList.remove('hover');
				sibling = elem[0].parentElement.previousSibling;
				sibling ? sibling.getElementsByTagName('a')[0].classList.add('hover') : this._selectLast();

			}else this._selectLast();

		}

		return true;

	}else	if(e.keyCode === 13){

		elem = document.querySelector('.compose-multi-help-link.hover');

		if(elem){

			elem.click();
			return false;

		}

	}

	this._container.customClear();
	if(!value) return this.hide();
	exclude = exclude || [];
	var contacts = C.getSimilar(value), df, hintItem;
	W.composeToolsVisibility(!contacts.length);

	if(!contacts.length){

		this.hide();
		return true;

	}

	for(var i = contacts.length - 1; i >= 0; i--) if(exclude.indexOf(contacts[i].address) >= 0) delete contacts.splice(i, 1);

	for(i = 0; i < contacts.length; i++){

		df = this._df.cloneNode(true);
		hintItem = df.firstChild;
		hintItem.setAttribute('data-id', contacts[i].id);
		elem = hintItem.getElementById('name');
		elem.innerHTML = contacts[i].name;
		elem.removeAttribute('id');
		elem = hintItem.getElementById('address');
		elem.innerHTML = addrReal(contacts[i].address);
		elem.removeAttribute('id');
		this._container.appendChild(df);

		hintItem.onclick = function(e){

			W.composeToolsVisibility(true);
			e.stopPropagation();
			e.preventDefault();
			this._action(C.byId(e.target.findSelfOrParentByTagname('li').getAttribute('data-id')));
			this._container.customClear();
			I.isDesktop || this.hide();

		}.bind(this);

	}

	contacts.length ? this._show() : this.hide();
	return true;

};

RecipientsHint.prototype.hide = function(){

	W.composeToolsVisibility(true);
	this._container.customClear();
	I.isDesktop ? this._container.parentNode.hide() : this._container.classList.remove('show');

};

RecipientsHint.prototype._show = function(){

	I.isDesktop ? this._container.parentNode.show() : this._container.classList.add('show');
	this._container.show();

};

RecipientsHint.prototype._selectFirst = function(){

	document.querySelector('.compose-multi-help-link').classList.add('hover');

};

RecipientsHint.prototype._selectLast = function(){

	var elems = document.querySelectorAll('.compose-multi-help-link');
	elems[elems.length - 1].classList.add('hover');

};