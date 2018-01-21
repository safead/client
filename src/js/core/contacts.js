'use strict';

function cContacts(){

	var self = this;
	self._version = '1.0.0';
	self._c = [];
	self._viewport = [];
	self._countContacts = 0;
	self._countSources = 0;
	self._countBlacklist = 0;
	self._showSources = 0;
	self._showBlacklist = 0;
	self.selected = [];

	self.domInit = function(df){

		var container = df;

		var _fill = function(){

			return C.domFill(df.getElementById('containerContacts')).then(function(){

				I.isDesktop && self._domIncludes(df.getElementById('includeBlock'));
				self._viewport.length >= 5 && self._domHelpPanel(I.isDesktop ? df.getElementById('topPanel') : df.getElementById('contactsHelpPanelContainer'), true);

			});

		};

		if(!I.isDesktop){

			container = document;
			I.alphabet = new Alphabet(document.getElementById('alphabet'));

		}

		container.getElementById('bulkWrite').onclick = function(e){

			e.preventDefault();
			W.addElements(C.selected); //add recipients to compose

		};

		container.getElementById('newContact').onclick = function(e){

			e.preventDefault();
			self.addContact(new cContact(), document.getElementById('containerContacts')); //new contact

		};

		if(app){ //sync contacts from phonebook

			return new Promise(function(res){

				var options = new ContactFindOptions(), name, email, haveNew = false;
				options.filter = '@';
				options.multiple = true;
				options.desiredFields = [navigator.contacts.fieldType.name, navigator.contacts.fieldType.emails];
				navigator.contacts.find([navigator.contacts.fieldType.emails], function(results){

					for(var i in results){

						for(var j in results[i].emails){

							name = results[i].name.formatted.trim();
							email = results[i].emails[j].value.toLowerCase();

							if(!name || (contact = C.byAddress(email))) continue;
							self.add(new cContact(email, name.ucFirst(), 1));
							haveNew = true;

						}

					}

					if(haveNew){

						C.domCount(df.getElementById('contactsTotal'));
						U.netSave(['contacts']);

					}

					return _fill().then(function(){ res(); });

				}, function(){

					alert('failed to import contacts from phonebook');
					return _fill().then(function(){ res(); });

				}, options);

			});

		}else return _fill();

	};

	self.domFill = function(container){

		if(navState.page[0] !== 'contacts') return;
		container = container || document.getElementById('containerContacts');
		container.customClear();
		DOM.loader(l[366], 100);
		self.selected = [];
		self._newViewport(1);
		var ids = {};
		I.isDesktop && self._domIncludes();

		for(var i = 0; i < self._viewport.length; i++){

			(I.isDesktop ? self._domAdd : self._domAddM)(container, self._viewport[i].d);
			addrIsInternal(self._viewport[i].d.address) && (ids[self._viewport[i].d.address] = 1);

		}

		return AV.get(ids).then(function(){

			for(var i in ids) AV.deploy({container: container, className: 'avatar-' + u2a(i), address: i, removeIfFound: container.getElementsByClassName(u2a(i))});
			DOM.loader();

		});

	};

	self._applyFilter = function(container, val){

		val && (val = val.toLowerCase());

		for(var i in self._c){

			if(

				!self._c[i].type ||
				(val && self._c[i].name.toLowerCase().indexOf(val) < 0 && self._c[i].address.indexOf(val) < 0) ||
				(!self._showSources && self._c[i].type === 2) ||
				(!self._showBlacklist && self._c[i].type === 3)

			){

				self._viewportRemove(self._c[i]);

			}else !self._c[i]._dom && self._viewportAdd(container, self._c[i]);

		}

	};

	self._newViewport = function(sortBy){

		sortBy = sortBy || 0;
		self._viewport = [];
		self._countContacts = 0;
		self._countSources = 0;
		self._countBlacklist = 0;

		for(var i = 0; i < self._c.length; i++){

			if(!self._c[i].type) continue;
			if(self._c[i].type === 1){

				self._countContacts++;

			}else if(self._c[i].type === 2){

				self._countSources++;
				if(!self._showSources) continue;

			}else if(self._c[i].type === 3){

				self._countBlacklist++;
				if(!self._showBlacklist) continue;

			}

			var pos = self._getPosition(self._c[i], sortBy);
			self._viewport.splice(pos[0][1], 0, {v: pos[1], d: self._c[i]});
				
		}

	};

	self.scrollTo = function(letter){

		for(var i = 0; i < self._viewport.length; i++){

			if(self._viewport[i].d.name[0].toLowerCase() !== letter) continue;
			if(!self._viewport[i].d._dom) return;
			self._viewport[i].d._dom.scrollIntoView();
			return;

		}

	};

	self._viewportIndex = function(data){

		for(var i = 0; i < self._viewport.length; i++) if(self._viewport[i].d === data) return i;
		return -1;

	};

	self._getPosition = function(data, sortBy){

		var val;

		switch(Math.abs(sortBy)){

		case 1:
			val = data.name.toLowerCase();
			break;

		case 2:
			val = addrReal(data.address).toLowerCase();
			break;

		case 3:
			val = data.folder;
			break;

		default:
			return;

		}

		return [sortBy > 0 ? arrayIndexProperty(self._viewport, 0, self._viewport.length - 1, val, 'v') : arrayIndexPropertyInverse(self._viewport, 0, self._viewport.length - 1, val, 'v'), val];

	};

	self._viewportAdd = function(container, data){

		if(self._viewportIndex(data) >= 0) return;

		var pos = self._getPosition(data, 1);

		if(!self._viewport.length || pos[0][1] >= self._viewport.length){

			(I.isDesktop ? self._domAdd : self._domAddM)(container, data);

		}else{

			(I.isDesktop ? self._domAdd : self._domAddM)(container, data, self._viewport[pos[0][1]].d._dom);

		}

		self._viewport.splice(pos[0][1], 0, {v: pos[1], d: data});
		self._viewport.length === 5 && self._domHelpPanel(document.getElementById('contactsHelpPanelContainer'), true);

	};

	self._viewportRemove = function(data){

		self._removeSelected(data);

		for(var i = self._viewport.length - 1; i >= 0; i--){

			if(self._viewport[i].d !== data) continue;
			self._viewport[i].d._domDelete();
			self._viewport.splice(i, 1);
			self._viewport.length < 5 && self._domHelpPanel(document.getElementById('contactsHelpPanelContainer'));
			break;

		}

	};

	self.addContact = function(contact, container){

		return contact.domEdit().then(function(newContact){

			if(!newContact) return null;
			container && self._viewportAdd(container, newContact);
			self.domCount();
			U.netSave(['contacts']); //silent save
			if(navState.page[0] !== 'contacts') return newContact;
			var ids = {};
			addrIsInternal(newContact.address) && (ids[newContact.address] = 1);

			return AV.get(ids).then(function(){

				for(var i in ids) AV.deploy({container: container, className: 'avatar-' + u2a(i), address: i, removeIfFound: container.getElementsByClassName(u2a(i))});
				return newContact;

			});

		});

	};

	self._count = function(){

		var res = 0;
		for(var i = 0; i < self._c.length; i++) self._c[i].type === 1 && res++;
		return res;

	};

	self.prepareNewUsers = function(contacts, pwd){

		if(!pwd) return Promise.resolve(true);
		var promises = [], newUsers = [];

		contacts.forEach(function(contact){

			if(!contact.currentKeys.encId){ //create new user

				if(!contact.uuid || !contact.toUUID || !contact.fp) throw new Error(l[363]);
				promises.push(new cUser().netSignup(contact.uuid, contact.toUUID, contact.address, contact.address, pwd, '', contact.fp));
				newUsers.push(contact.address);

			}

		});

		promises.length && D.m([l[72].ucFirst(), l[271].ucFirst() + ':<br /><br /><b>' + newUsers.join('<br />') + '</b><br /><br />' + l[280].ucFirst()]);

		return Promise.all(promises).then(function(newUsers){

			D.h();

			newUsers.forEach(function(user){ //add new user (PUBLIC ONLY!) keys to my keyring

				U.keyring.keys[user.keyring.keys.ENC.id] = {};
				U.keyring.keys[user.keyring.keys.ENC.id].id = user.keyring.keys.ENC;
				U.keyring.keys[user.keyring.keys.ENC.id].publicKey = user.keyring.keys.ENC.publicKey;
				U.keyring.keys[user.keyring.keys.ENC.id].role = 'ENC';
				U.keyring.keys[user.keyring.keys.SIGN.id] = {};
				U.keyring.keys[user.keyring.keys.SIGN.id].id = user.keyring.keys.SIGN.id;
				U.keyring.keys[user.keyring.keys.SIGN.id].publicKey = user.keyring.keys.SIGN.publicKey;
				U.keyring.keys[user.keyring.keys.SIGN.id].role = 'SIGN';
				var contact = self.byAddress(user.login());
				if(!contact || !user.response.time || !user.response.rsa_uuid) throw new Error(l[363]);
				U.keyring.keys[user.keyring.keys.ENC.id].uuid = user.response.rsa_uuid;
				U.keyring.keys[user.keyring.keys.SIGN.id].uuid = user.response.rsa_uuid;
				U.keyring.keys[user.keyring.keys.ENC.id].time = user.response.time;
				U.keyring.keys[user.keyring.keys.SIGN.id].time = user.response.time;
				contact.currentKeys.encId = user.keyring.keys.ENC.id; //set public keys
				contact.currentKeys.signId = user.keyring.keys.SIGN.id;
				contact.currentKeys.time = user.response.time;

			});

			return true;

		});

	};

	self.getPublicKeys = function(addresses){

		var i, apiUsers = [], contact;
		addresses instanceof Array || (addresses = [addresses]);
		if(!addresses.length) return Promise.resolve([]);

		for(i = 0; i < addresses.length; i++){

			addresses[i] = addresses[i].toLowerCase();
			apiUsers.push({user: addresses[i]});

			if((contact = self.byAddress(addresses[i]))){

				if(contact.currentKeys.time){ //request fresh keys only

					apiUsers[apiUsers.length - 1].time = contact.currentKeys.time;

				}else if(contact.verifiedKey) apiUsers[apiUsers.length - 1].time = contact.verifiedKey.time - 1; //request keys younger then validated key

			}

		}

		return A.getPublicKeys(apiUsers).then(self._processKeysData);

	};

	self.checkPublickKeys = function(data){

		return A.getPublicKeys(data).then(self._processKeysData);

	};

	self._processKeysData = function(apiResults){

		if(apiResults === 'cancelled') return apiResults;
		var i, j, promises = [], addresses = [], promisesGroup, contactsList = new Array(apiResults.length), contact, apiResult;

		var _compromised = function(){

			D.i([l[112].ucFirst(), l[510].ucFirst() + ' <b>' + addrReal(objects[i].c) + '</b> ' + l[511] + '! ' + l[513], ], [l[0].ucFirst()]);

		};

		var _validated = function(contact, data){

			contact.uuid = data.id;
			contact.ownName = a2u(data.nick);
			contact.fp = data.fingerprint;
			data.uuid && (contact.toUUID = data.uuid);
			contactsList[data.pos] = contact;

		};

		for(i = apiResults.length - 1; i >= 0; i--){

			if(

				typeof apiResults[i].address !== 'string' ||
				typeof apiResults[i].id !== 'string' ||
				typeof apiResults[i].nick !== 'string' ||
				typeof apiResults[i].fingerprint !== 'string' ||
				typeof apiResults[i].sign !== 'object' ||
				typeof apiResults[i].enc !== 'object' ||
				typeof apiResults[i].visit_cards !== 'object'

			) throw new Error(l[90]);

			apiResults[i].pos = i;

			if(apiResults[i].sign.length){

				addresses.push(apiResults[i].address);
				promisesGroup = [];

				if(

					!apiResults[i].visit_cards.length ||
					apiResults[i].enc.length !== 1 ||
					apiResults[i].sign.length !== apiResults[i].visit_cards.length

				) throw new Error('Bad variables count for \'' + apiResults[i].address + '\'');

				for(j = 0; j < apiResults[i].sign.length; j++) promisesGroup.push(U.keyring.importPublicKey('SIGN', apiResults[i].sign[j].data, apiResults[i].sign[j].uuid)); //importing all sign keys
				promisesGroup.push(U.keyring.importPublicKey('ENC', apiResults[i].enc[0].data, apiResults[i].enc[0].uuid)); //importing one enc key
				promisesGroup.push(apiResults[i]);
				promises.push(Promise.all(promisesGroup));

			}else{

				if(!(contact = self.byAddress(apiResults[i].address))){

					contact = new cContact(apiResults[i].address, a2u(apiResults[i].nick));
					self.add(contact);

				}

				_validated(contact, apiResults[i]);

			}

		}

		return Promise.all(promises).then(function(results){

			var promises = [], visitCard;

			for(i = 0; i < results.length; i++){

				apiResult = results[i].pop();
				visitCard = msgpack.unpack(msgpack.unpack(a2b(apiResult.visit_cards[apiResult.visit_cards.length - 1].card)).data); //ids of the last keys should be the same in the last visit card

				if(results[i][results[i].length - 2].id !== visitCard.key_sign_id || results[i][results[i].length - 1].id !== visitCard.key_enc_id){

					_compromised(apiResult.address);
					continue;

				}

				promisesGroup = [];
				for(j = apiResult.sign.length - 1; j >= 0; j--) promisesGroup.push(self._validateVisitCard(msgpack.unpack(a2b(apiResult.visit_cards[j].card)), results[i][j - 1] ? [results[i][j].id, results[i][j - 1].id] : [results[i][j].id]));
				promisesGroup.push(apiResult);
				promises.push(Promise.all(promisesGroup));

			}

			return Promise.all(promises); //check visitcards signing chain

		}).then(function(results){

			var found, verifiedChanged = false;

			for(i = 0; i < results.length; i++){

				apiResult = results[i].pop();
				contact = self.byAddress(addresses[i]);

				for(j = 0; j < results[i].length; j++){

					if(!results[i][j].valid){

						delete(U.keyring.keys[results[i][j].data.key_sign_id]) && delete(U.keyring.keys[results[i][j].data.key_enc_id]);
						_compromised(addresses[i]);

					}

				}

				if(contact){

					if(contact.verifiedKey){

						found = false;

						for(j = 0; j < results[i].length; j++) if(results[i][j].data.key_sign_id === contact.verifiedKey.id){

							found = true;
							break;

						}

						if(!found){

							for(j = 0; j < results[i].length; j++) delete(U.keyring.keys[results[i][j].data.key_sign_id]) && delete(U.keyring.keys[results[i][j].data.key_enc_id]);
							_compromised(addresses[i]);
							continue;

						}

					}

				}else{ //add new temporary contact

					contact = new cContact(apiResult.address, a2u(apiResult.nick));
					self.add(contact);

				}

				_validated(contact, apiResult);
				if(!results[i].length) continue;

				contact.currentKeys = { //set current keys

					signId: results[i][0].data.key_sign_id,
					encId: results[i][0].data.key_enc_id,
					time: apiResult.enc[0].time

				};

				if(contact.verifiedKey && contact.verifiedKey.id !== contact.currentKeys.signId){

					contact.verifiedKey = { //refresh verified key id

						id: contact.currentKeys.signId,
						time: contact.currentKeys.time

					};

					verifiedChanged = true;

				}

			}

			verifiedChanged && U.netSave(['contacts']);
			for(i = contactsList.length - 1; i >= 0; i--) contactsList[i] || contactsList.splice(i, 1);
			return contactsList;

		}).catch(function(e){

			I.e('cContacts._processKeysData', e);

		});

	};

	self.add = function(contact){

		self._c.push(contact);
		return contact;

	};

	self.load = function(data){

		return self._fromEncoded(data);

	};

	self._validateVisitCard = function(data, signKeysIds){

		signKeysIds instanceof Array || (signKeysIds = [signKeysIds]);

		return Signing.verify(U.keyring, signKeysIds, data).then(function(result){

			return {

				valid: result,
				data: msgpack.unpack(data.data)

			};

		});

	};

	self.byAddress = function(address, notTemporary){

		for(var i in self._c){

			if(notTemporary && !self._c[i].type) continue;
			if(self._c[i].address === address) return self._c[i];

		}

		return false;

	};

	self.byId = function(id){

		for(var i in self._c) if(self._c[i].id === id) return self._c[i];
		return null;

	};

	self.delete = function(id){

		for(var i in self._c){

			if(self._c[i].id !== id) continue;

			if(self._c[i].type === 1){

				self._countContacts--;

			}else if(self._c[i].type === 2){

				self._countSources--;

			}else if(self._c[i].type === 3){

				self._countBlacklist--;

			}

			self._c.splice(i, 1);
			self.domCount();
			I.isDesktop && self._domIncludes();
			break;

		}

		return true;

	};
	
	self.getSimilar = function(v){

		var i, res = [];
		if(!(v = v.trim().toLowerCase())) return res;
		for(i in self._c) if(self._c[i].address.indexOf(v) >= 0 || self._c[i].name.toLowerCase().indexOf(v) >= 0) res.push(self._c[i]);
		return res;

	};

	self.encode = function(){

		var data = {v: self._version, c: []};

		for(var i = 0; i < self._c.length; i++){

			if(!self._c[i].type) continue;
			data.c.push(self._c[i]._toObject());

		}
		
		return Encryption.encrypt(U.keyring, [U.keyring.keys.ENC.id], {data: msgpack.pack(data), aad: s2b('contacts').buffer}).then(function(result){ //pack and encode

			return Signing.sign(U.keyring, [U.keyring.keys.SIGN.id], result); //sign

		}).then(function(result){

			return b2a(msgpack.pack(result));

		});

	};

	self._fromEncoded = function(data){

		data = msgpack.unpack(a2b(data));
		self._c = [];

		return Signing.verify(U.keyring, [U.keyring.keys.SIGN.id], data).then(function(result){ //check signature

			if(!result) throw new Error('contact signature is wrong');
			return Encryption.decrypt(U.keyring, [U.keyring.keys.ENC.id], data); //decrypt and unpack data

		}).then(function(result){

			var contact, data = msgpack.unpack(result.data);

			for(var i in data.c){

				contact = new cContact();
				contact._fromObject(data.c[i]);
				self._c.push(contact);

			}

			return true;

		});

	};
	
	self.senderFolder = function(address, name){

		if(!address && !name) return F.folders[0].id;

		for(var i in self._c){

			if((address && address !== self._c[i].address) || (name && name !== self._c[i].name)) continue;
			return self._c[i].folder || F.folders[0].id;

		}

		return F.folders[0].id;

	};
	
	self.deleteFolder = function(folderId){

		var found = false,
			refreshView = navState.page[0] === 'contacts';

		for(var i in self._c){

			if(self._c[i].folder !== folderId) continue;
			found = true;
			self._c[i].folder = F.folders[0].id;
			refreshView && self._c[i].domRefresh();

		}

		return found;

	};
	
	self.folderNameChanged = function(folderId){

		if(navState.page[0] !== 'contacts') return;

		for(var i in self._c){

			if(!self._c[i]._dom || self._c[i].folder !== folderId) continue;
			self._c[i].domRefresh();

		}

	};

	self._addSelected = function(data){

		for(var i = 0; i < self.selected.length - 1; i++) if(self.selected[i] === data) return;
		self.selected.push(data);

	};

	self._removeSelected = function(data){

		for(var i = 0; i < self.selected.length; i++){

			if(self.selected[i] !== data) continue;
			self.selected.splice(i, 1);
			return;

		}

	};

	self._inSelected = function(data){

		for(var i = 0; i < self.selected.length; i++) if(self.selected[i] === data) return true;
		return false;

	};

	self._domHelpPanel = function(container, show){

		if(document.activeElement && document.activeElement instanceof HTMLInputElement) return;
		if(container && !show) return container.customClear();

		if(!I.isDesktop){

			if(container.innerHTML) return;
			container.appendChild(I.template('contacts help panel'));

		}

		(document.getElementById('searchInput') || container.getElementById('searchInput')).oninput = function(){ //search

			self._applyFilter(document.getElementById('containerContacts'), this.value);

		};

	};

	self._domAddM = function(container, data, beforeNode){

		data._dom = I.template('contact').firstChild;

		var initials = data._dom.getElementById('initials'),
			avatar = data._dom.getElementById('avatarImage'),
			currentFolder = data._dom.getElementById('currentFolder'),
			foldersList = data._dom.getElementById('foldersList'),
			foldersLink = data._dom.getElementById('foldersLink'),
			bulkWrite = document.getElementById('bulkWrite');

		avatar.removeAttribute('id');
		data.domRefresh();
		var src = AV.uri(data.address); //avatar image

		if(src){

			initials.remove();
			avatar.setAttribute('src', src);
			avatar.show();

		}else{

			avatar.classList.add('avatar-' + u2a(data.address));
			initials.classList.add(u2a(data.address));

		}

		var _delete = function(){

			D.c([l[75].ucFirst(), l[272].ucFirst()], [l[167].ucFirst(), l[164].ucFirst()], function(r){

				D.h();
				if(!r) return data._swipe.close();
				self._viewportRemove(data);
				_bulkActionButton();
				self.delete(data.id);
				U.netSave(['contacts']); //silent save

			});

		};

		var _bulkActionButton = function(){

			DOM.composeButton(!self.selected.length);
			self.selected.length ? bulkWrite.show() : bulkWrite.hide();

		};

		new Dropdown(foldersLink, foldersList, function(){

			var dropdown = ''.toDOM();
			F.domDropdownItems(dropdown, [1, 2, 4]);
			return dropdown;

		}.bind(this), function(clickedElem){

			var folderId = clickedElem.getAttribute('data-folder');
			if(data.folder === folderId) return;
			data.folder = folderId;
			currentFolder.innerHTML = F.byId(folderId).title.ucFirst();
			U.netSave(['contacts']); //silent save

		});

		new LongTouch(data._dom, function(){

			data._swipe.open();

		});

		data._swipe = new Swipe(data._dom, function(){

			var menu = I.template(addrIsInternal(data.address) ? (data.verifiedKey ? 'contact swipe verified' : 'contact swipe not verified') : 'contact swipe external');

			menu.getElementById('delete').onclick = function(e){

				e.stopPropagation();
				e.preventDefault();
				_delete();

			};


			menu.getElementById('edit').onclick = function(e){

				e.stopPropagation();
				e.preventDefault();

				return data.domEdit().then(function(contact){

					data._swipe.close();
					if(!contact) return;
					container && (contact._dom ? contact.domRefresh() : self._viewportAdd(container, contact));
					U.netSave(['contacts']); //silent save

				});

			};

			addrIsInternal(data.address) && (menu.getElementById('verify').onclick = function(e){

				e.stopPropagation();
				e.preventDefault();
				data._swipe.close();

				data._verify().then(function(result){

					result ? data._dom.classList.add('verified') : data._dom.classList.remove('verified');

				}).catch(function(){ /*cancelled*/ });

			});

			return menu;

		}, _delete, 'noAnimate attach-file-content left');

		data._dom.onclick = function(){

			data._dom.classList.toggle('selected');
			data._dom.classList.contains('selected') ? self._addSelected(data) : self._removeSelected(data);
			_bulkActionButton();

		};

		beforeNode ? container.insertBefore(data._dom, beforeNode) : container.appendChild(data._dom);

	};

	self._domAdd = function(container, data, beforeNode){

		data._dom = I.template('contact').firstChild;

		var avatar = data._dom.getElementById('avatarImage'),
			contactLink = data._dom.getElementById('contactLink'),
			currentFolder = data._dom.getElementById('currentFolder'),
			foldersLink = data._dom.getElementById('foldersLink'),
			btnDelete = data._dom.getElementById('btnDelete'),
			btnEdit = data._dom.getElementById('btnEdit'),
			btnVerified = data._dom.getElementById('btnVerified');

		avatar.removeAttribute('id');
		btnDelete.removeAttribute('id');
		btnEdit.removeAttribute('id');
		btnVerified.removeAttribute('id');
		data.domRefresh();

		var src = AV.uri(data.address); //avatar image

		if(src){

			avatar.setAttribute('src', src);
			avatar.show();

		}else avatar.classList.add('avatar-' + u2a(data.address));

		btnDelete.addEventListener('click', function(e){

			e.stopPropagation();
			e.preventDefault();

			D.c([l[75].ucFirst(), l[272].ucFirst()], [l[167].ucFirst(), l[164].ucFirst()], function(r){

				D.h();
				if(!r) return;
				self._viewportRemove(data);
				self.delete(data.id);
				U.netSave(['contacts']); //silent save

			});

		});

		if(data.address){

			var _bulkActionButton = function(){

				self.selected.length ? document.getElementById('bulkWrite').show() : document.getElementById('bulkWrite').hide();

			};

			btnEdit.addEventListener('click', function(e){

				e.stopPropagation();
				e.preventDefault();

				return data.domEdit().then(function(contact){

					if(!contact) return;
					container && (contact._dom ? contact.domRefresh() : self._viewportAdd(container, contact));
					U.netSave(['contacts']); //silent save

				});

			});

			contactLink.addEventListener('click', function(e){

				e.stopPropagation();
				e.preventDefault();
				W.addElements(data);

			});

			btnVerified.addEventListener('click', function(e){

				e.stopPropagation();
				e.preventDefault();

				data._verify().then(function(result){

					btnVerified.className = 'icon ' + (result ? 'icon-locked' : 'icon-unlocked');

				}).catch(function(){ /*cancelled*/ });

			});

			data._dom.onclick = function(){

				data._dom.classList.toggle('selected');
				data._dom.classList.contains('selected') ? self._addSelected(data) : self._removeSelected(data);
				_bulkActionButton();

			};

		}else{

			btnEdit.hide();
			btnVerified.hide();

		}

		foldersLink.addEventListener('click', function(e){

			e.stopPropagation();
			e.preventDefault();

			new Popup(I.template('empty popup'), e, function(popupNodes){

				F.domDropdownItems(popupNodes, [1, 2, 3, 4, navState.page[1]]);
				return popupNodes;

			}, function(clickedElem){

				var folderId = clickedElem.getAttribute('data-folder');
				if(data.folder === folderId) return;
				data.folder = folderId;
				currentFolder.innerHTML = F.byId(folderId).title.ucFirst();
				U.netSave(['contacts']); //silent save

			});

		});

		addrIsInternal(data.address) ? btnVerified.classList.add(data.verifiedKey ? 'icon-locked' : 'icon-unlocked') : btnVerified.remove();
		beforeNode ? container.insertBefore(data._dom, beforeNode) : container.appendChild(data._dom);

	};

	self._domIncludes = function(container){

		container = container || document;

		var includeSourcesBlock = container.getElementById('includeSourcesBlock'),
			includeSources = container.getElementById('includeSources'),
			includeSourcesCount = container.getElementById('includeSourcesCount'),
			includeBlacklistBlock = container.getElementById('includeBlacklistBlock'),
			includeBlacklist = container.getElementById('includeBlacklist'),
			includeBlacklistCount = container.getElementById('includeBlacklistCount');

		if(!includeSourcesBlock) return;
		self._showSources && (includeSources.checked = true); //show sources

		if(self._countSources){

			includeSourcesCount.innerHTML = self._countSources;
			includeSourcesBlock.show();

		}else includeSourcesBlock.hide();

		includeSources.onclick = function(){

			self._showSources = this.checked;
			self._newViewport(1);
			self.domFill();

		};

		self._showBlacklist && (includeBlacklist.checked = true); //show sources

		if(self._countBlacklist){

			includeBlacklistCount.innerHTML = self._countBlacklist;
			includeBlacklistBlock.show();

		}else includeBlacklistBlock.hide();

		includeBlacklist.onclick = function(){

			self._showBlacklist = this.checked;
			self._newViewport(1);
			self.domFill();

		};

	};

	self.domCount = function(container){

		container = container || document.getElementById('contactsTotal');
		if(!container) return;
		var count = self._count();
		container.innerHTML = count ? count : '';

	};
	
	self.nameByAddr = function(addr, real){

		if(U.isMe(addr)) return U.currentNick(addr);
		real = real || false;

		for(var i in self._c) if(self._c[i].address === addr){

			return real ? self._c[i].ownName : self._c[i].name || self._c[i].ownName;

		}

		return '';

	};
	
	self.secureLevel = function(address){

		if(!addrIsInternal(address)) return 0;
		var contact;
		return !(contact = self.byAddress(address)) || !contact.verifiedKey ? 1 : 2;

	};

}

function cContact(address, name, type, folder){

	var self = this;
	self.address = address || '';
	self.name = name || '';
	self.ownName = self.name;
	self.id = newUuid();
	self.folder = folder || (F.folders[0] ? F.folders[0].id : '');
	self.type = type || 0;//0 - temparary, 1 - contacts, 2 - source, 3 - blacklist
	self._dom = null;

	self.currentKeys = { //keys ids in keyring

		signId : null,
		encId: null,
		time: null

	},

	self._toObject = function(){

		var res = [

			self.address,
			self.name,
			self.folder,
			self.type,

		];

		if(self.verifiedKey){

			res.push(self.verifiedKey.id);
			res.push(self.verifiedKey.time);

		}

		return res;

	};

	self._fromObject = function(object){

		if(object.length < 4) throw new Error(l[372]);
		self.address = object[0];
		self.name = object[1];
		var folderIndex = F.byId(object[2], true);
		self.folder = folderIndex && [1, 2, 4].indexOf(folderIndex) < 0 ? object[2] : F.folders[0].id;
		self.type = object[3];

		if(object.length > 4){

			self.verifiedKey = {

				id: object[4],
				time: object[5]

			};

		}

	};

	self.domEdit = function(){

		return new Promise(function(res){

			D.contact([self.name ? l[269].ucFirst() : l[186].ucFirst(), l[235].ucFirst() + ':', l[187].ucFirst() + ':', l[188].ucFirst() + ':'], [l[165].ucFirst(), l[164].ucFirst()], function(r){

				if(!r){

					D.h();
					return res(null);

				}

				submit.classList.remove('_loading');
				email.value = email.value.trim().toLowerCase();
				if(!email.value) return email.focus();
				var address = addrInternal(email.value), contact;

				if(address === U.login()){

					D.i([l[186].ucFirst(), l[123].ucFirst() + '!'], [l[0].ucFirst()]);
					return res(null);

				}

				if(!checkEmail(addrReal(address))){

					emailErrorBlock && emailErrorBlock.error();
					errorHint && (errorHint.innerHTML = l[111]);
					return email.focus();

				}

				name.value = clearTags(name.value.trim());
				if(!name.value) return name.focus();

				if((contact = C.byAddress(address))){

					if(contact.id !== self.id && contact.type){ //duplicate contact address
						
						D.i([l[186].ucFirst(), l[189].ucFirst() + '!'], [l[0].ucFirst()]);
						return res(null);

					}

					contact.name = name.value; //just change contact details
					contact.folder = select ? select.value : currentFolder.getAttribute('data-folder');
					contact.type = 1;
					D.h();
					res(contact);
					return;

				}

				C.getPublicKeys([address]).then(function(results){ //new contact address

					if(results === 'cancelled') return;

					if(!results.length){

						D.i([l[186].ucFirst(), l[87].ucFirst() + ' \'' + address + '\''], [l[0].ucFirst()]);
						return res(null);

					}

					D.h();
					if(!(contact = C.byAddress(address))) throw new Error(l[363]);
					C.byId(self.id) || (self = contact);
					self.address = address;
					self.name = name.value;
					self.folder = select ? select.value : currentFolder.getAttribute('data-folder');
					self.type = 1;
					res(self);

				}).catch(function(ex){

					I.e('cContact.domEdit', ex);

				});

			});

			var dialog = document.getElementById('dialog'),
				email = dialog.getElementById('email'),
				errorHint = dialog.getElementById('errorHint'),
				emailErrorBlock = dialog.getElementById('emailErrorBlock'),
				name = dialog.getElementById('name'),
				submit = dialog.getElementById('btnSubmit'),
				currentFolder = dialog.getElementById('currentFolder'),
				defaultFolderLink = dialog.getElementById('defaultFolderLink'),
				foldersList = dialog.getElementById('foldersList'),
				select = dialog.getElementById('folderSelect');

			email.addEventListener('blur', function(){

				this.value = this.value.toLowerCase();

			});

			email.value = addrReal(self.address);
			name.value = self.name;

			if(I.isDesktop){

				F.domSelectItems(select, [1, 2, 3, 4, navState.page[1]]);
				select.value = self.folder;
				new Chosen(select);

			}else{

				currentFolder.innerHTML = F.title(self.folder).ucFirst();
				currentFolder.setAttribute('data-folder', self.folder);

				new Dropdown(defaultFolderLink, foldersList, function(){

					var dropdown = ''.toDOM();
					F.domDropdownItems(dropdown, [1, 2, 4]);
					return dropdown;

				}.bind(this), function(clickedElem){

					var folderId = clickedElem.getAttribute('data-folder');
					currentFolder.setAttribute('data-folder', folderId);
					currentFolder.innerHTML = F.byId(folderId).title.ucFirst();

				});

			}

		});

	};
	
	self._verify = function(){

		return new Promise(function(res, rej){

			if(self.verifiedKey){

				delete(self.verifiedKey);
				U.netSave(['contacts']); //silent save
				return res(false);

			}

			D.c([l[352].ucFirst(), l[353].ucFirst() + ':<br /><br /><center><b id="verifyKeyId">' + l[356] + '...</b></center>', l[354]], [l[355].ucFirst(), l[164].ucFirst()], function(r){

				D.h();
				if(!r) return rej();
				self.verifiedKey = {id: self.currentKeys.signId, time: self.currentKeys.time};
				U.netSave(['contacts']); //silent save
				return res(true); //now cotact is verified

			});

			C.getPublicKeys(self.address).then(function(result){

				if(result === 'cancelled') return;

				if(self.currentKeys.signId){

					var id = self.currentKeys.signId.toUpperCase();
					id = id.substr(0, 4) + '-' + id.substr(4, 4) + '-' + id.substr(8, 4) + '-' + id.substr(12, 4);
					verifyKeyId.innerHTML = id;
					btnSubmit.show();

				}else verifyKeyId.innerHTML = l[139].ucFirst();

			});

			var verifyKeyId = document.getElementById('verifyKeyId'),
				btnSubmit = document.getElementById('btnSubmit');

			btnSubmit.hide();

		});

	};
	
	self.domRefresh = function(){

		if(!self._dom) return;

		var nick = self._dom.getElementById('nickname'),
			address = self._dom.getElementById('email'),
			initials = self._dom.getElementById('initials'),
			currentFolder = self._dom.getElementById('currentFolder');
			
		nick.innerHTML = self.name || '&nbsp;';
		if(self.address) address.innerHTML = addrReal(self.address);
		currentFolder.innerHTML = F.title(self.folder).ucFirst();

		if(!I.isDesktop){

			C._inSelected(self) && self._dom.classList.add('selected');
			self.verifiedKey ? self._dom.classList.add('verified') : self._dom.classList.remove('verified');
			initials && (initials.innerHTML = firstLetters(self.name) || '&nbsp;');

		}

	};

	self._domDelete = function(){

		if(!self._dom) return;
		self._dom.remove();
		self._dom = null;

	};

}