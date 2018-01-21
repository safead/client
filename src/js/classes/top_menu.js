'use strict';

var TopMenu = function(container, opener){

	if(!(container instanceof HTMLElement) || !(opener instanceof HTMLElement)) throw new Error(l[362]);
	this._container = container;
	this._opener = opener;
	this.opened = false;
	this.filled = false;

	opener.onclick = function(e){

		e.preventDefault();
		e.stopPropagation();

		if(this._container.getAttribute('data-opened')){

			this.close();

		}else{

			I.closeAllAnimated();
			this.open();

		}

	}.bind(this);

};

TopMenu.prototype.open = function(){

	if(this.opened) return;
	I.clickSound();
	I.addNotFinished(this);
	this._container.appendChild(I.template('panel top menu'));

	this._container.getElementById('addAlias').onclick = function(e){

		e.preventDefault();
		e.stopPropagation();
		DOM.addAlias();

	};

	U.aliases.forEach(function(alias){

		this.addItem(U.aliasByAddress(alias.alias));

	}.bind(this));

	var topPanelHeight = this._topPanelHeight();
	this._container.currentState = topPanelHeight - this._container.offsetHeight;
	this._container.setAttribute('data-opened', 1);
	this.opened = true;
	AF.add('TopMenu', this._container, this._container.currentState, topPanelHeight, common.swipeSpeed * 2, 'membersMenu top');

};

TopMenu.prototype.close = function(){

	if(!this.opened) return;
	I.clickSound();
	this._container.removeAttribute('data-opened');

	AF.add('TopMenu', this._container, this._container.currentState, this._topPanelHeight() - this._container.offsetHeight, common.swipeSpeed, 'membersMenu top', function(){

		this.opened = false;
		this._container.customClear();
		I.removeNotFinished(this);

	}.bind(this));

};

TopMenu.prototype._topPanelHeight = function(){

	return document.getElementById('panelTop').offsetHeight;

};

TopMenu.prototype.addItem = function(data){

	var node = I.template('panel top menu item').firstChild;
	node.setAttribute('data-alias', data.alias.toLowerCase());
	var elem = node.getElementById('title');
	elem.removeAttribute('id');
	elem.innerHTML = data.nick;
	elem = node.getElementById('address');
	elem.removeAttribute('id');
	elem.innerHTML = addrReal(data.alias);
	elem = node.getElementById('avatarImage');
	elem.removeAttribute('id');
	var src = AV.uri(data.alias); //avatar image

	if(src){

		elem.setAttribute('src', src);
		elem.show();

	}else elem.remove();

	node.onclick = function(e){

		e.stopPropagation();

		U.switchAlias(e.target.findSelfOrParentByTagname('li').getAttribute('data-alias')).then(function(){

			this.close();
			navState.page[0] === 'settings' && DOM.settingsInit();

		}.bind(this));

	}.bind(this);

	this._container.firstChild && this._container.firstChild.insertBefore(node, this._container.firstChild.getElementById('addAlias'));

};
