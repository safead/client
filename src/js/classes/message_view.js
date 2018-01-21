'use strict';

var MessageView = function(container, data, params){

	if(!(container instanceof HTMLElement) || !(data instanceof cMessage)) throw new Error(l[362]);
	this._container = container;
	this._data = data;
	this._data.view = this;
	this._search = params.regexSearch || [];
	this._dom = I.template('view message item').firstChild;
	this._folderNum = F.byId(this._data.folder, true);
	this._senderEmail = this._data.getSender();
	this._senderName = this._data.getSenderName();
	this._isSent = U.isMe(this._senderEmail);
	this._expanded = false;
	this._isSent  = U.isMe(this._data.getSender());
	this._domFromName = this._dom.getElementById('fromName');
	this._domFromName.removeAttribute('id');
	this._domFromAddress = this._dom.getElementById('fromAddress');
	this._domFromAddress && this._domFromAddress.removeAttribute('id');
	this._domTo = this._dom.getElementById('to');
	this._domTo.removeAttribute('id');
	this._domToArrow = this._dom.getElementById('toArrow');
	this._domToArrow.removeAttribute('id');
	this._domCollapse = this._dom.getElementById('collapse');
	this._domCollapse.removeAttribute('id');
	this._domTTL = this._dom.getElementById('ttl');
	this._domTTL.removeAttribute('id');
	this._domSentTime = this._dom.getElementById('sentTime');
	this._domSentTime.removeAttribute('id');
	this._domAvatar = this._dom.getElementById('senderAvatar');
	this._domAvatar.removeAttribute('id');
	this._domAvatarMulti = this._dom.getElementById('avatarMulti');
	this._domAvatarMulti.removeAttribute('id');
	this._domSenderInitials = this._dom.getElementById('senderInitials');
	this._domSenderInitials && this._domSenderInitials.removeAttribute('id');
	this._domAttaches = this._dom.getElementById('attaches');
	this._domAttaches.removeAttribute('id');
	this._domBtnFiles = this._dom.getElementById('btnFiles');
	this._domBtnFilesBlock = this._dom.getElementById('btnFilesBlock');
	this._domFilesCount = this._dom.getElementById('filesCount');
	this._domFilesSize = this._dom.getElementById('filesSize');
	this._domMessageBody = this._dom.getElementById('messageBody');
	this._domMessageBody.removeAttribute('id');
	this._domHeader = this._dom.getElementById('header');
	this._domActions = this._dom.getElementById('corner');
	this._domActions.removeAttribute('id');
	this._domDetails = this._dom.getElementById('details');
	this._domDetails.removeAttribute('id');
	this._data.isTrash() && this._domActions.classList.add('deleted');
	this._data._domTTL = this._domTTL;
	this._domInfoExpanded = this._dom.getElementById('infoExpanded');
	this._domInfoExpanded.removeAttribute('id');

	var src = AV.uri(this._senderEmail);

	if(src){

		this._domSenderInitials.remove();
		this._domAvatar.setAttribute('src', src);

	}else{

		this._domSenderInitials.innerHTML = firstLetters(this._senderName);
		this._domAvatar.remove();

	}

	var allRecipients = this._data.allTo({myOwn: true});

	for(var i = 0; i < allRecipients.length - 1; i++){

		i || this._domAvatarMulti.classList.add('isLayers');
		this._domAvatarMulti.firstChild ? this._domAvatarMulti.insertBefore(I.template('digest avatar layer'), this._domAvatarMulti.firstChild) : this._domAvatarMulti.appendChild(I.template('digest avatar layer'));

	}

	this._domFromName.classList.add('name-' + this._senderEmail);
	this._domFromName.innerHTML = this._senderName + (this._data.source ? ' [' + this._data.source + ']' : '');
	this._domFromAddress && (this._domFromAddress.innerHTML = addrReal(this._senderEmail));
	this._domTTL.innerHTML = I.dateFormat(this._data.ttl, 3);
	expireSoon(this._data.ttl) && this._domTTL.classList.add('red');
	this._domSentTime.innerHTML = I.dateFormat(this._data.time, 6) + '.';

	if(this._search.length && this._data.search(this._search.map(function(x){ return new RegExp(x, 'img'); }))){ //search keywords found

		this._domHeader.classList.add('active', 'green');

	}else{

		this._data.read || this._domHeader.classList.add('active'); //unread
		this._search = [];

	}

	this._domCollapse.onclick = this._details.bind(this);

	this._domHeader.onclick = function(){

		this._expand();

	}.bind(this);

	this._domDetails.onclick = this._messageActions.bind(this);
	this._domActions.onclick = this._messageActions.bind(this);

	if(this._data.attachesIds || this._data.attaches){

		this._domFilesCount.innerHTML = this._data.attachesIds.length;
		this._domFilesSize.innerHTML = bytesToSize(this._data.attachesSize());
		this._domBtnFiles.onclick = function(){

			this._attaches();

		}.bind(this);

	}else{

		this._domBtnFilesBlock.remove();
		this._domBottomBlock && this._domBottomBlock.remove();
		this._domAttaches.remove();

	}

	this._headerView();
	params.beforeItem ? this._container.insertBefore(this._dom, params.beforeItem.view._dom) : this._container.appendChild(this._dom);
	this._prepareView();
	this._data.group.isLastVisible(this._data) && this._expand(app ? common.transitionSpeed - 100 : 0);

};

MessageView.prototype.remove = function(data){

	this._dom.remove();
	delete(this._dom);
	delete(data.view);
	this._prepareView();
	var i, count = 0;
	for(i = 0; i < this._data.group.messages.length; i++) this._data.group.messages[i].view && this._data.group.messages[i].view._dom.visible() && count++;
	count || I.pageBackward('inbox');

};

MessageView.prototype._prepareView = function(){

	if(I.isDesktop){

		this._data.view && (this._data.isVisible() ? this._data.view._dom.show() : this._data.view._dom.hide());
		return;

	}

	var hidden = 0, lastUnread = 0, minToShow = 3, i, visible = [], expanded = document.getElementById('emailsContainer').getAttribute('data-expanded');

	for(i = 0; i < this._data.group.messages.length; i++){

		if(!this._data.group.messages[i].isVisible()){

			hidden++;
			continue;

		}

		if(!this._data.group.messages[i].view) continue;
		visible.push(this._data.group.messages[i]);
		this._data.group.messages[i].read || (lastUnread = i - hidden);

	}

	minToShow += lastUnread > 1 ? lastUnread - 1 : 0;
	for(i = 0; i < visible.length; i++) expanded || i >= visible.length - 1 || i < minToShow - 1 ? visible[i].view._dom.show() : visible[i].view._dom.hide();
	var domHiddenMessages = document.getElementById('hiddenMessages');
	domHiddenMessages && domHiddenMessages.remove();
	if(expanded || visible.length <= minToShow) return;
	domHiddenMessages = I.template('view message hidden');
	domHiddenMessages.getElementById('hiddenCount').innerHTML = visible.length - minToShow;
	this._container.insertBefore(domHiddenMessages, visible[lastUnread ? lastUnread + 1 : 1].view._dom);
	domHiddenMessages = document.getElementById('hiddenMessages');

	domHiddenMessages.onclick = function(){

		I.clickSound();
		domHiddenMessages.remove();
		document.getElementById('emailsContainer').setAttribute('data-expanded', true);

		for(var i in this._data.group.messages){

			if(!this._data.group.messages[i].isVisible() || !this._data.group.messages[i].view._dom || this._data.group.messages[i].view._dom.visible()) continue;
			this._data.group.messages[i].view._dom.style['opacity'] = 0;
			this._data.group.messages[i].view._dom.show();
			AF.add(this._data.group.messages[i].id, this._data.group.messages[i].view._dom, 0, 1, 1000, 'opacity', null, ' ');

		}

	}.bind(this);

};

MessageView.prototype._messageActions = function(e){

	var _action = function(actionId){

		switch(actionId){

		case 0: //reply

			E.replyToEmail(this._data);
			break;

		case 1: //forward

			E.forwardEmail(this._data);
			break;

		case 2: //move to trash
		case 3: //delete

			E.bulkDelete([this._data]);
			if(!document.getElementById('emailsContainer').innerHTML) return I.pageBackward('inbox');
			E.domPageViewFolders(this._data);
			break;

		case 4: //restore

			E.moveEmails(this._data, this._data.group.originalFolder() || F.folders[0].id).then(function(){

				E.domPageViewFolders(this._data);

			}.bind(this));

			break;

		case 5: //reply all

			E.replyAllEmail(this._data);
			break;

		case 6: //reply all with copies

			E.replyAllEmail(this._data, true);
			break;

		}

	}.bind(this);

	I.clickSound();
	e.stopPropagation();
	e.preventDefault();

	var buttons = [],
		recipients = this._data.recipients(),
		recipientsCopies = this._data.recipientsCopies();

	this._isSent || buttons.push([l[265	].ucFirst(), 0]);
	buttons.push([l[347].ucFirst(), 1]);
	recipients.concat(this._data.getSender()).removeMe().length + recipientsCopies.length > 1 && buttons.push([l['346'].ucFirst(), 5]);
	recipientsCopies.length && buttons.push([l['540'].ucFirst(), 6]);
	buttons.push(this._data.isTrash() ? [l[532].ucFirst(), 2] : [l[61].ucFirst(), 3]);
	this._data.isTrash() && buttons.push([l[468].ucFirst(), 4]);
	I.isDesktop || buttons.push([l[164].ucFirst(), -1]);

	if(I.isDesktop){

		new Popup(I.template('empty popup'), e, function(popupNodes){

			buttons.forEach(function(button){

				var df = I.template('popup item');
				df.getElementById('title').innerHTML = button[0].ucFirst();
				df.firstChild.setAttribute('data-id', button[1]);
				popupNodes.appendChild(df);

			});

			return popupNodes;

		}, function(clickedElem){

			_action(clickedElem);

		});

	}else{

		D.b(buttons, function(clickedId){

			D.h();
			_action(clickedId);

		}.bind(this));

		new LongTouch(this._domHeader, function(){

			this._domActions.click();

		}.bind(this));

	}

};

MessageView.prototype._expand = function(delay){

	var newState = this._data.group.messages.length < 2 || !this._expanded;
	if(this._expanded === newState) return;
	this._expanded = newState;
	this._headerView();

	if(this._expanded){

		this._attaches(true);

		if(this._domMessageBody.getElementById('bodyIframe')){

			this._domMessageBody.style.height = this._bodyHeight;
			this._dom.classList.add('view');

		}else{

			this._dom.classList.add('loading');

			setTimeout(function(){

				new MessageBody(this._domMessageBody, this._data.getBody(), function(height){

					if(!this._expanded) return;
					this._dom.classList.remove('loading');
					this._domMessageBody.style.height = (height + 'px');
					this._dom.classList.contains('view') || this._dom.classList.add('view');
					E.emails.setRead(this._data);
					this._domHeader.classList.contains('green') || this._domHeader.classList.remove('active');
					this._domBtnFilesBlock.show();
					DOM.loader();

				}.bind(this), {search: this._search});

			}.bind(this), delay);

		}

	}else{

		this._dom.classList.remove('view');
		this._bodyHeight = this._domMessageBody.style.height;
		this._domMessageBody.style.height = '0px';

	}

};

MessageView.prototype._headerView = function(){

	if(this._expanded){

		this._domTo.customClear();
		this._domTo.appendChild(this._recipients());
		this._domTo.insertAdjacentHTML('afterbegin', l[81].ucFirst() + ':&nbsp;');
		this._domToArrow.show();
		this._domTo.onclick = this._details.bind(this);

	}else{

		this._domToArrow.hide();
		this._dom.classList.remove('expanded');
		this._domTo.innerHTML = this._data.getDescription();

		this._domTo.onclick = function(e){

			e.stopPropagation();
			this._expand();

		}.bind(this);

	}

};

MessageView.prototype.decreaseUnread = function(){

	var elem = this._dom.getElementById('header');
	elem && elem.classList.remove('active');

};

MessageView.prototype._recipients = function(){

	var container = ''.toDOM(), elem;

	if(this._data.eto){

		for(var i = 0; i < this._data.eto.length; i++){

			elem = document.createTextNode((container.firstChild ? ', ' : '') + (C.nameByAddr(this._data.eto[i]) || addrReal(this._data.eto[i])));
			container.appendChild(elem);

		}

		return container;

	}

	if(this._data.channel){

		var count, address;

		for(i = 0; i < this._data.channel.members.length; i++){ //recipients

			count++;
			address = addrReal(this._data.channel.memberAddress(i));
			if(this._data.channel.memberAddress(i) === this._senderEmail) continue;
			elem = document.createTextNode((container.firstChild ? ', ' : '') + this._data.channel.memberNick(i));
			container.appendChild(elem);

		}

	}else container.appendChild(document.createTextNode(C.nameByAddr(this._data.to)));

	return container;

};

MessageView.prototype._details = function(e){

	I.clickSound();
	e.preventDefault();
	e.stopPropagation();
	if(!this._dom.classList.contains('view')) return this._expand();

	if(this._dom.classList.contains('expanded')){

		this._dom.classList.remove('expanded');
		this._domInfoExpanded.customClear();
		return;

	}

	var df = I.template('view message expanded'),
		domFrom = df.getElementById('from'),
		domTo = df.getElementById('to'),
		domSent = df.getElementById('sent'),
		domTTL = df.getElementById('ttl'),
		domCc = df.getElementById('cc'),
		domCcBlock = df.getElementById('ccBlock'),
		address;

	var _domAddress = function(container, template, address, name, secureLevel){

		var dfIconLock = template.getElementById('iconLock'),
			elem = template.getElementById('to'),
			lockIconStyles = I.isDesktop ? ['i i-unlocked-small', 'i i-locked-yellow-small', 'i i-locked-small'] : ['i i-unlocked-small', 'i i-locked-yellow-small', 'i i-locked-small'];

		elem.removeAttribute('id');
		elem.innerHTML = addrReal(address);
		container.appendChild(template);
		secureLevel >= 0 ? dfIconLock.className = lockIconStyles[secureLevel] : dfIconLock.remove();
		name && address !== name && elem.insertAdjacentHTML('afterend', ' - ' + name);
		this._emailActions(address, elem);

	}.bind(this);

	_domAddress(domFrom, I.template('view message expanded from'), this._senderEmail, this._senderName, this._isSent ? -1 : (this._data.source ? 1 : C.secureLevel(this._senderEmail)));

	if(this._data.eto){

		for(var i = 0; i < this._data.eto.length; i++) _domAddress(domTo, I.template('view message expanded to'), this._data.eto[i], C.nameByAddr(this._data.eto[i]), this._isSent ? C.secureLevel(this._data.eto[i]) : -1);

	}else{

		if(this._data.channel){

			for(i = 0; i < this._data.channel.members.length; i++){

				address = this._data.channel.memberAddress(i);
				if(address === this._senderEmail) continue;
				_domAddress(domTo, I.template('view message expanded to'), address, this._data.channel.memberNick(i), this._isSent ? C.secureLevel(address) : -1);

			}

		}else{

			_domAddress(domTo, I.template('view message expanded to'), this._data.to, C.nameByAddr(this._data.to), this._isSent ? C.secureLevel(this._data.to) : -1);

		}

	}

	domSent.innerHTML = I.dateFormat(this._data.time, 4);
	domTTL.innerHTML = I.dateFormat(this._data.ttl, 7);
	this._domInfoExpanded.customClear();
	this._domInfoExpanded.appendChild(df);

	if(this._data.ecc){

		for(i = 0; i < this._data.ecc.length; i++) _domAddress(domCc, I.template('view message expanded to'), this._data.ecc[i], C.nameByAddr(this._data.ecc[i]), this._isSent ? C.secureLevel(this._data.ecc[i]) : -1);

	}else domCcBlock.remove();

	this._dom.classList.add('expanded');

};

MessageView.prototype._emailActions = function(address, elem){

	if(U.isMe(address)) return;

	var _action = function(actionId){

		switch(actionId){

		case 0: //new message

			W.new([address]);
			break;

		case 1: //copy to clipboard

			I.copyTextToClipboard(addrReal(address));
			break;

		case 2: //add to contacts

			C.addContact(new cContact(address));
			break;

		}

	}.bind(this);

	var _clicked = function(e){

		I.clickSound();

		if(e){

			e.stopPropagation();
			e.preventDefault();

		}

		var buttons = [[l[72].ucFirst(), 0], [l[303].ucFirst(), 1]], contact = C.byAddress(address);
		(!contact || !contact.type) && buttons.push([l[186].ucFirst(), 2]/*, l[109].ucFirst()*/);

		if(I.isDesktop){

			new Popup(I.template('empty popup'), e, function(popupNodes){

				buttons.forEach(function(button){

					var df = I.template('popup item');
					df.getElementById('title').innerHTML = button[0].ucFirst();
					df.firstChild.setAttribute('data-id', button[1]);
					popupNodes.appendChild(df);

				});

				return popupNodes;

			}, function(clickedElem){

				_action(clickedElem);

			});

		}else{

			buttons.push([l[164].ucFirst(), -1]);

			D.b(buttons, function(clickedId){

				D.h();
				_action(clickedId);

			});

		}

	};

	elem.onclick = _clicked;
	I.isDesktop || new LongTouch(elem, _clicked);

};

MessageView.prototype._attaches = function(show){

	show ? this._domBtnFiles.classList.add('opened') : this._domBtnFiles.classList.toggle('opened');

	if(this._domBtnFiles.classList.contains('opened')){

		this._getAttaches();

	}else{

		this._domAttaches.customClear();
		this._domAttaches.hide();

	}

};

MessageView.prototype._getAttaches = function(){

	if(!this._data.attachesIds) return;

	if(this._data.attaches && this._data.attaches.files.length){

		this._domAttaches.classList.remove('loading');
		this._domAttaches.show();
		this._data.attaches.domFill(this._domAttaches, -1);
		return Promise.resolve(this._data.attaches);

	}

	this._domAttaches.classList.add('loading');
	this._domAttaches.show();

	return this._data.getAttaches().then(function(){

		this._domAttaches.classList.remove('loading');
		this._data.attaches.domFill(this._domAttaches, -1);

	}.bind(this)).catch(function(){

		D.i([l[50].ucFirst(), l[329].ucFirst()], [l[0].ucFirst()]);

	});

};