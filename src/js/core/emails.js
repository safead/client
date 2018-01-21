'use strict';

function cEmails(){

	var self = this;
	self.emails = new cMessages();
	self.groups = new MessageGroups();
	self._viewport = [];
	self._waitKeys = {rsa: [], channels: []};
	self._toMove = [];
	self._activeGroup = null;
	self.waitingForMessageId = '';
	self._container = null;
	self._domTTLTimeout = 0;
	self._search = null;
	self._firstLoad = true;
	self._decoding = false;

	self.domInit = function(){

		self._container = null;
		self._defineSearch();
		if(!self._search && (typeof navState.page[1] !== 'number' || !F.folders[navState.page[1]])) return I.changePage('inbox/0');
		var title = self._search ? '"' + navState.search.join(' ') + '"' : F.folders[navState.page[1]].title.ucFirst();
		I.pageTitle(config.domain.ucFirst() + ' - ' + title);
		app && ((I.isDesktop ? document.body : DOM.contentBody).scrollTop = 0);

		if(I.isDesktop){

			DOM.title(title, document.getElementById('topPanel'));

		}else{

			self._search ? DOM.backButton(true) : DOM.backButton();
			DOM.titleM(title);
			self._domPrepareToolsM();

		}

		self._domPrepareSearch();
		self._search || I.search();
		for(var i = self.emails.items.length - 1; i >= 0; i--) self._viewportAdd(self.emails.items[i]);
		self.loadEmails(self._search || [4].indexOf(navState.page[1]) >= 0 ? '' : F.folders[navState.page[1]].id, true);

	};

	self._loadComplete = function(){

		self.groups.syncStarred();
		navState.page[0] === 'inbox' && !self._viewport.length && (I.isDesktop ? self._domEmpty() : self._domEmptyM());
		var elem = document.getElementById('preLoaderBottom');
		elem && elem.remove();

		if(history.state.pos < myHistory.length - 1 && navState.scrollTop){

			((I.isDesktop ? document.body : DOM.contentBody).scrollTop = navState.scrollTop || 0);
			I.domRememberTopScroll(0);

		}

	};

	self._defineSearch = function(){

		if(navState.page[1] === 'search'){

			self._search = [];
			for(var i in navState.search) self._search.push(new RegExp(navState.search[i], 'im'));

		}else self._search = null;

	};

	self.loadEmails = function(folderId, loader){

		return self._get(folderId, loader).then(function(result){

			if(result === 'cancelled') return;
			return self.processIncoming({actionIs: history.state.pos, folderId: folderId, emails: result.emails, loader: loader});

		});

	};

	self.loadFreshEmails = function(folderId){

		var foldersToUpdate = {};
		foldersToUpdate[folderId] = self.emails.getYoungest(folderId);

		return A.emailsGetByFolder(foldersToUpdate).then(function(result){

			if(result === 'cancelled') return;
			return self.processIncoming({folderId: folderId, emails: result.emails});

		});

	};

	self._loadExactEmails = function(foldersToUpdate){

		return A.emailsGetByFolder(foldersToUpdate).then(function(result){

			if(result === 'cancelled') return;
			return self.processIncoming({emails: result.emails, movedEmails: true});

		});

	};

	self._get = function(folderId, loader){

		if(!U.access(1)) return;
		var foldersToUpdate = {};

		if(!folderId){ //all emails

			if(self.emails.haveAll()) return Promise.resolve(true);
			foldersToUpdate['*'] = {items: self.emails.allIds()};

		}else{ //emails from current folder

			if(!self.emails.haveAllForFolder(F.folders[1].id)){ //sent

				foldersToUpdate[F.folders[1].id] = self.emails.getOldest(F.folders[1].id);

			}

			if(self._firstLoad && F.haveUnsorted()) foldersToUpdate['@'] = {items: []};
			self._firstLoad = false;

			if(!self.emails.haveAllForFolder(folderId)){

				foldersToUpdate[folderId] = self.emails.getOldest(folderId);

			}else if(objectIsEmpty(foldersToUpdate)) return Promise.resolve(true); //nothing to download

		}

		loader && !self._viewport.length && I.inMessages() && DOM.loader(l[29], 0);

		return (A.emailsGetByFolder(foldersToUpdate, common.messagesInBlock));

	};

	self.processIncoming = function(params){

		if(!params.emails){

			objectIsEmpty(self.emails.encrypted) && self._loadComplete();
			return;

		}

		var _keyReady = function(id, decryptor){

			for(var i in self.emails.encrypted) for(var j in self.emails.encrypted[i]) if(

				(decryptor instanceof cChannel && self.emails.encrypted[i][j].channel === id) || 
				self.emails.encrypted[i][j].rsaId === id

			) self.emails.encrypted[i][j].decryptor = decryptor;

		};

		var i, j, x, folderId, encryptorId, decryptor, message, found, channelIds = [], rsaIds = [];

		for(folderId in params.emails){

			for(encryptorId in params.emails[folderId]){

				if(!params.emails[folderId][encryptorId][0]) continue;

				if(params.emails[folderId][encryptorId][0].z){

					decryptor = U.keyIdByUuid(encryptorId);

					if(!decryptor && self._waitKeys.rsa.indexOf(encryptorId) < 0){

						self._waitKeys.rsa.push(encryptorId);
						rsaIds.push(encryptorId);

					}

				}else{

					decryptor = X.channelForId(encryptorId);

					if(!decryptor && self._waitKeys.channels.indexOf(encryptorId) < 0){

						self._waitKeys.channels.push(encryptorId);
						channelIds.push(encryptorId);

					}

				}

				for(i in params.emails[folderId][encryptorId]){

					if(self.emails.byId(params.emails[folderId][encryptorId][i].i)) continue;

					if(self.emails.encrypted[folderId]){

						found = false;

						for(x in self.emails.encrypted[folderId]) if(self.emails.encrypted[folderId][x].id === params.emails[folderId][encryptorId][i].i){

							found = true;
							break;

						}

						if(found) continue;

					}else self.emails.encrypted[folderId] = [];

					self.emails.encrypted[folderId] || (self.emails.encrypted[folderId] = []);
					message = new cMessage();
					message.folder = folderId;
					message.id = params.emails[folderId][encryptorId][i].i;
					message.time = params.emails[folderId][encryptorId][i].t;
					message.size = params.emails[folderId][encryptorId][i].s;
					message.read = params.emails[folderId][encryptorId][i].r;
					message.starred = params.emails[folderId][encryptorId][i].x;
					message.ttl = params.emails[folderId][encryptorId][i].l;
					message.encoded = params.emails[folderId][encryptorId][i].d;
					params.movedEmails && (message.moved = true);
					params.emails[folderId][encryptorId][0].z ? message.rsaId = encryptorId : message.channel = encryptorId;
					decryptor && (message.decryptor = decryptor);
					self.emails.encrypted[folderId].splice(arrayIndexProperty(self.emails.encrypted[folderId], 0, self.emails.encrypted[folderId].length - 1, message.time, 'time')[1], 0, message);

				}

			}

		}

		I.inInbox() && !I.inStarred() && !I.inSearch() && !self.emails.encrypted['@'] && !self.emails.encrypted[F.folders[navState.page[1]].id] && self._loadComplete();

		X.prepareChannels(channelIds, rsaIds).then(function(result){

			if(result === 'cancelled') return;

			for(i in rsaIds){

				j = self._waitKeys.rsa.indexOf(rsaIds[i]);
				self._waitKeys.rsa.splice(j, 1);
				_keyReady(rsaIds[i], U.keyIdByUuid(rsaIds[i]));

			}

			for(i in channelIds){

				j = self._waitKeys.channels.indexOf(channelIds[i]);
				self._waitKeys.channels.splice(j, 1);
				_keyReady(channelIds[i], result[channelIds[i]]);

			}

			AV.get(X.allMembers()).then(function(){

				self.decryptNext();

			});

		});

		message && params.folderId && self.loadEmails(params.folderId);

	};

	self.decryptNext = function(){

		if((app && app.paused) || self._decoding) return;

		var _firstForDecryption = function(folderId, youngerThenMessage){

			var i, youngerThen = youngerThenMessage ? youngerThenMessage.time : 0;

			for(i = self.emails.encrypted[folderId].length - 1; i >= 0; i--){

				if(!self.emails.encrypted[folderId][i].decryptor) continue;
				return !youngerThen || self.emails.encrypted[folderId][i].time > youngerThen ? self.emails.encrypted[folderId][i] : youngerThenMessage;

			}

			return null;

		};

		var i, nextToDecrypt = null, priorityFolder = I.inMessages() && !I.inSearch() && !I.inStarred() ? F.folders[navState.page[1]].id : null;

		self.emails.encrypted['@'] && (nextToDecrypt = _firstForDecryption('@'));

		if(!nextToDecrypt && priorityFolder){

			self.emails.encrypted[priorityFolder] && (nextToDecrypt = _firstForDecryption(priorityFolder));
			self.emails.encrypted[F.folders[1].id] && (nextToDecrypt = _firstForDecryption(F.folders[1].id, nextToDecrypt));

		}

		if(!nextToDecrypt) for(i in self.emails.encrypted){

			nextToDecrypt = _firstForDecryption(i);
			if(nextToDecrypt) break;

		}

		if(!nextToDecrypt){

			(I.inSearch() || I.inStarred()) && self.emails.haveAll() && self._loadComplete();
			return;

		}

		var _decoded = function(message){

			try{
			
				self._viewportAdd(self.groups.addMessage(self.emails.add({

					id: message.id,
					folder: message.folder,
					time: message.time,
					size: message.size,
					read: message.read,
					starred: message.starred,
					ttl: message.ttl,
					moved: message.moved,
					channel: message.channel,
					rsaId: message.rsaId,

				}).copy(message)));

			}catch(e){

				I.e('E.decryptNext._decoded', e);
	
			}

		};

		self._decoding = true;

		nextToDecrypt.decode().then(function(message){

			var folder = message.folder;

			if(message.folder === '@'){ //sort by folders

				if(!message.corrupted){

					message.folder = C.senderFolder(message.getSender(), message.source || ''); //sort by sender (priority)
					message.folder = message.folder === F.folders[0].id ? U.aliasFolder(message.channel ? message.channel.getMyRecipient() : message.to) : message.folder; //sort by alias

				}else message.folder = F.folders[0].id;

				self._toMove.push(message);
				F.increaseTotal(message.folder);
				F.increaseUnread(message.folder);

			}else _decoded(message);

			for(var i = self.emails.encrypted[folder].length - 1; i >= 0; i--){ //remove from encoded

				if(self.emails.encrypted[folder][i] !== message) continue;
				self.emails.encrypted[folder].splice(i, 1);

				if(!self.emails.encrypted[folder].length){

					if(folder === '@'){

						if(self._toMove.length){

							self.move(self._toMove.map(function(x){ return [x.id, '@', x.folder]; })).then(function(){

								var readyMessages = self._toMove;
								self._toMove = [];
								readyMessages.forEach(function(x){ _decoded(x); });
								objectIsEmpty(self.emails.encrypted) && self._loadComplete();

							});

						}

					}else if(F.byId(folder, true) === navState.page[1]) self.emails.haveAllForFolder(folder) && self._loadComplete();

					delete(self.emails.encrypted[folder]);

				}

				break;

			}

			self._decoding = false;
			self.decryptNext();
		
		}).catch(function(e){
	
			self._decoding = false;
			I.e('E.decryptNext.nextToDecrypt.decode', e);
	
		});

	};

	self._viewportAdd = function(data){

		if(!I.inMessages()) return;

		var pos, inInbox = I.inInbox(),
			inMessageView = I.inMessageView(),
			inStarred = I.inStarred(),
			currentFolder = self._search ? null : F.folders[navState.page[1]].id;

		if(self.waitingForMessageId && !self._activeGroup && self.waitingForMessageId === data.id){

			self._activeGroup = data.group;
			for(var i = 0; i < self._activeGroup.messages.length; i++) if(self._activeGroup.messages[i] !== data && self._activeGroup.messages[i].folder !== currentFolder) self._viewportAdd(self._activeGroup.messages[i]);

		}

		if(

			(self.waitingForMessageId && data.group !== self._activeGroup) ||
			(!self._search && !currentFolder) || //wrong uri
			(inStarred && !data.group.starred) || //starred only
			(!inMessageView && self._search && !data.search(self._search)) //search failed

		) return false;

		if(inInbox && !inStarred && !self._search && data.folder !== currentFolder) return false;
		self._viewport.length || (inInbox ? self._domPreparePage() : self._domPreparePageView(data));
		self._container || (self._container = document.getElementById('emailsContainer'));
		if(!self._container) return;

		if(data.group.digest){

			data.group.digest.assign(data.group);

		}else{

			if(inMessageView){ //message view

				if(!data.isVisible()) return false;
				pos = self._getPositionMessage(data, I.isDesktop ? -1 : 1);
				if(!pos[0][0]) return;
				self._domPageViewUpdate(data);

				new MessageView(

					self._container,
					data,

					{
						expanded: self.waitingForMessageId === data.id,
						beforeItem: self._viewport.length && pos[0][1] < self._viewport.length && self._viewport[pos[0][1]].d.view ? self._viewport[pos[0][1]].d : null,
						regexSearch: navState.search

					}

				);

				self._viewport.splice(pos[0][1], 0, {v: pos[1], d: data});

			}else{

				pos = self._getPositionGroup(data.group, navState.sort);
				if(!pos[0][0]) return;

				data.group.digest = new MessageDigest(

					self._container,
					data.group,
					self._viewport.length && pos[0][1] < self._viewport.length ? self._viewport[pos[0][1]].d.digest : null

				);

				self._viewport.splice(pos[0][1], 0, {v: pos[1], d: data.group});

			}

		}

		L && inInbox && !self._toMove.length && DOM.loader();
		return true;

	};

	self.byId = function(id){

		return self.emails.byId(id);

	};

	self._getPositionGroup = function(group, sortBy){

		var val;

		switch(Math.abs(sortBy)){

		case 1:

			val = group.messages[0].time;
			break;

		case 2:

			val = group.starred ? 1 : 0;
			break;

		case 3:

			val = group.hasAttaches() ? 1 : 0;
			break;

		case 4:

			val = U.isMe(group.messages[0].getSender()) ? group.messages[0].allTo({preferNames: true}).join(', ') : group.messages[0].getSenderName();
			break;

		case 5:

			val = group.messages[0].subject ? group.messages[0].subject.toLowerCase() : '';
			break;

		case 6:

			val = group.messages[0].ttl;
			break;

		default:

			return;

		}

		return [sortBy > 0 ? arrayIndexProperty(self._viewport, 0, self._viewport.length - 1, val, 'v') : arrayIndexPropertyInverse(self._viewport, 0, self._viewport.length - 1, val, 'v'), val];

	};

	self._getPositionMessage = function(data, sortBy){

		var val = data.time;
		return [sortBy > 0 ? arrayIndexProperty(self._viewport, 0, self._viewport.length - 1, val, 'v') : arrayIndexPropertyInverse(self._viewport, 0, self._viewport.length - 1, val, 'v'), val];

	};

	self.viewportRemove = function(items){

		if(!items) return;
		items instanceof Array || (items = [items]);
		var i, j, isGroup = items[0] instanceof MessageGroup;

		for(i = 0; i < items.length; i++){

			if(isGroup && !items[i].digest) continue;

			for(j = self._viewport.length - 1; j >= 0; j--){

				if(self._viewport[j].d !== items[i]) continue;
				isGroup ? items[i].removeDigest() : items[i].view.remove(items[i]);
				self._viewport.splice(j, 1);
				self._viewport.length || (I.isDesktop ? self._domEmpty() : self._domEmptyM());
				return;

			}

		}

	};

	self._filter = function(keywords){

		var i, folderId = navState.page[1] === 'search' || navState.page[1] === 4 ? null : F.folders[navState.page[1]].id,
			inStarred = navState.page[1] === 4;

		I.filter = keywords.map(function(x){ return x; });
		if(navState.search.length) for(i in navState.search) if(I.filter.indexOf(navState.search[i]) < 0) I.filter.push(navState.search[i]);
		var regex = I.filter.map(function(x){ return new RegExp(x, 'im'); });

		self.groups.asArray().forEach(function(group){

			for(i in group.messages){

				if((folderId && group.messages[i].folder !== folderId) || (inStarred && !group.messages[i].starred)) continue;

				if(group.messages[i].search(regex)){

					self._viewportAdd(group.messages[i], true);
					break;

				}else self.viewportRemove(group.messages[i].group);

			}

		});

	};

	self.move = function(arr, params){

		var i, data, inMessageView = I.inMessageView();
		params = params || {};

		if(params.moveAll){ //move all messages from one folder to another

			for(i in self.emails.items) self.emails.items[i].folder === params.moveAll[0] && self._changeFolder(self.emails.items[i], params.moveAll[1], navState.page[1]);

		}else{ //move to the folder message by message

			for(i = arr.length - 1; i >= 0; i--){

				data = self.emails.byId(arr[i][0]);

				if(arr[i][1] === arr[i][2]){

					arr.splice(i, 1);
					continue;

				}

				if(!data || arr[i][1] === '@') continue;
				self._changeFolder(data, arr[i][2], navState.page[1]);
				self.viewportRemove(inMessageView ? data : data.group);
				params.noInsert || self._viewportAdd(data);

			}

			if(!arr.length) return Promise.resolve(true);

		}

		return A.emailsMove(params.moveAll ? params.moveAll : arr, params.trash).then(function(result){

			if(result === 'cancelled') return;
			params.moveAll && F.byId(params.moveAll[1], true) === navState.page[1] && !self.haveAllFromFolder(params.moveAll[1]) && DOM.inbox();

		});

	};

	self._delete = function(emails, params){

		emails instanceof Array || (emails = [emails]);
		params = params || {};
		var i, j, files = [], inMessageView = I.inMessageView();

		for(i in emails){

			for(j = self.emails.items.length - 1; j >= 0; j--){

				if(self.emails.items[j] !== emails[i]) continue;

				if(emails[i].attachesIds && !params.local){ //delete attaches

					FS.removeMessageIds(emails[i].id, emails[i].attachesIds.map(function(x){ return x[0]; }));

					emails[i].attachesIds.map(function(x){

						files.push([x[0], emails[i].channel ? emails[i].channel.id : emails[i].rsaId, emails[i].id, x[1]]);

					});

				}

				self.emails.items.splice(j, 1);
				self.groups.removeMessages(emails[i]);
				self.viewportRemove(inMessageView ? emails[i] : emails[i].group);
				break;

			}

		}

		self.domBulkTools();
		if(params.local) return Promise.resolve(true);

		return A.emailsDelete(

			emails.map(function(x){ 

				x.read || F.decreaseUnread(x.folder);
				F.decreaseTotal(x.folder);
				return params.spam ? [x.folder, x.channel ? x.channel.id : x.rsaId, x.id, x.getSender()] : [x.folder, x.channel ? x.channel.id : x.rsaId, x.id];

			}), files

		).then(function(result){

			if(result === 'cancelled') return;
			FS.domStats();

		});

	};

	self.free = function(){

		clearTimeout(self._domTTLTimeout);
		self._viewport = [];
		self._container = null;
		self.waitingForMessageId = '';
		self._activeGroup = null;

		for(var i in self.emails.items){

			delete(self.emails.items[i].view);
			delete(self.emails.items[i].domTTL);

		}

		self.groups.resetView();

	};

	self.removeWithFolderId = function(folderId){

		for(var i = self.emails.items.length - 1; i >= 0; i--){

			if(self.emails.items[i].folder !== folderId) continue;
			self.emails.items.splice(i, 1);

		}

	};

	self._changeFolder = function(data, folderId){

		if(data.folder === folderId) return;
		data.read || F.decreaseUnread(data.folder);
		F.decreaseTotal(data.folder);
		data.folder = folderId;
		F.increaseTotal(data.folder);
		!data.read && F.byId(data.folder, true) !== 3 && F.increaseUnread(data.folder);
		data.moved = true;

	};

	self._domEmpty = function(){

		if(['inbox'].indexOf(navState.page[0]) < 0) return false;

		self._container = null;
		var container = document.getElementById('contentBody');
		container.getElementById('emailsTableContainer').customClear();
		if(container.getElementById('emptyFolder')) return;
		container.appendChild(I.template('empty folder'));
		container.getElementById('selectorBlock').hide();
		self.domBulkTools();
		DOM.loader();
		return true;

	};

	self._domEmptyM = function(){

		if(['inbox'].indexOf(navState.page[0]) < 0) return false;

		self._container = null;
		var container = document.getElementById('contentBody');
		if(container.getElementById('emptyFolder')) return;
		container.appendChild(I.template('empty folder'));
		document.getElementById('selectorBlock').hide();
		self.domBulkTools();
		DOM.loader();
		return true;

	};

	self._domPreparePage = function(container){

		container = container || document;
		var elem = container.getElementById('emptyFolder');
		elem && elem.remove();

		if(I.isDesktop){ //desktop

			elem = container.getElementById('emailsTableContainer');

			if(!elem.innerHTML){

				elem.appendChild(I.template('digests table'));
				self._domSorting(container);

			}

			var btnSpam = container.getElementById('btnSpam'),
				btnMove = container.getElementById('btnMove'),
				btnDelete = container.getElementById('btnDelete');

			btnSpam.onclick = function(){ //bulk spam

				D.c([l[75].ucFirst(), l[335]],  [l[1] + ', ' + l[337].ucFirst(), l[338].ucFirst()], function(r){

					D.h();
					r && self.bulkDelete(self._selectedItems(), {spam: true});
	
				});

			};

			btnMove.onclick = function(){ //bulk move

				new Popup(I.template('empty popup'), document.getElementById('moveToPopup'), function(popupNodes){

					F.domDropdownItems(popupNodes, self._sentOnly(self._selectedItems()) ? 1 : [1, 2, 3, 4, navState.page[1]]);
					return popupNodes;

				}, function(clickedElem){

					self.moveEmails(self._selectedItems(), clickedElem.getAttribute('data-folder'));
					self.domBulkTools();

				});

			};

			btnDelete.onclick = function(){ //bulk delete

				self.bulkDelete(self._selectedItems());

			};

			DOM.fixTopPanel();
			self._domSelector(container.getElementById('selectorBlock'));
			container.getElementById('selectorBlock').show();
			container.getElementById('digestsSelector').checked = false;

		}

		self._domTTL();

	};

	self._sort = function(sortBy){

		var i, searchInput = document.getElementById('searchInput');
		[1, 2, 3, -1, -2, -3].indexOf(sortBy) >= 0 && (sortBy = -sortBy);
		I.setSort(sortBy);
		searchInput.value = '';
		searchInput.blur();
		self._domSortingView();
		for(i = self._viewport.length - 1; i >= 0; i--) self.viewportRemove(self._viewport[i].d);
		for(i in self.emails.items) self._viewportAdd(self.emails.items[i]);

	};

	self._domPrepareToolsM = function(){

		self._domSelector();

		var btnSpam = document.getElementById('btnSpam'),
			btnStarred = document.getElementById('btnStarred'),
			btnMove = document.getElementById('btnMove'),
			btnDelete = document.getElementById('btnDelete'),
			btnContacts = document.getElementById('btnContacts'),
			btnStorage = document.getElementById('btnStorage'),
			btnStarredIco = document.getElementById('btnStarredIco');

		btnStarred.onclick = function(){ //bulk starred

			I.clickSound();
			if(this.classList.contains('disabled')) return;
			var selectedGroups = self.groups.getSelected(), isStarred = btnStarredIco.classList.contains('active');
			self.starredGroupsChange(selectedGroups, isStarred);
			self.domBulkTools();

		};

		btnSpam.onclick = function(){ //bulk spam

			I.clickSound();
			if(this.classList.contains('disabled')) return;

			D.c([l[75].ucFirst(), l[335]],  [l[1] + ', ' + l[337].ucFirst(), l[338].ucFirst()], function(r){

				D.h();
				r && self.bulkDelete(self._selectedItems(), {spam: true});

			});

		};

		btnMove.onclick = function(){ //bulk move

			I.clickSound();
			if(this.classList.contains('disabled')) return;

			self.moveEmails(self._selectedItems()).then(function(){

				self.domBulkTools();
				I.pageBackward('inbox');

			});

		};

		btnDelete.onclick = function(){ //bulk delete

			I.clickSound();
			if(this.classList.contains('disabled')) return;
			self.bulkDelete(self._selectedItems());

		};

		btnContacts.onclick = function(){ //go to contacts

			I.clickSound();
			I.changePage('contacts');

		};

		btnStorage.onclick = function(){ //go to storage

			I.clickSound();
			I.changePage('storage');

		};

	};

	self._domMobileTopPanel = function(){

		new Dropdown(document.getElementById('sortingLink'), document.getElementById('sortingItems'), function(){

			var dropdown = ''.toDOM(), addTitle = '';

			var itemDf = I.template('dropdown value');
			var elem = itemDf.getElementById('title');
			addTitle = navState.sort === -1 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[36] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 1);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === -2 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[133] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 2);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === -3 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[120] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 3);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === 4 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[136] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 4);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === 5 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[137] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 5);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === 6 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[82] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 6);
			dropdown.appendChild(itemDf);

			itemDf = I.template('dropdown value');
			elem = itemDf.getElementById('title');
			addTitle = navState.sort === 7 ? ' ' + l[383] : '';
			elem.innerHTML = l[233] + ' ' + l[147] + addTitle;
			elem.removeAttribute('id');
			itemDf.firstChild.setAttribute('data-sort', 7);
			dropdown.appendChild(itemDf);

			return dropdown;

		}.bind(this), function(clickedElem){

			self._sort(parseInt(clickedElem.getAttribute('data-sort')));

		});

	};

	self._domSortingView = function(container){

		if(!I.isDesktop) return;
		container = container || document;

		var sortByStarred = container.getElementById('sortByStarred'),
			sortByAttach = container.getElementById('sortByAttach'),
			addressTitle = container.getElementById('addressTitle'),
			sortByAddress = container.getElementById('sortByAddress'),
			sortBySubject = container.getElementById('sortBySubject'),
			sortByTTL = container.getElementById('sortByTTL'),
			sortBySentTime = container.getElementById('sortBySentTime'),
			sortByStarredIcon = container.getElementById('sortByStarredIcon'),
			sortByAttachIcon = container.getElementById('sortByAttachIcon'),
			sortByAddressIcon = container.getElementById('sortByAddressIcon'),
			sortBySubjectIcon = container.getElementById('sortBySubjectIcon'),
			sortByTTLIcon = container.getElementById('sortByTTLIcon'),
			sortBySentTimeIcon = container.getElementById('sortBySentTimeIcon');

		addressTitle.innerHTML = l[[1, 2].indexOf(navState.page[1]) >= 0 ? 126 : 381];
		sortByStarred.classList.remove('active');
		sortByAttach.classList.remove('active');
		sortByAddress.classList.remove('active');
		sortBySubject.classList.remove('active');
		sortByTTL.classList.remove('active');
		sortBySentTime.classList.remove('active');
		sortByStarredIcon.hide();
		sortByAttachIcon.hide();
		sortByAddressIcon.hide();
		sortBySubjectIcon.hide();
		sortByTTLIcon.hide();
		sortBySentTimeIcon.hide();

		switch(Math.abs(navState.sort)){

		case 1:

			sortBySentTime.classList.add('active');
			sortBySentTimeIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortBySentTimeIcon.show();
			break;

		case 2:

			sortByStarred.classList.add('active');
			sortByStarredIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortByStarredIcon.show();
			break;

		case 3:

			sortByAttach.classList.add('active');
			sortByAttachIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortByAttachIcon.show();
			break;

		case 4:

			sortByAddress.classList.add('active');
			sortByAddressIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortByAddressIcon.show();
			break;

		case 5:

			sortBySubject.classList.add('active');
			sortBySubjectIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortBySubjectIcon.show();
			break;

		case 6:

			sortByTTL.classList.add('active');
			sortByTTLIcon.className = navState.sort > 0 ? 'icon-attach icon-dropdown' : 'icon-attach icon-dropdown-up';
			sortByTTLIcon.show();
			break;

		}

	};

	self._domSorting = function(container){

		container = container || document;

		var sortByStarred = container.getElementById('sortByStarred'),
			sortByAttach = container.getElementById('sortByAttach'),
			sortByAddress = container.getElementById('sortByAddress'),
			sortBySubject = container.getElementById('sortBySubject'),
			sortByTTL = container.getElementById('sortByTTL'),
			sortBySentTime = container.getElementById('sortBySentTime');

		self._domSortingView(container);

		sortByStarred.onclick = function(){

			self._sort(2);

		};

		sortByAttach.onclick = function(){

			self._sort(3);

		};

		sortByAddress.onclick = function(){

			self._sort(4);

		};

		sortBySubject.onclick = function(){

			self._sort(5);

		};

		sortByTTL.onclick = function(){

			self._sort(6);

		};

		sortBySentTime.onclick = function(){

			self._sort(1);

		};

	};

	self._domPrepareSearch = function(){

		var searchInput = document.getElementById('searchInput'),
			btnSearch = document.getElementById('btnSearch'),
			btnSearchInner = document.getElementById('btnSearchInner'),
			btnCloseSearch = document.getElementById('btnCloseSearch'),
			searchBlock = document.getElementById('searchBlock'),
			searchKeywords = [];

		var _search = function(){

			if(!searchKeywords.length) return true;
			I.clickSound();
			I.search(searchKeywords);
			return self._search ? self.domInit() : I.changePage('inbox/search');

		};

		searchInput.value = '';

		var closeMobileSearch = function(){

			self.domBulkTools();
			if(!btnCloseSearch) return;
			searchBlock.hide();
			btnContacts.show();
			btnStorage.show();
			btnSearch.show();
			searchInput.value = '';
			self._filter([]);

			self._domTTLTimeout = setTimeout(function(){

				I.removeNotFinished(searchInput);

			}, 0);

		};

		searchInput.onkeyup = function(e){

			this.value ? I.removeNotFinished(searchInput) : I.addNotFinished(searchInput);
			if(e.keyCode === 13) return _search();
			searchKeywords = [];
			var arr = this.value.trim().toLowerCase().split(/[.,/\\\-!#$%&*()_+=\-!";%:?<>{}[]|`~;'\s]/);
			for(var i in arr) if(arr[i] && searchKeywords.indexOf(arr[i]) < 0) searchKeywords.push(arr[i]);
			self._filter(searchKeywords);

		};

		searchInput.onblur = function(){

			app || I.removeNotFinished(searchInput);
			this.value || closeMobileSearch();

		};

		btnSearch.onclick = function(){

			if(I.isDesktop){

				self.domBulkTools();

			}else{

				I.clickSound();
				I.addNotFinished(searchInput);
				btnContacts.hide();
				btnStorage.hide();
				btnSearch.hide();

			}

			searchBlock && searchBlock.show();
			searchInput.value = '';
			searchInput.focus();

			if(!searchKeywords.length) return searchInput.focus();
			_search();

		};

		btnCloseSearch && (btnCloseSearch.onclick = closeMobileSearch);
		btnSearchInner && (btnSearchInner.onclick = _search);

	};

	self._domTTL = function(){
		/*
		var i, ttl;
		clearTimeout(self._domTTLTimeout);

		if(true){ //refresh message view

			return;//todo

			for(i = self._messageView.length - 1; i >= 0; i--){

				ttl = Math.round(((new Date(self._messageView[i].ttl * 1000) - Date.now()) / 1000));

				if(ttl <= 0){

					if(!i) return I.pageBackward('inbox');
					self._messageView[i]._dom.remove();
					self._messageView.splice(i, 1);

				}

				expireSoon(ttl) && self._messageView[i].domTTL.classList.add('red');
				expire24Hours(ttl) && (self._messageView[i].domTTL.innerHTML = I.dateFormat(self._messageView[i].ttl, 3) + ' ' + l[236]);

			}

		}else{ //refresh inbox

			for(i in self._viewport){

				ttl = Math.round(((new Date(self._viewport[i].d.ttl * 1000) - Date.now()) / 1000));
				if(ttl <= 0) continue;
				expireSoon(ttl) && self._viewport[i].d.domTTL.classList.add('red');
				expire24Hours(ttl) && (self._viewport[i].d.domTTL.innerHTML = I.dateFormat(self._viewport[i].d.ttl, 3));

			}

		}

		for(i = self.emails.items.length - 1; i >= 0; i--){ //clearing expired messages

			ttl = Math.round(((new Date(self.emails.items[i].ttl * 1000) - Date.now()) / 1000));
			ttl <= 0 && self._delete([self.emails.items[i]], {local: true});

		}

		self._domTTLTimeout = setTimeout(function(){

			self._domTTL();

		}, 1000);
		*/
	};

	self._domSelector = function(container){

		var selectorBlock = document.getElementById('selectorBlock');

		var _select = function(mode){

			switch(mode){

			case 1: //all

				self.groups.asArray().forEach(function(group){ group.digest && group.digest.setSelected(true); });
				break;

			case 2: //none

				self.groups.asArray().forEach(function(group){ group.digest && group.digest.setSelected(false); });
				break;

			case 3: //read

				self.groups.asArray().forEach(function(group){ 

					if(!group.digest) return;
					var found = false;

					for(var j in group.messages){

						if(!group.messages[j].read){

							found = true;
							break;

						}

					}

					group.digest.setSelected(!found);

				});

				break;

			case 4: //starred

				self.groups.asArray().forEach(function(group){ 

					if(!group.digest) return;
					var found = false;

					for(var j in group.items){

						if(group.items[j].starred){

							found = true;
							break;

						}

					}

					group.digest.setSelected(found);

				});

				break;

			case 5: //inverse

				self.groups.asArray().forEach(function(group){ group.digest && group.digest.setSelected(!group.digest.selected); });
				break;

			}

			self.domBulkTools();

		};

		var elem;

		if(I.isDesktop){

			elem = container.getElementById('digestsSelector');

			elem && (elem.onclick = function(){

				_select(this.checked ? 1 : 2);

			});

		}

		if(I.isDesktop){ //desktop

			container.getElementById('selectArrow').onclick = function(){

				new Popup(I.template('selector popup'), document.getElementById('selectorPopup'), null, function(clickedElem){

					_select(clickedElem);

				});

			};

			selectorBlock.show();

		}else{ //mobile

			new Dropdown(document.getElementById('selectorBlock'), document.getElementById('inboxSelectorMenu'), function(){

				return I.template('panel bottom menu select');

			}, function(clickedElem){

				_select(parseInt(clickedElem.getAttribute('data-select')));

			});

		}

	};

	self._clearSelected = function(){

		for(var i in self.groups) self.groups[i].digest && self.groups[i].digest.setSelected(false);
		self.domBulkTools();

	};

	self.isSentOnly = function(emails){

		for(var i in emails) if(!U.isMe(emails[i].getSender())) return false;
		return true;

	};

	self._selectedItems = function(){

		return [].concat.apply([], self.groups.getSelected().map(function(x){ return x.messages; }));

	};

	self._fixedItems = function(files){

		var res = [];
		for(var i in files) if([2].indexOf(F.byId(files[i].folder, true)) >= 0) res.push(files[i]);
		return res;

	};

	self._incomingItems = function(files){

		var res = [];
		for(var i in files) if([2, 3].indexOf(F.byId(files[i].folder, true)) < 0) res.push(files[i]);
		return res;

	};

	self._trashItems = function(files){

		var res = [];
		for(var i in files) if(F.byId(files[i].folder, true) === 3) res.push(files[i]);
		return res;

	};

	self.bulkDelete = function(filesToDelete, options){

		options = options || {};

		return new Promise(function(res){

			if(!filesToDelete.length) return res();

			var trashItems = self._trashItems(filesToDelete),
				incomingItems = self._incomingItems(filesToDelete),
				fixedItems = self._fixedItems(filesToDelete),
				promises = [];

			var _actions = function(deleted){

				return Promise.all(promises).then(function(){

					self.domBulkTools();
					res(deleted);

				});

			};

			options.spam && (trashItems = trashItems.concat(incomingItems)) && (incomingItems = []);
			self.emails.setRead(trashItems.concat(incomingItems).map(function(x){ return x; }), true);

			if(incomingItems.length){

				promises.push(self.move(incomingItems.map(function(x){return [x.id, x.folder, F.folders[3].id];}), {trash : true}));
				self.emails.setStarred(incomingItems.map(function(x){return x; }), false, true);

			}

			options.anyway && (trashItems = trashItems.concat(fixedItems)) && (fixedItems = []);

			if(fixedItems.length){

				D.c([l[75].ucFirst(), l[35].ucFirst()], [l[1].ucFirst() + ', ' + l[167] + ' ' + l[45], l[164].ucFirst()], function(r){

					D.h();

					if(!r){

						trashItems.length && promises.push(self._delete(trashItems, {spam: options.spam}));
						return _actions(false);

					}

					trashItems = trashItems.concat(fixedItems);
					promises.push(self._delete(trashItems));
					_actions(true);

				});

			}else{

				trashItems.length && promises.push(self._delete(trashItems, {spam: options.spam}));
				_actions(true);

			}

		});

	};

	self.replyToEmail = function(data){

		W.new([data.getSender()], data.getReplySubject(), '', null, {data: data, mode: 'reply'});

	};

	self.forwardEmail = function(data){

		if(data.attaches){

			data.getAttaches().then(function(){

				W.new([], data.getSubject(), '', (new cFiles(2)).copy(data.attaches), {data: data, mode: 'forward'});

			});

		}else W.new([], data.getSubject(), '', null, {data: data, mode: 'forward'});

	};

	self.replyAllEmail = function(data, withCopies){

		var params = {data: data, mode: 'reply'};
		withCopies && (params['copies'] = data.recipientsCopies());
		W.new(data.recipients().concat(data.getSender()), data.getReplySubject(), '', null, params);

	};

	self.replyToEmailMobile = function(data){

		I.clickSound();
		var buttons = [[l['265'].ucFirst(), 0], [l['347'].ucFirst(), 1]];
		data.recipients().concat(data.getSender()).removeMe().length + data.recipientsCopies().length > 1 && buttons.push([l['346'].ucFirst(), 2]);
		data.recipientsCopies().length && buttons.push([l['540'].ucFirst(), 3]);

		D.b(buttons.concat([[l['164'].ucFirst(), -1]]), function(clickedId){

			D.h();

			switch(clickedId){

			case 0: //reply to last

				self.replyToEmail(data.group.lastReceivedMessage());
				break;

			case 1: //forward last

				self.forwardEmail(data);
				break;

			case 2: //reply all

				self.replyAllEmail(data);
				break;

			case 3: //reply all with copies

				self.replyAllEmail(data, true);
				break;

			}

		});

	};

	self._sentOnly = function(items){

		for(var i in items) if(!U.isMe(items[i].getSender())) return false;
		return true;

	};

	self.moveEmails = function(items, toFolderId, fromFolder){

		items instanceof Array || (items = [items]);
		fromFolder = fromFolder || navState.page[1];

		return new Promise(function(res){

			if(toFolderId){ //predefined target folder

				self.move(items.map(function(x){ return [x.id, x.folder, U.isMe(x.getSender()) ? F.folders[1].id : toFolderId]; })).then(function(){

					self.groups.syncStarred();

				});

				res(true);
				return;

			}

			F.setMode(1, self._sentOnly(items));

			I.panelLeft.open(function(selectedFolderId){

				if(!selectedFolderId) return res(false);
				var toMove = [];
				for(var i in items) (fromFolder === 3 || !items[i].isTrash()) && toMove.push([items[i].id, items[i].folder, U.isMe(items[i].getSender()) ? F.folders[1].id : selectedFolderId]);

				self.move(toMove, {noInsert : true}).then(function(){

					self.groups.syncStarred();

				});

				res(true);

			}.bind(this));

		});

	};

	self.isMainViewMessage = function(){

		return navState.page[1] === F.byId(this.folder, true) && navState.page[2] === this.id;

	};

	self.starredGroupsChange = function(groups, isStarred){

		groups instanceof Array || (groups = [groups]);

		groups.forEach(function(group){

			[4].indexOf(navState.page[1]) >= 0 ? self.viewportRemove(group) : group.digest && group.digest.domUpdateStarred(isStarred);

		});

		var toChange = [];

		groups.forEach(function(group){

			group.starred = isStarred;

			group.messages.forEach(function(data){

				(!isStarred || !data.isTrash()) && toChange.push(data);

			});

		});

		self.emails.setStarred(toChange, isStarred);
		return isStarred;

	};

	self.spamEmailGroup = function(){

		D.c([l[75].ucFirst(), l[335].ucFirst()],  [l[1].ucFirst() + ', ' + l[337], l[338].ucFirst()], function(r){

			D.h();
			if(!r) return;

			self.bulkDelete(this.messages.map(function(x){ return x;}), {spam: true}).then(function(deleted){

				deleted && I.pageBackward('inbox');

			});

		}.bind(this));

	};

	self.domReadInit = function(){

		if(I.filter.length){

			I.search(I.filter);
			I.filter = [];

		}

		return new Promise(function(res){

			var currentFolder = F.folders[navState.page[1]].id;
			self.waitingForMessageId = navState.page[2];

			return self.loadEmails(currentFolder).then(function(){

				for(var i = self.emails.items.length - 1; i >= 0; i--) self._viewportAdd(self.emails.items[i]);
				res();

			});

		});

	};

	self.setReadByIds = function(arr){

		if(!(arr instanceof Array)) return;
		var message, messages = [];

		for(var i in arr){

			if(!(arr[i] instanceof Array) || arr[i].length !== 2) continue;
			message = self.emails.byId(arr[i][0]);

			if(message){

				messages.push(message);
				message.view ? message.view.decreaseUnread() : message.group.digest && message.group.digest.decreaseUnread();

			}else F.decreaseUnread(arr[i][1]);

		}

		self.emails.setRead(messages, true);

	};

	self.moveByIds = function(arr){

		if(!(arr instanceof Array)) return;
		var i, data, foldersToUpdate = {}, inMessageView = I.inMessageView();

		for(i = arr.length - 1; i >= 0; i--){

			if(!(arr[i] instanceof Array) || arr[i].length !== 4) continue;
			data = self.emails.byId(arr[i][0]);

			if(data){

				(arr[i][3] || F.byId(arr[i][3], true) === 3) && self.emails.setRead(data, true);
				self._changeFolder(data, arr[i][2]);

				if(inMessageView){

					self.viewportRemove(data);

				}else if(data.group && data.group.digest){

					data.group.messagesForFolder(arr[i][1]) > 0 ? data.group.digest.assign(data.group) : self.viewportRemove(data.group);

				}

				self._viewportAdd(data);

			}else{

				data = {

					folder: arr[i][1],
					read: arr[i][3] ? true : false

				};

				self._changeFolder(data, arr[i][2]);

				if((I.inMessages() && navState.page[1] === F.byId(arr[i][2], true)) || E.emails.haveForFolder(arr[i][2], true)){

					foldersToUpdate[arr[i][2]] ? foldersToUpdate[arr[i][2]].items.push(arr[i][0]) : foldersToUpdate[arr[i][2]] = {exact: true, items: [arr[i][0]]};

				}

			}

		}

		self._loadExactEmails(foldersToUpdate);

	};

	self.removeByIds = function(arr){

		if(!(arr instanceof Array)) return;
		var i, data, toDelete = [];

		for(i = arr.length - 1; i >= 0; i--){

			F.decreaseTotal(F.folders[3].id);
			data = self.emails.byId(arr[i]);
			data && toDelete.push(data);

		}

		toDelete.length && self._delete(toDelete, {local: true});

	};

	self._domPreparePageView = function(data){

		F.domActive(navState.page[1]);
		var domMessageSubject = document.getElementById('messageSubject'),
			btnSpam = document.getElementById('btnSpam'),
			btnMove = document.getElementById('btnMove'),
			btnDelete = document.getElementById('btnDelete'),
			btnReply = document.getElementById('btnReply');

		if(domMessageSubject.innerHTML) return;
		domMessageSubject.innerHTML = data.subject ? data.originalSubject() : '(' + l[522].ucFirst() + ')';
		U.isMe(data.group.messages[data.group.messages.length - 1].getSender()) && (I.isDesktop ? btnSpam.hide() : btnSpam.classList.add('disabled'));

		if(I.isDesktop){

			var btnReplyAll = document.getElementById('btnReplyAll'),
				btnForward = document.getElementById('btnForward'),
				btnPrint = document.getElementById('btnPrint');

			btnReply = document.getElementById('btnReply');
			domMessageSubject = document.getElementById('messageSubject');
			
			btnPrint.onclick = function(){ print(); };

			btnReply.onclick = function(){

				self.replyToEmail(data.group.lastReceivedMessage());

			};

			btnReplyAll.onclick = function(){

				if(data.recipientsCopies().length){

					D.c([l[75].ucFirst(), l[333].ucFirst() + '?'], [l[1].ucFirst(), l[2].ucFirst()], function(result){

						D.h();
						self.replyAllEmail(data, result);

					});

				}else self.replyAllEmail(data);

			};

			btnForward.onclick = function(){

				self.forwardEmail(data);

			};

			if([1,2].indexOf(navState.page[1]) < 0 && F.haveCustomFolders()){

				btnMove.onclick = function(e){ //move

					new Popup(I.template('empty popup'), e, function(popupNodes){

						F.domDropdownItems(popupNodes, self._sentOnly(data.group.messages) ? 1 : [1, 2, 3, 4, navState.page[1]]);
						return popupNodes;

					}, function(clickedElem){

						self.moveEmails(data.group.messages, clickedElem.getAttribute('data-folder')).then(function(moved){

							if(!moved) return;
							I.pageBackward('inbox');

						});

					});

				};

			}else btnMove.remove();

			F.haveCustomFolders() || btnMove.hide();

		}else{

			var domMessageTopInfo = document.getElementById('messageTopInfo');

			domMessageTopInfo.hide();

			btnReply.onclick = function(){

				self.replyToEmailMobile(data);

			};

			btnMove.onclick = function(){ //move

				I.clickSound();

				self.moveEmails(data.group.messages.map(function(x){ return x; })).then(function(moved){

					if(!moved) return;
					I.pageBackward('inbox');

				});

			};

		}

		btnSpam.onclick = function(){ //spam

			if(this.classList.contains('disabled')) return;
			I.clickSound();
			self.spamEmailGroup.call(data.group);

		};

		btnDelete.onclick = function(){ //delete

			I.clickSound();

			I.pageBackward('inbox').then(function(){

				self.bulkDelete(data.group.messages.map(function(x){ return x;}));

			});

		};

	};

	self.domPageViewFolders = function(data){

		var i, domViewHeader = document.getElementById('viewHeader'),
			children = domViewHeader.childNodes;

		for(i = children.length - 1; i > 1; i--) children[i].tagName && children[i].remove();

		for(i = 0; i < data.group.messages.length; i++){

			if(!document.getElementById('folder-' + data.group.messages[i].folder)){

				var df = I.template('view message folder'),
					elem = df.getElementById('name');

				elem.setAttribute('id', 'folder-' + data.group.messages[i].folder);
				elem.innerHTML = F.title(data.group.messages[i].folder).ucFirst();
				domViewHeader.appendChild(elem);

				elem.onclick = function(){

					I.changePage('inbox/' + F.byId(data.folder, true));

				};

			}

		}

	};

	self._domPageViewUpdate = function(data){

		var domBtnStarred = document.getElementById('btnStarredTitle'),
			domBtnStarredIco = document.getElementById('btnStarredTitleIco'),
			domViewHeader = document.getElementById('viewHeader');

		if(!domViewHeader) return;
		self.domPageViewFolders(data);

		if(!data.group.isTrashOnly()){ //starred button

			domBtnStarredIco.show();

			var _domStarredIco = function(on){

				on ? (I.isDesktop ? domBtnStarredIco.checked = true : domBtnStarredIco.classList.add('active')) : (I.isDesktop ? domBtnStarredIco.checked = false : domBtnStarredIco.classList.remove('active')); //starred
				domBtnStarred.show();

			};

			_domStarredIco(data.group.starred);

			domBtnStarred.onclick = function(){ //star

				I.clickSound();
				_domStarredIco(self.starredGroupsChange(data.group, !data.group.starred));

			};

		}else domBtnStarredIco.hide();

		if(self.waitingForMessageId === data.id){ //security level

			var domMessageIconLock = document.getElementById('messageIconLock'),
				domMessageTopInfo = document.getElementById('messageTopInfo'),
				lockIconStyles = ['i i-unlocked', 'i i-locked-yellow', 'i i-locked'],
				secureLevel = data.secureLevel();

			domMessageIconLock.className = lockIconStyles[secureLevel];
			domMessageTopInfo && domMessageTopInfo.show();
			I.isDesktop && DOM.title(secureLevel === 0 ? l[542].ucFirst() : (secureLevel === 1 ? l[543].ucFirst() : l[544].ucFirst()));

			domMessageIconLock.onclick = function(){

				I.clickSound();
				I.changePage('faq#strength');

			};

		}

	};

	self.domBulkTools = function(hideAll){

		if(['inbox'].indexOf(navState.page[0]) < 0) return;

		var canMove = true, canSpam = true, allStarred = true,
			btnDelete = document.getElementById('btnDelete'),
			btnSpam = document.getElementById('btnSpam'),
			btnStarred = document.getElementById('btnStarred'),
			btnMove = document.getElementById('btnMove'),
			btnStarredIco = document.getElementById('btnStarredIco'),
			domDigestsSelector = document.getElementById('digestsSelector'),
			selectedGroups = self.groups.getSelected();

		if(!I.isDesktop) var btnContacts = document.getElementById('btnContacts'),
			btnStorage = document.getElementById('btnStorage'),
			btnSearch = document.getElementById('btnSearch'),
			searchBlock = document.getElementById('searchBlock'),
			selectorBlock = document.getElementById('selectorBlock');

		(([1, 2].indexOf(navState.page[1]) < 0 && F.haveCustomFolders()) || navState.page[1] === 3) || (canMove = false);
		[1, 2, 3, 4].indexOf(navState.page[1]) < 0 || (canSpam = false);

		domDigestsSelector && (domDigestsSelector.checked = selectedGroups.length === self._viewport.length);

		for(var i in selectedGroups) if(!selectedGroups[i].starred){

			allStarred = false;
			break;

		}

		if(!hideAll && selectedGroups.length){

			btnStarredIco && (allStarred ? btnStarredIco.classList.remove('active') : btnStarredIco.classList.add('active'));
			btnMove.show();
			btnSpam.show();
			btnDelete.show();

			if(!I.isDesktop){

				btnContacts.hide();
				btnStorage.hide();
				btnSearch.hide();
				selectorBlock.show();
				btnStarred.show();
				[3].indexOf(navState.page[1]) < 0 ? btnStarred.show() : btnStarred.hide();

			}

			canMove ? btnMove.show() : btnMove.hide();
			canSpam ? btnSpam.show() : btnSpam.hide();

		}else{

			btnMove.hide();
			btnSpam.hide();
			btnDelete.hide();
			btnStarred && btnStarred.hide();

			if(!I.isDesktop){

				selectorBlock.hide();
				btnContacts.show();
				btnStorage.show();
				btnSearch.show();

			}

			if(searchBlock && searchBlock.visible()){

				btnContacts.hide();
				btnStorage.hide();
				btnSearch.hide();

			}

		}

	};

}