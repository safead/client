'use strict';

var MessageDigest = function(container, group, beforeItem){

	this._dom = I.template('digest').firstChild;
	this.selected = false;
	this._domFrom = this._dom.getElementById('from');
	this._domFrom.removeAttribute('id');
	this._domSubject = this._dom.getElementById('subject');
	this._domSubject.removeAttribute('id');
	this._domDescription = this._dom.getElementById('description');
	this._domDescription.removeAttribute('id');
	this._domSent = this._dom.getElementById('sent');
	this._domSent.removeAttribute('id');
	this._domStarred = this._dom.getElementById('starred');
	this._domStarred.removeAttribute('id');
	this._domAvatar = this._dom.getElementById('avatar');
	this._domAvatar.removeAttribute('id');
	this._domAvatarMulti = this._dom.getElementById('avatarMulti');
	this._domAvatarMulti.removeAttribute('id');

	if(I.isDesktop){

		this._domCheckbox = this._dom.getElementById('checkbox');
		this._domCheckbox.removeAttribute('id');
		this._domStarredBlock = this._dom.getElementById('starredBlock');
		this._domStarredBlock.removeAttribute('id');

	}else{

		this._domSenderInitialsBlock = this._dom.getElementById('senderInitialsBlock');
		this._domSenderInitialsBlock.removeAttribute('id');
		this._domSenderInitials = this._dom.getElementById('senderInitials');
		this._domSenderInitials.removeAttribute('id');
		this._domStarredIco = this._dom.getElementById('starredIco');
		this._domStarredIco.removeAttribute('id');

	}

	beforeItem ? container.insertBefore(this._dom, beforeItem._dom) : container.appendChild(this._dom);
	this.assign(group);
	return true;

};

MessageDigest.prototype.assign = function(group){

	this._group = group;
	this._isTrash = this._group.isTrashOnly();
	this._updateView();
	this._updateViewGroup();
	return true;

};

MessageDigest.prototype.setSelected = function(selected){

	this.selected = selected || false;
	I.isDesktop ? (this._domCheckbox.checked = this.selected) : (this.selected ? this._domAvatarMulti.classList.add('check') : this._domAvatarMulti.classList.remove('check'));
	return true;

};

MessageDigest.prototype.decreaseUnread = function(){

	var elem = this._dom.getElementById('countNew');
	if(!elem) return;
	var val = parseInt(elem.innerHTML);
	--val ? elem.innerHTML = val : elem.remove();

};

MessageDigest.prototype.remove = function(){

	this._swipe && this._swipe.remove();
	this._dom && this._dom.customClear();

};

MessageDigest.prototype.domUpdateStarred = function(checked){

	checked = checked || false;
	I.isDesktop ? this._domStarred.checked = checked : (checked ? this._domStarredIco.classList.add('active') : this._domStarredIco.classList.remove('active'));
	return true;

};

MessageDigest.prototype._updateView = function(){

	var i, data, ttl;

	for(i = 0; i < this._group.messages.length; i++){

		if(navState.page[1] !== 3 && this._group.messages[i].isTrash()) continue;
		data = this._group.messages[i];
		break;

	}

	ttl = Math.round(((new Date(data.ttl * 1000) - Date.now()) / 1000));
	data.domTTL = this._dom.getElementById('ttl');

	var _delete = function(){

		E.bulkDelete(this._group.messages.map(function(x){ return x; })).then(function(result){

			result || this._swipe.close();

		}.bind(this));

	}.bind(this);

	this._domSent.innerHTML = I.dateFormat(data.time, I.isDesktop ? 2 : 0); //sent time
	expireSoon(ttl) && data.domTTL.classList.add('red'); //ttl
	data.domTTL.innerHTML = I.dateFormat(data.ttl, 3);

	(I.isDesktop ? this._domCheckbox : this._domAvatarMulti).onclick = function(e){

		I.clickSound();
		e.stopPropagation();
		this.setSelected(!this.selected);
		E.domBulkTools();

	}.bind(this);

	if(data.corrupted){ //corrupted message

		this._domSubject.innerHTML = l[140];
		this._domSubject.classList.add('red');
		this._domAvatar.remove();
		(I.isDesktop ? this._domStarredBlock : this._domStarred).remove();

		if(I.isDesktop){

			this._dom.classList.add('message-corrupted');
			this._domAvatarMulti.classList.add('message-table-item-avatar-error');

		}

	}else{

		var sender = data.getSender(),
			senderName = data.getSenderName(),
			firstRecipient = data.firstRecipient(),
			isSent = U.isMe(sender),
			initials = firstLetters(isSent ? firstRecipient : senderName);

		this._domFrom.innerHTML = isSent /*sent or draft folders*/ ? data.allTo({preferNames: true}).join(', ') : senderName;
		this._domSubject.innerHTML = data.getSubject().ucFirst() || '(' + l[522].ucFirst() + ')'; //subject
		this._domDescription.innerHTML = data.getDescription().ucFirst(); //description
		var src = firstRecipient ? AV.uri(firstRecipient) : ''; //avatar image

		if(src){

			this._domAvatar.setAttribute('src', src);
			this._domSenderInitialsBlock && this._domSenderInitialsBlock.hide();
			this._domAvatar.show();
	
		}else{

			this._domAvatar.hide();
			this._domSenderInitialsBlock && this._domSenderInitialsBlock.show();
			this._domSenderInitials && (this._domSenderInitials.innerHTML = initials);

		}
		
		this._dom.onclick = function(){ //link

			if(!I.canAct()) return;
			I.domRememberTopScroll();
			I.changePage(F.byId(data.folder, true) === 2 ? 'compose/' + data.id : 'message/' + F.byId(data.folder, true) + '/' + data.id);

		}.bind(this);

		this.domUpdateStarred(this._group.starred);

		this._isTrash ? this._domStarred.hide() : this._domStarred.onclick = function(e){

			I.clickSound();
			e.stopPropagation();
			E.starredGroupsChange(this._group, !this._group.starred);
			E.domBulkTools();
			this._swipe && this._swipe.close();

		}.bind(this);

	}

	if(I.isDesktop || this._swipe) return true;

	this._swipe = new Swipe(this._dom, function(){

		var elem, prefix = F.haveCustomFolders() || navState.page[1] === 3 ? ' move' : '',
			menu = I.template([1, 2].indexOf(F.byId(data.folder, true)) >= 0 ? 'digest swipe my own' : 'digest swipe' + prefix);
		data.corrupted && (menu = I.template('digest swipe my own'));

		elem = menu.getElementById('delete');

		elem && (elem.onclick = function(e){

			e.stopPropagation();
			_delete();

		}.bind(this));

		elem = menu.getElementById('move');

		elem && (elem.onclick = function(e){

			e.stopPropagation();
			this._swipe.close(false, true);

			E.moveEmails(this._group.messages.map(function(x){ return x; })).then(function(){

				I.pageBackward('inbox');

			});

		}.bind(this));

		elem = menu.getElementById('reply');

		elem && (elem.onclick = function(e){

			e.stopPropagation();
			this._swipe.close();
			E.replyToEmailMobile(data);

		}.bind(this));

		elem = menu.getElementById('spam');

		elem && (elem.onclick = function(e){

			e.stopPropagation();
			this._swipe.close();
			E.spamEmailGroup.call(this._group);

		}.bind(this));

		return menu;

	}.bind(this), _delete, data.read ? 'attach-file-content delivered left' : 'attach-file-content left');

	new LongTouch(this._dom, function(){

		this._swipe.open();

	}.bind(this));

};

MessageDigest.prototype._updateViewGroup = function(){

	var data = this._group.messages[0],
		domCountNew = this._dom.getElementById('countNew'),
		domCountTotal = this._dom.getElementById('countTotal'),
		domAttaches = this._dom.getElementById('attaches'),
		domAttachesInfo = this._dom.getElementById('attachesInfo'),
		countNew = 0, countTotal = 0, countFiles = 0;

	if(data.corrupted){ //corrupted message

		domCountNew.remove();
		domCountTotal.remove();

	}else{

		var count = this._group.allMembers(true).length - 1;

		if(!I.isDesktop && count){

			var currentLayers = this._domAvatarMulti.getAttribute('layers') || 0;
			currentLayers && (currentLayers = parseInt(currentLayers));

			if(count !== currentLayers){

				for(i = 0; i < count - currentLayers; i++){ //multiply recipients

					i || this._domAvatarMulti.classList.add('isLayer');
					this._domAvatarMulti.insertBefore(I.template('digest avatar layer'), this._domSenderInitialsBlock);

				}

				this._domAvatarMulti.setAttribute('layers', count);

			}

		}

		for(var i in this._group.messages){

			if(navState.page[1] !== 3 && this._group.messages[i].isTrash()) continue; //skip trash items
			countTotal++;
			this._group.messages[i].read || countNew++;
			this._group.messages[i].attachesIds && (countFiles += this._group.messages[i].attachesIds.length);

		}

		if(countNew){

			domCountNew.innerHTML = countNew;
			domCountNew.show();

		}else domCountNew.hide();

		if(countTotal > 1 && countTotal !== countNew){

			domCountTotal.innerHTML = countTotal;
			domCountTotal.show();

		}else domCountTotal.hide();

		if(countFiles){

			I.isDesktop ? domAttaches.vis() : domAttaches.show();
			domAttachesInfo && (domAttachesInfo.innerHTML = countFiles + ' ' + I.countableWord(countFiles, [l[262], l[263], l[264], l[274]]).ucFirst());

		}

	}

};