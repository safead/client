'use strict';

var RecipientsBlock = function(container, readyFunc, contacts){

	if(!(container instanceof HTMLElement) || !(readyFunc instanceof Function) || !(contacts instanceof Array)) throw new Error(l[362]);
	this._container = container;
	this._readyToSend = readyFunc;
	this._input = this._container.getElementById('recInput');
	this._loader = this._container.getElementById('loader');
	this._recipients = this._container.getElementById('recipients');
	this._recipientsBlock = this._container.getElementById('recipientsBlock');
	this._hintContainer = this._container.getElementById('hintContainer');

	if(

		!(this._input instanceof HTMLElement) ||
		!(this._loader instanceof HTMLElement) ||
		!(this._hintContainer instanceof HTMLElement) ||
		!(this._recipients instanceof HTMLElement)

	) throw new Error(l[362]);

	if(contacts.length){

		this.recipients = contacts;
		this._domRecipientsFill(this.recipients);

	}else this.recipients = [];

	this._recipientsHint = new RecipientsHint(this._hintContainer, I.template('prediction item'), function(contact){

		this._input.value = '';
		this._recip(contact.address);

	}.bind(this));

	this._container.onclick = function(){

		this._input.focus();

	}.bind(this);

	this._input.onfocus = function(){

		this._container.classList.add('active');

	}.bind(this);

	this._input.onblur = function(){

		this._container.classList.remove('active');

		setTimeout(function(){

			this._input.value && this._recip(this._input.value);

		}.bind(this), 200);

	}.bind(this);

	this._input.onkeyup = function(e){

		var value = this._input.value.trim().toLowerCase();

		if(!value){

			W.composeToolsVisibility(true);
			this._readyToSend();
			return this._recipientsHint.hide();

		}

		if(e.keyCode === 32 || e.keyCode === 188){

			W.composeToolsVisibility(true);
			this._hintContainer.customClear();
			this._recip(value);

		}else this._recipientsHint.getHint(e, value, this.recipients.map(function(x){return x.address;})) && (e.keyCode === 13 && this._recip(value)); //predictions

	}.bind(this);

	this._input.onkeydown = function(e){

		if(e.keyCode === 38 || e.keyCode === 40) e.preventDefault();
		if(e.keyCode === 8 && !this._input.value && this.recipients.length) this.recipientDelete(this.recipients[this.recipients.length - 1].id);

	}.bind(this);

};

RecipientsBlock.prototype.focus = function(){

	this._input.focus();

};

RecipientsBlock.prototype._recipientByLogin = function(login){

	for(var i in this.recipients) if(this.recipients[i].address === login) return this.recipients[i];
	return null;

};

RecipientsBlock.prototype._recip = function(address){

	this._recipientsHint.hide();
	this._input.value = '';
	this.recipientsCheck([address]);

};

RecipientsBlock.prototype._loading = function(done){

	done ? this._loader.classList.remove('show') : this._loader.classList.add('show');
	this._recipientsBlock && (this.recipients.length || !done ? this._recipientsBlock.classList.remove('noUsers') : this._recipientsBlock.classList.add('noUsers'));

};

RecipientsBlock.prototype.recipientsCheck = function(recipients){

	this._loading();

	return this._recipientsPrepare(recipients).then(function(newRecipients){

		this._loading(true);
		this._readyToSend(newRecipients, true);

	}.bind(this)).catch(function(e){

		this._loading(true);
		I.e('cCompose.recipientsCheck', e);

	}.bind(this));

};

RecipientsBlock.prototype._recipientsPrepare = function(recipients){

	var i, addresses = [], isExternalMail;

	for(i = recipients.length - 1; i >= 0; i--){

		if(!(recipients[i] = recipients[i].trim().toLowerCase().replace(/[,\s]/g, '').replace('@' + config.domain, ''))) continue;
		if(U.isMe(recipients[i])) continue;

		if(this._recipientByLogin(recipients[i])){

			recipients.splice(i, 1);
			continue;

		}

		if(addresses.indexOf(recipients[i]) >= 0) continue;
		isExternalMail = recipients[i].indexOf('@') >= 0;

		if(isExternalMail ? !checkEmail(recipients[i]) : !checkEmailLogin(recipients[i])){

			D.i([l[72].ucFirst(), l[88].ucFirst() + ' \'' + recipients[i] + '\''], [l[0].ucFirst()]);
			continue;

		}

		addresses.unshift(recipients[i]);

	}

	if(!addresses.length) return Promise.resolve(0);

	return C.getPublicKeys(addresses).then(function(contacts){

		var newRecipients = 0;
		if(contacts === 'cancelled') return newRecipients;

		if(recipients.length === 1 && !contacts.length){

			D.i([l[72].ucFirst(), ' \'' + recipients[0] + '\' - ' + l[87].ucFirst()], [l[0].ucFirst()]);
			return newRecipients;

		}

		for(var i = 0; i < contacts.length; i++){

			if(U.id === contacts[i].uuid) continue;
			this.recipients.push(contacts[i]);
			newRecipients++;
			this._domRecipientAdd(contacts[i]);

		}

		return newRecipients;

	}.bind(this));

};

RecipientsBlock.prototype._domRecipientsFill = function(contacts){

	for(var i = 0; i < contacts.length; i++) this._domRecipientAdd(contacts[i]);

};

RecipientsBlock.prototype._domRecipientAdd = function(contact){

	var df = I.template('compose recipient');
	df.firstChild.setAttribute('id', contact.id);

	var _updateView = function(container){

		if(I.isDesktop){

			if(addrIsInternal(contact.address)){

				container.getElementById('type').classList.add('recipient-mail-blue');
				container.getElementById('nickname').innerHTML = contact.name;

			}else{

				container.getElementById('type').classList.add('recipient-mail-grey');
				container.getElementById('nickname').innerHTML = contact.type ? contact.name : '';

			}

			container.getElementById('address').innerHTML = '&lt;' + addrReal(contact.address) + '&gt;';

		}else{

			container.getElementById('name').innerHTML = contact.name ? contact.name : addrReal(contact.address);
			addrIsInternal(contact.address) || container.firstChild.classList.add('grey');

		}

	};

	var _clickedElem = function(clickedElem){

		switch(clickedElem.getAttribute('id')){

		case 'remove':

			this.recipientDelete(contact.id);
			break;

		case 'copy':

			var textToCopy = addrReal(contact.address);
			(contact.type || addrIsInternal(contact.address)) && (textToCopy = contact.name + ' <' + textToCopy + '>');
			I.copyTextToClipboard(textToCopy);
			break;

		default:

			C.addContact(contact).then(function(newContact){

				if(!newContact) return;

				for(var i = 0; i < this.recipients.length; i++){

					if(this.recipients[i].id !== newContact.id) continue;
					this.recipients[i] = contact = newContact;
					_updateView(document.getElementById(newContact.id));
					return true;

				}

			}.bind(this));

		}

	}.bind(this);

	_updateView(df);

	if(I.isDesktop){ //desktop

		df.firstChild.onclick = function(e){

			new Popup(I.template('compose recipient menu'), e, function(popupNodes){

				var check = C.byId(contact.id);
				check && check.type && popupNodes.getElementById('addToContacts').remove();
				return popupNodes;

			}.bind(this), _clickedElem);

		};

		this._recipients.insertBefore(df, this._loader);

	}else{ //mobile

		new Dropdown(df.firstChild, df.getElementById('actions'), function(dropdownOwner){

			var dropdown = I.template('recipient dropdown'),
				check = C.byId(contact.id);

			if(check && check.type){

				dropdownOwner.classList.add('oneValue');
				dropdown.remove('addToContacts');

			}

			return dropdown;

		}.bind(this), _clickedElem);

		this._recipients.appendChild(df);
		this._inputPlaceholder();
		this._recipientsBlock && this._recipientsBlock.classList.remove('noUsers');

	}

};

RecipientsBlock.prototype.recipientDelete = function(id){

	for(var i = this.recipients.length - 1; i >= 0; i--){

		if(this.recipients[i].id !== id) continue;
		this.recipients.splice(i, 1);
		this._domRecipientDelete(id);
		this._recipientsBlock && !this.recipients.length && this._recipientsBlock.classList.add('noUsers');
		this._inputPlaceholder();
		this._readyToSend(true);
		break;

	}

};

RecipientsBlock.prototype._inputPlaceholder = function(){

	this._input.setAttribute('placeholder', l[this.recipients.length ? 144 : 275].ucFirst());

};

RecipientsBlock.prototype._domRecipientDelete = function(id){

	this._container.getElementById(id).remove();

};

RecipientsBlock.prototype.hasExternalRecipients = function(){

	for(var i = 0; i < this.recipients.length; i++) if(this.recipients[i].address.indexOf('@') >= 0) return true;
	return false;

};

RecipientsBlock.prototype.hasExternalRecipientsNew = function(){

	for(var i = 0; i < this.recipients.length; i++) if(!this.recipients[i].currentKeys.time && this.recipients[i].address.indexOf('@') >= 0) return true;
	return false;

};

RecipientsBlock.prototype.hasInternalRecipients = function(){

	for(var i = 0; i < this.recipients.length; i++) if(addrIsInternal(this.recipients[i].address)) return true;
	return false;

};