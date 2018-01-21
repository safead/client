'use strict';

function cFolders(){

	var self = this;
	self.folders = [];
	self.stats = {};
	self._mode = 0; //1 - mobile move mode

	self.setMode = function(mode, sentOnly){

		mode = mode || 0;
		self._mode = mode;

		for(var i = 0; i < self.folders.length; i++){

			self.folders[i]._dom.show();
			if(!self._mode) continue;
			if(sentOnly ? i !== 1 : [1, 2, 3, 4].indexOf(i) >= 0) self.folders[i]._dom.hide();

		}

	};

	self.add = function(title, className){

		title = clearTags(title);
		var folder = new cFolder(newUuid(), title);
		className && (folder._className = className);
		self.folders.push(folder);
		return folder;

	};

	self._delete = function(id){

		var idx = self.byId(id, true), toSave = ['settings'];
		if(!idx || idx < 5) return;
		self.folders[idx]._total && E.move([], {moveAll : [id, F.folders[3].id], trash : true});
		self.folders.splice(idx, 1);
		E.domBulkTools();
		DOM.adaptiveHeader();
		C.deleteFolder(id) && toSave.push('contacts');
		U.deleteFolder(id) && toSave.push('aliases');
		U.netSave(toSave); //silent save
		navState.page[0] === 'settings' && DOM.settings();
		navState.page[0] === 'inbox' && navState.page[1] === 3 && E.domInit();

	};

	self.haveCustomFolders = function(){

		return self.folders.length > 5;

	};

	self.byId = function(id, index){

		for(var i = 0; i < self.folders.length; i++) if(self.folders[i].id === id) return index ? i : self.folders[i];
		return null;

	};

	self.messagesCount = function(id){

		if(id){

			var folder = self.byId(id);
			return folder ? folder._total : 0;

		}else{

			var res = 0;
			for(var i = 0; i < self.folders.length; i++) i !== 4 && (res += self.folders[i]._total);
			self.stats['@'] && (res += self.stats['@'].total);
			return res;

		}

	};

	self.allIds = function(){

		var res = [];

		for(var i = 0; i < self.folders.length; i++){

			if(i === 4) continue;
			res.push(self.folders[i].id);

		}

		return res;

	};

	self.title = function(id){

		var folder = typeof id === 'number' ? self.folders[id] : self.byId(id);
		return folder ? folder.title : '';

	};

	self.asArray = function(ex){

		var res = [];

		for(var i = 0; i < self.folders.length; i++){

			if(ex && ex.indexOf(i) >= 0) continue;
			res.push([self.folders[i].id, self.folders[i].title.ucFirst()]);

		}

		return res;

	};

	self.toObject = function(){

		var res = [];
		for(var i = 0; i < self.folders.length; i++) res.push([self.folders[i].id, [0, 1, 2, 3, 4].indexOf(i) >= 0 ? i : self.folders[i].title]);
		return res;

	};

	self.fromObject = function(object){

		var title;
		self.folders = [];

		for(var i = 0; i < object.length; i++){

			switch(i){

			case 0:

				title = l[129];
				break;

			case 1:

				title = l[130];
				break;

			case 2:

				title = l[131];
				break;

			case 3:

				title = l[132];
				break;

			case 4:

				title = l[133];
				break;

			default:

				title = object[i][1];
				break;

			}

			self.folders.push(new cFolder(object[i][0], title));

		}

	};

	self.domFill = function(container){

		container.customClear();
		for(var i = 0; i < self.folders.length; i++) self.folders[i].domAdd(container);
		self.setStats();

	};

	self.domFillM = function(container){

		container.getElementById('foldersCustom').customClear();
		container.getElementById('foldersProtected').customClear();
		for(var i = 0; i < self.folders.length; i++) self.folders[i].domAddM(container.getElementById(self.byId(self.folders[i].id, true) > 4 ? 'foldersCustom' : 'foldersProtected'));
		self.setStats();

	};

	self.unread = function(){

		var unread = 0;
		for(var i in self.stats) i !== '@' && (unread += self.stats[i].new);
		DOM.appSetUnread(unread);
		return unread;

	};

	self.setStats = function(data, isUpdate){

		var starred = 0;
		data && (self.stats = data);
		if(!self.folders.length) return;

		for(var i = 0; i < self.folders.length; i++){

			if(!self.stats[self.folders[i].id]) continue;

			if(

				isUpdate &&
				self.folders[i]._total < self.stats[self.folders[i].id].total &&
				((I.inMessages() && navState.page[1] === i) || E.emails.haveForFolder(self.folders[i].id, true))

			) E.loadFreshEmails(self.folders[i].id);

			self.folders[i]._total = self.stats[self.folders[i].id].total;
			self.folders[i]._new = self.stats[self.folders[i].id].new;
			self.folders[i]._domUpdateCount();

		}

		for(i in self.stats) starred += self.stats[i].starred;
		self.folders[4]._total = starred;
		self.folders[4]._domUpdateCount();
		self.unread();

	};

	self.increaseStarred = function(folderId){

		self.stats[folderId] || (self.stats[folderId] = {new: 0, size: 0, starred: 0, total: 0});
		self.stats[folderId].starred++;
		var folder = self.byId(folderId);
		if(!folder) return;
		folder._domUpdateCount();

	};

	self.decreaseStarred = function(folderId){

		self.stats[folderId] && self.stats[folderId] && self.stats[folderId].starred--;
		var folder = self.byId(folderId);
		if(!folder) return;
		folder._domUpdateCount();

	};

	self.increaseTotal = function(folderId){

		var folder = self.byId(folderId);
		if(!folder) return;
		self.stats[folderId] || (self.stats[folderId] = {new: 0, size: 0, starred: 0, total: 0});
		self.stats[folderId].total++;
		folder._total++;
		folder._domUpdateCount();

	};

	self.decreaseTotal = function(folderId){

		self.stats[folderId] && self.stats[folderId].total && self.stats[folderId].total--;
		var folder = self.byId(folderId);
		if(!folder) return;
		folder._total && folder._total--;
		folder._domUpdateCount();
		self.unread();

	};

	self.increaseUnread = function(folderId){

		self.stats[folderId] || (self.stats[folderId] = {new: 0, size: 0, starred: 0, total: 0});
		self.stats[folderId].new++;
		var folder = self.byId(folderId);
		if(!folder) return;
		folder._new++;
		folder._domUpdateCount();
		self.unread();

	};

	self.decreaseUnread = function(folderId){

		self.stats[folderId] && self.stats[folderId].new && self.stats[folderId].new--;
		var folder = self.byId(folderId);
		if(!folder) return;
		folder._new && folder._new--;
		folder._domUpdateCount();
		self.unread();

	};

	self.haveUnsorted = function(){

		return self.stats['@'] && self.stats['@'].total;

	};

	self.domActive = function(id){

		if(!I.isDesktop) return;
		var elem = document.getElementById('contactsTitle');
		if(elem) navState.page[0] === 'contacts' ? elem.classList.add('active') : elem.classList.remove('active');
		elem = document.getElementById('filesTitle');
		if(elem) navState.page[0] === 'storage' ? elem.classList.add('active') : elem.classList.remove('active');
		isInteger(id) && (id = parseInt(id));
		var folderTitle;

		for(var i = 0; i < self.folders.length; i++){

			if(!self.folders[i]._dom) continue;
			folderTitle = self.folders[i]._dom.getElementById('title');

			if(typeof id === 'number'){

				id === i ? folderTitle.classList.add('active') : folderTitle.classList.remove('active');

			}else id === self.folders[i].id ? folderTitle.classList.add('active') : folderTitle.classList.remove('active');

		}

	};

	self.domDropdownItems = function(container, exclude){

		var df, elem;

		for(var i = 0; i < self.folders.length; i++){

			if(exclude && (typeof exclude === 'number' ? i !== exclude : exclude.indexOf(i) >= 0)) continue;
			df = I.template(I.isDesktop ? 'popup item' : 'dropdown value');
			elem = df.getElementById('title');
			elem.innerHTML = clearTags(self.folders[i].title).ucFirst();
			elem.removeAttribute('id');
			df.firstChild.setAttribute('data-folder', self.folders[i].id);
			container.appendChild(df);

		}

	};

	self.domSelectItems = function(select, exclude){

		var elem;

		for(var i = 0; i < self.folders.length; i++){

			if(exclude && exclude.indexOf(i) >= 0) continue;
			elem = document.createElement('option');
			elem.innerHTML = clearTags(self.folders[i].title).ucFirst();
			elem.value = self.folders[i].id;
			select.appendChild(elem);

		}

	};

}

function cFolder(id, title){

	var self = this;
	self.id = id;
	self.title = clearTags(title);
	self._total = 0;
	self._new = 0;
	self._size = 0;
	self._className = null;
	self._dom = null;
	self._expanded = false;

	self.domAdd = function(container){

		var custom = F.byId(self.id, true) > 4, df = I.template(custom ? 'custom folder' : 'folder');
		self._dom = df.firstChild;
		self._domCount = self._dom.getElementById('count');
		self._newBlock = self._dom.getElementById('newBlock');
		self._countNew = self._dom.getElementById('countNew');

		var _clicked = function(folderId){

			I.switchPaging(0);
			I.setSort(-1, 1);
			I.changePage('inbox/' + F.byId(folderId, true));

		};

		var el = self._dom.getElementById('title');
		el.innerHTML = self.title.ucFirst();

		el.onclick = function(){

			_clicked(self.id);

		};

		if(custom){ //custom folders

			self._dom.ondragstart = function(e){

				e.dataTransfer.setData('text', self.id);

			};

			self._dom.ondragover = function(e){

				e.preventDefault();

			};

			self._dom.ondrop = function(e){

				e.preventDefault();
				var movingFolderId = e.dataTransfer.getData('text'), movingFolder = F.byId(movingFolderId);
				if(movingFolderId === self.id) return;
				F.folders.splice(F.byId(movingFolderId, true), 1);
				F.folders.splice(F.byId(self.id, true), 0, movingFolder);
				var elem = document.getElementById('folders');
				elem.customClear();
				F.domFill(elem);
				F.setStats();
				U.netSave(['settings']); //silent save
				_clicked(movingFolderId);

			};

			self._dom.getElementById('arrow').addEventListener('click', function(){

				new Popup(I.template('folder popup'), self._dom.getElementById('folderPopup'), function(popupNodes){

					popupNodes.getElementById('edit').addEventListener('click', function(){ //insert edit block

						self._dom.getElementById('folderBlock').hide();
						var el = self._dom.getElementById('editBody');
						el.appendChild(I.template('folder change'));
						el.show();
						var input = self._dom.getElementById('input');
						input.value = self.title;

						self._dom.getElementById('cancel').addEventListener('click', function(){

							var elem = self._dom.getElementById('editBody');
							el.hide();
							elem.customClear();
							self._dom.getElementById('folderBlock').show();

						});

						self._dom.getElementById('save').addEventListener('click', function(){

							input.value = input.value.trim();
							if(!input.value) return input.focus();
							self.title = clearTags(input.value);
							self._dom.getElementById('title').innerHTML = self.title.ucFirst();
							self._dom.getElementById('cancel').click();
							C.folderNameChanged(self.id);
							navState.page[0] === 'settings' && DOM.settings();
							U.netSave(['settings']); //silent save

						});

						input.addEventListener('keydown', function(e){

							if(e.keyCode === 13){

								self._dom.getElementById('save').click();

							}else if(e.keyCode === 27){

								self._dom.getElementById('cancel').click();

							}

						});

						input.focus();

					});

					popupNodes.getElementById('delete').addEventListener('click', function(){ //delete folder

						var _delete = function(){

							if(F.byId(self.id, true) === navState.page[1]) I.changePage('inbox/0');
							self._dom.remove();
							F._delete(self.id);

						};

						if(self._total){

							D.c([l[145], l[146].ucFirst()],  [l[1].ucFirst(), l[2].ucFirst()], function(r){

								D.h();
								if(r) _delete();

							});

						}else _delete();

					});

					popupNodes.getElementById('feedback').addEventListener('click', function(){ //get feedback code

						D.t([l[392], l[393].ucFirst() + ':'], [l[304].ucFirst(), l[164].ucFirst()], function(r){

							if(!r) return D.h();
							input.value = clearTags(input.value.trim());

							A.getFeedbackId(input.value, U.login()).then(function(response){

								if(response === 'cancelled') return;
								var code = '<script> var secureFeedbackButtonId = \'ID_OF_ELEMENT_ON_YOUR_PAGE\' </script>\n';
								code += '<script src="https://' + config.domain + '/js/feedback/embedded.js?' + response.id + '" id="secureFeedbackScript"></script>';

								D.s([l[392], l[394].ucFirst() + ':', l[395]], [l[396].ucFirst(), l[164].ucFirst()], function(r){

									if(!r) return D.h();
									C.add(new cContact('', input.value, 2, self.id));
									U.netSave(['contacts']); //silent save
									C.domCount(document.getElementById('contactsTotal'));
									C.domFill();
									document.getElementById('popupTextarea').select();

									try{

										document.execCommand('copy');
										D.h();

									}catch(e){

										alert('Failed to autocopy, please copy manually');

									}

								});

								document.getElementById('popupTextarea').value = code;

							}).catch(function(ex){

								D.i([l[50], ex.message.ucFirst()], [l[0].ucFirst()]);

							});

						});

						var iconCheck = document.getElementById('iconCheck'),
							input = document.getElementById('inputValue'),
							submit = document.getElementById('btnSubmit');

						iconCheck.hide();
						input.setAttribute('maxlength', 30);
						input.addEventListener('input', function(){

							submit.disabled = !this.value.trim();

						});

					});

					return popupNodes;

				}.bind(this));

			});

		}

		container.appendChild(df);

	};

	self.domAddM = function(container){

		var custom = F.byId(self.id, true) > 4, df = I.template(custom ? 'custom folder' : 'folder');
		self._dom = df.firstChild;
		self._domCount = self._dom.getElementById('count');
		self._newBlock = self._dom.getElementById('newBlock');
		self._countNew = self._dom.getElementById('countNew');
		self._dom.getElementById('title').innerHTML = self.title.ucFirst(); //title

		self._dom.onclick = function(){

			if(!F._mode){

				if(self._expanded) return;
				I.clickSound();
				I.changePage('inbox/' + F.byId(self.id, true));

			}else I.panelLeft.finalize(self.id);

		};

		if(custom){

			self._dom.getElementById('arrow').onclick = function(e){

				e.stopPropagation();
				e.preventDefault();
				if(F._mode) return;
				self._expand(!self._expanded);

			};

		}else{

			var el = self._dom.getElementById('icon'); //icon

			switch(self.title){

			case l[129]:

				el.classList.add('i-inbox');
				break;

			case l[130]:

				el.classList.add('i-isent');
				break;

			case l[131]:

				el.classList.add('i-draft');
				break;

			case l[132]:

				el.classList.add('i-busket');
				break;

			case l[133]:

				el.classList.add('i-star-grey');
				el.classList.add('active');
				break;

			}

		}

		container.appendChild(df);

	};

	self._expand = function(expand){

		self._expanded = expand;
		expand ? self._dom.classList.add('opened') : self._dom.classList.remove('opened');

		if(self._expanded){

			I.clickSound();
			self._dom.getElementById('changeBlock').appendChild(I.template('folder change'));

			var input = self._dom.getElementById('input'),
				btnSave = self._dom.getElementById('save'),
				btnDelete = self._dom.getElementById('delete');

			if(app){

				I.keyboardActions(function(){

					input.value && btnSave.click();

				}, function(){

					input.value && btnSave.click();

				}, function(){

					input.value && btnSave.click();

				}, null);

			}

			input.value = self.title;
			input.focus();

			input.onblur = function(){

				setTimeout(function(){

					self._expand(false);

				}, 0);

			};

			btnSave.onclick = function(e){

				e.stopPropagation();
				e.preventDefault();
				input.value = clearTags(input.value.trim());
				if(!input.value || self.title === input.value) return;
				self.title = input.value;
				input.value = '';
				self._dom.getElementById('title').innerHTML = self.title.ucFirst();
				C.folderNameChanged(self.id);
				U.netSave(['settings']); //silent save

			};

			btnDelete.onclick = function(e){

				e.stopPropagation();
				e.preventDefault();

				var _delete = function(){

					F.byId(self.id, true) === navState.page[1] && I.changePage('inbox/0');
					self._dom.remove();
					F._delete(self.id);

				};

				if(self._total){

					I.panelLeft.close().then(function(){

						D.c([l[145].ucFirst(), l[146].ucFirst()],  [l[1].ucFirst(), l[2].ucFirst()], function(r){

							D.h();
							r && _delete();

						});

					});

				}else _delete();

			};

		}else self._dom.getElementById('changeBlock').customClear();

	};

	self._domUpdateCount = function(){

		if(!self._dom) return;

		if(self._domCount.innerHTML !== self._total){

			self._total ? self._domCount.show() : self._domCount.hide();
			self._domCount.innerHTML = self._total;

		}

		self._countNew.innerHTML = self._new;
		self._new ? self._countNew.show() : self._countNew.hide();
		self._newBlock && (self._new && self.title !== l[132] ? self._newBlock.show() : self._newBlock.hide());

	};

}