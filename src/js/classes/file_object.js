'use strict';

var FileObject = function(container, data, parent, beforeItem){

	this._dom = I.template('file').firstChild;
	this._data = data;
	this._data.dom = this;
	this._parent = parent;
	this.selected = false;
	this._domAvatar = this._dom.getElementById('avatarImage');
	this._domAvatar.removeAttribute('id');
	this._domName = this._dom.getElementById('name');
	this._domName.removeAttribute('id');
	this._domProgress = this._dom.getElementById('progress');
	this._domProgress.removeAttribute('id');
	this._domInfo = this._dom.getElementById('info');
	this._domInfo.removeAttribute('id');
	this._domIcon = this._dom.getElementById('icon');
	this._domIcon.removeAttribute('id');
	this._domExtension = this._dom.getElementById('extension');
	this._domExtension.removeAttribute('id');
	this._domSize = this._dom.getElementById('size');
	this._domSize.removeAttribute('id');
	this._domThumbImage = this._dom.getElementById('thumbImage');
	this._domThumbImage.removeAttribute('id');
	this._domSwipePanel = this._dom.getElementById('swipePanel');

	if(I.isDesktop){

		this._domInfoBlock = this._dom.getElementById('infoBlock');
		this._domInfoBlock.removeAttribute('id');
		this._domIconBlock = this._dom.getElementById('iconBlock');
		this._domIconBlock.removeAttribute('id');
		this._domBtnSend = this._dom.getElementById('btnSend');
		this._domBtnSend.removeAttribute('id');
		this._domBtnLink = this._dom.getElementById('btnLink');
		this._domBtnLink.removeAttribute('id');
		this._domBtnView = this._dom.getElementById('btnView');
		this._domBtnView.removeAttribute('id');
		this._domBtnDownload = this._dom.getElementById('btnDownload');
		this._domBtnDownload.removeAttribute('id');
		this._domBtnDelete = this._dom.getElementById('btnDelete');
		this._domBtnDelete.removeAttribute('id');
		this._domLoader = this._dom.getElementById('loader');
		this._domLoader.removeAttribute('id');

	}

	var src = AV.uri(this._data.sender); //avatar image

	if(src){

		this._domAvatar.setAttribute('src', src);
		this._domAvatar.show();
		this._domInfoBlock && this._domInfoBlock.classList.remove('noThumb');

	}else this._domAvatar.remove();

	this._data.id && this._dom.setAttribute('data-id', this._data.id);
	this._data.channelId && this._dom.setAttribute('data-channel', this._data.channelId);
	this._data.messageId && this._dom.setAttribute('data-message', this._data.messageId);
	this._domName.innerHTML = this._data.state === 3 ? l[140] : (app && this._data.state === 0 ? '' : this._data.name);
	this._data.state === 5 && this.icon(false);

	if(!I.isDesktop){

		this._swipe = new Swipe(this._dom, function(){

			var swipeType;
			this.setSelected(false);
			this._swipe.longSwipeFunc = this._delete.bind(this);

			if(this._data.messageId && this._parent.mode !== 1){

				swipeType = 'file readonly';
				this._swipe.longSwipeFunc = null;
				
			}else if([2].indexOf(this._data.state) >= 0 && this._parent.mode === 1){

				swipeType = 'file swipe';

			}else swipeType = 'file swipe not ready';

			var menu = I.template(swipeType), elem;
			elem = menu.getElementById('delete');

			elem && (elem.onclick = function(e){

				e.stopPropagation();
				this._data._stopStreams();
				this._delete();

			}.bind(this));

			elem = menu.getElementById('download');

			elem && (elem.onclick = function(e){

				e.stopPropagation();
				this._swipe.close();
				this._download();

			}.bind(this));

			elem = menu.getElementById('send');

			elem && (elem.onclick = function(e){

				e.stopPropagation();
				W.addElements([], [this._data]);

			}.bind(this));

			return menu;

		}.bind(this), null, 'attach-file-content left');

		this._domSwipePanel.onclick = function(e){

			if(this._parent.mode === 1){

				this._swipe.close();
				this.setSelected(!this.selected);

			}else{

				if(!this._swipe.opened){

					e.preventDefault();
					e.stopPropagation();

				}

				this._swipe.open();

			}

		}.bind(this);

		new LongTouch(this._dom, function(){

			this._swipe.open();

		}.bind(this));

	}else{

		this._dom.onclick = function(e){

			e.stopPropagation();
			this._parent.mode === 1 && this.setSelected(!this.selected);

		}.bind(this);

	}

	if(this._data.thumb && this._domThumbImage){

		I.isDesktop ? this._domIconBlock.remove() : this._domIcon.hide();
		this._domThumbImage.src = this._data.thumb;

	}else{

		this._domThumbImage.remove();
		delete(this._domThumbImage);

	}

	this.state(this._data.state);
	beforeItem ? container.insertBefore(this._dom, beforeItem.dom._dom) : container.appendChild(this._dom);

};

FileObject.prototype._delete = function(){

	this._parent.bulkDelete([this._data]);

};

FileObject.prototype._download = function(viewOnReady){

	if(!I.isDesktop && !app) return D.i([l[345].ucFirst(), l[351].ucFirst() + ' ' + l[357].ucFirst()], [l[102].ucFirst()]);
	if(app && this._parent.activeDownloads()) return window.plugins.toast.showShortTop(l[509].ucFirst()); 
	this._parent.download(this._data, viewOnReady);

};

FileObject.prototype.state = function(){

	this._domSize.innerHTML = bytesToSize(this._data.size) + (this._data.dbSize ? ' / ' + bytesToSize(this._data.dbSize) : '');
	app && this._data.state === 1 && (this._domName.innerHTML = this._data.name);

	if(this._data.state === 1){ //upload state

		this._domThumbImage && this._domThumbImage.hide();
		I.isDesktop && this._domAvatar.hide();
		this.icon(false);
		this.action(l[18], true);

	}else if(this._data.state === 2){ //ready for actions

		this._domThumbImage && this._domThumbImage.show();
		this._domProgress.hide();
		I.isDesktop && this._domAvatar.show();
		this.icon(true);
		this.action(this._data.messageId ? (this._data.sender === U.login() ? l[389] : l[388]) + ' ' + I.dateFormat(this._data.time, 8) : l[78] + ' ' + I.dateFormat(this._data.time, 8));

		this._domBtnDownload && this._domBtnDownload.show();

		var _iconClicked = function(e){

			e.stopPropagation();
			if(this._data.state === 5) return this._data.breakDownload();
			this._download(true);

		}.bind(this);

		this._domIcon.onclick = _iconClicked;
		this._domThumbImage && (this._domThumbImage.onclick = _iconClicked);
		this._domBtnDownload && (this._domBtnDownload.onclick = _iconClicked);

		if(I.isDesktop && this._parent.mode !== 2){

			this._domBtnSend.show();

			this._domBtnSend.onclick = function(e){ //sent

				e.stopPropagation();
				W.addElements([], [this._data]);

			}.bind(this);

		}

	}else if(this._data.state === 3){ //corrupted

		this.icon();
		this.action(this._data._error);
		I.isDesktop ? this._dom.classList.add('corrupted') : this._dom.classList.add('corruptedData');

	}else{

		this.icon(false);
		this.action(l[371]);

	}

	if(I.isDesktop && this._data.channelId){ //delete

		this._domBtnDelete.show();
		this._domBtnDelete.onclick = this._delete.bind(this);

	}

	return true;

};

FileObject.prototype.remove = function(){

	delete(this._data.dom);
	this._dom.remove();
	return true;

};

FileObject.prototype.updateIds = function(){

	this._data.id ? this._dom.setAttribute('data-id', this._data.id) : this._dom.removeAttribute('data-id');
	this._data.channelId ? this._dom.setAttribute('channel-id', this._data.channelId) : this._dom.removeAttribute('channel-id');
	this._data.messageId ? this._dom.setAttribute('message-id', this._data.channelId) : this._dom.removeAttribute('message-id');
	return true;

};

FileObject.prototype.action = function(val, start){

	this._domInfo.innerHTML = val;
	if(typeof start === 'undefined') return true;

	if(start){

		I.isDesktop && this._domAvatar.hide();
		this.icon(false);
		this._domProgress.className = 'progressBar progress-width0';

		if(I.isDesktop){

			this._domProgress.show();
			this._domLoader.show();

		}

	}else if(I.isDesktop){

		this._domProgress.hide();
		this._domLoader.hide();

	}

	return true;

};

FileObject.prototype.progress = function(done, total){

	if(done === -1) return this._domProgress.hide();
	total = total || this._data.size;
	this._domProgress.className = 'progressBar progress-width' + Math.min(100, Math.floor(100 * done / total));
	return true;

};

FileObject.prototype.icon = function(show){

	if(I.isDesktop){ //desktop

		if(typeof show === 'undefined'){

			this._domThumbImage && this._domThumbImage.hide();
			this._domIcon.hide();

		}else if(show){ //show file ext & icon

			this._domLoader.customClear();
			this._domExtension.innerHTML = Z.fileExt(this._data.name);
			this._domIcon.className = 'iconFile icon icon-file-' + Z.fileClass(this._data.name);
			this._domThumbImage ? this._domThumbImage.show() : this._domIconBlock.show();

		}else{ //loader

			if(this._domLoader.innerHTML) return;
			this._domLoader.appendChild(I.template('file loader'));
			this._domThumbImage ? this._domThumbImage.hide() : this._domIconBlock.hide();

		}

	}else{ //mobile

		if(typeof show === 'undefined'){

			this._domIcon.hide();

		}else if(show){ //show file ext & icon

			if(this._domThumbImage){

				this._domIcon.hide();
				this._domThumbImage.show();

			}else{

				this._domIcon.className = 'i i-file-' + Z.fileClass(this._data.name);
				this._domExtension.innerHTML = Z.fileExt(this._data.name);
				this._domIcon.show();

			}

		}else{ //loader

			this._domThumbImage && this._domThumbImage.hide();
			this._domExtension.innerHTML = '';
			this._domIcon.className = 'preloader';
			this._domIcon.show();

		}

	}

	return true;

};

FileObject.prototype.setSelected = function(on){

	this.selected = on;

	if(this.selected){

		if([2, 3].indexOf(this._data.state) < 0 || [1].indexOf(this._parent.mode) < 0){

			this._dom.classList.remove('active');
			return;

		}else{

			this.selected ? this._dom.classList.add('active') : this._dom.classList.remove('active');

		}

	}else this._dom.classList.remove('active');

	this._parent.domOnSelected();

};