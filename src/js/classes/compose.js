'use strict';

function cCompose(){

	var self = this;
	self._message = new cMessage();
	self._message.message = '';
	self._message.subject = '';
	self._message.to = [];
	self._message.cc = [];
	self._message.bcc = [];
	self._message.encrypted = false;
	self._message.attaches = new cFiles(2);
	self._source = new cMessage();
	self._source.id = null;
	self._source.message = '';
	self._source.subject = '';
	self._source.ttl = U.maxTTL();
	self._source.encrypted = false;
	self._source.attaches = new cFiles(2);
	self._replyTo = null;
	self._resizerMessageM = null;
	self._resizerSubjectM = null;
	self._resizer = null;
	self._changed = false;
	self._to = {recipients: []};
	self._cc = {recipients: []};
	self._bcc = {recipients: []};
	self._addContactsTo = 0; //0 to, 1 cc, 2 bcc
	self._messageBody = null;
	self._domMessageSignature = null;
	self._readyForActions = false;

	self._message.attaches.onready = function(){

		self._readyToSend(true);

	};

	self._message.attaches.ondelete = function(records){

		if(self._source.id){ //remember deleted files

			var deleted = records.map(function(x){ return [x[0], x[1], self._source.id, x[3]]; });
			self._message.deletedFiles || (self._message.deletedFiles = []);
			self._message.deletedFiles = self._message.deletedFiles.concat(deleted);

		}

		self._readyToSend(true);

	};

	self.reset = function(){

		self._message.attaches.free(true);
		self = W = new cCompose();

	};

	self._recipients = function(){

		return self._to.recipients.concat(self._cc.recipients).concat(self._bcc.recipients);

	};

	self._subjectSet = function(val){

		val = val || '';
		val && (val = clearTags(val.trim().replace(/[\n\r]/g, '')));
		if(self._message.subject === val) return;
		self._message.subject = val;
		self._readyToSend(true);

	};

	self._bodySet = function(val){

		val = val || '';
		self._message.message = val.trim();
		self._readyToSend(true);

	};

	self._ttlSet = function(val){

		val = parseInt(val);
		if(self._message.ttl === val) return;
		self._message.ttl = val;
		self._readyToSend(true);

	};

	self.empty = function(){

		return !(self._message.subject || self._message.message || self._message.attaches.files.length || self._to.recipients.length);

	};

	self._hasExternalRecipients = function(){

		return self._to.hasExternalRecipients() || self._cc.hasExternalRecipients() || self._bcc.hasExternalRecipients() || false;

	};

	self._hasInternalRecipients = function(){

		return self._to.hasInternalRecipients() || self._cc.hasInternalRecipients() || self._bcc.hasInternalRecipients() || false;

	};

	self._hasExternalRecipientsNew = function(){

		return self._to.hasExternalRecipientsNew() || self._cc.hasExternalRecipientsNew() || self._bcc.hasExternalRecipientsNew() || false;

	};

	self._domSubject = function(){

		document.getElementById('subject').value = self._message.subject;
		I.isDesktop || self._resizerSubjectM.change();

	};

	self._domEncryption = function(){

		var encryptionBlock = document.getElementById('encrypted');
		if(!self._hasExternalRecipients()) return encryptionBlock.hide();
		var encryptedText = document.getElementById('encryptedText'),
			encryptedIco = document.getElementById('encryptedIco');

		if(self._message.encrypted){

			encryptedIco.className = 'i i-locked';
			encryptedText && (encryptedText.innerHTML = l[520].ucFirst());

		}else{

			encryptedIco.className = 'i i-unlocked';
			encryptedText && (encryptedText.innerHTML = l[539].ucFirst());

		}

		encryptionBlock.show();
		self._resizer && self._resizer.resize();

	};

	self._domTTL = function(){

		self._message.ttl = self._message.ttl || U.maxTTL();
		var domTTL = document.getElementById('ttl');

		if(I.isDesktop){

			var userTTL = options['u' + U.class()]['t'],
				elem;

			for(var i in userTTL){

				elem = document.createElement('option');
				elem.innerHTML = userTTL[i];
				elem.value = i;
				domTTL.appendChild(elem);

			}

			domTTL.onchange = function(){

				self._ttlSet(this.value);

			};

			self._message.ttl && (domTTL.value = self._message.ttl);
			new Chosen(domTTL);

		}else{

			new Dropdown(document.getElementById('ttlBlock'), document.getElementById('botMenu'), function(){

				var dropdown = ''.toDOM(), df, elem;

				for(var i in options['u' + U.class()]['t']){

					df = I.template('dropdown item');
					elem = df.getElementById('title');
					elem.innerHTML = options['u' + U.class()]['t'][i];
					elem.removeAttribute('id');
					df.firstChild.setAttribute('data-ttl', i);
					if(self._message.ttl === parseInt(i)) elem.classList.add('b');
					dropdown.appendChild(df);

				}

				return dropdown;

			}.bind(this), function(clickedElem){

				self._ttlSet(clickedElem.getAttribute('data-ttl'));

			});

		}

	};

	self.lost = function(newPage){

		if(['contacts', 'storage', 'compose'].indexOf(newPage[0]) >= 0) return Promise.resolve(true);

		return new Promise(function(res){

			var _answer = function(result){

				setTimeout(function(){

					res(result);

				}, 50);

			};

			if(self.empty() || !self._isChanged()){

				self.reset();
				return res(true);

			}

			D.b3([l[75].ucFirst(), l[332].ucFirst() + '?'], [l[I.isDesktop ? 334 : 184].ucFirst(), l[554].ucFirst(), l[I.isDesktop ? 184 : 334].ucFirst()], function(result){

				D.h();

				switch(result){

				case true:

					self.reset();
					return _answer(true);

				case false:

					return _answer(false);

				default:

					self._send({draft: true, silent: true});
					return _answer(true);

				}

			});

		});

	};

	self._deployRedactor = function(){

		if(I.isDesktop){

			tinymce.init({

				selector: 'textarea.tiny',
				menubar : false,
				statusbar : false,
				toolbar: 'undo redo | bullist numlist table | alignleft alignright aligncenter alignjustify | indent outdent forecolor backcolor charmap | styleselect fontselect fontsizeselect',
				plugins: 'legacyoutput autolink paste table lists charmap textcolor',
				paste_data_images: true,
				browser_spellcheck: true,
				convert_fonts_to_spans : true,

				setup: function(editor){
	
					editor.on('init', function(){

						self._resizer = new RedactorHeight('tinyBlock');
						editor.setContent(self._message.message);
						(self._recipients().length ? editor : self._to).focus();

					});

					editor.on('keydown', function(e){

						if(e.ctrlKey && e.keyCode === 13) tinymce.dom.Event.cancel(e);

					});

					editor.on('click', function(){

						I.container.click();

					});

					editor.on('keyup', function(e){

						if(!self._readyForActions) return;
						if(e.ctrlKey && e.keyCode === 13) return self._preSend();
						self._bodySet(tinymce.activeEditor.getContent());

					});

					editor.on('paste undo redo', function(){

						setTimeout(function(){

							if(!self._readyForActions) return;
							self._bodySet(tinymce.activeEditor.getContent());

						}, 100);
						
					});

				},

			});

		}else{
			
			var textarea = document.getElementById('messageText'),
				technicalDiv = document.getElementById('technicalDiv');

			I.addBodyListener('click', function(e){ //redactor focus

				if(['contentBody', 'composeTop', 'composeArticle', 'messageAttaches'].indexOf(e.target.id) >= 0) textarea.focus();

			});

			textarea.onfocus = function(){

				if(this.value || window.screen.availHeight > 500) return;
				document.getElementById('contentBody').scrollTop = document.getElementById('to').offsetHeight + document.getElementById('cc').offsetHeight + document.getElementById('bcc').offsetHeight + document.getElementById('subjectBlock').offsetHeight;

			};

			var _clipboardOperation = function(){

				setTimeout(function(){

					self._bodySet(textarea.value);

				}, 0);

			};

			textarea.value = clearTags(self._message.message) || '';
			textarea.onkeyup = _clipboardOperation;
			textarea.onpaste = _clipboardOperation;
			textarea.oncut = _clipboardOperation;
			self._resizerMessageM = new TextareaResizer(textarea, technicalDiv, 2);

		}

	};

	self.new = function(recipients, subject, message, files, replyData){

		recipients = recipients || [];
		subject = subject || '';
		self.reset();
		self._replyTo = replyData || null;

		if(self._replyTo){

			self._replyTo.replyHTML = self._replyTo.data.getBody(self._replyTo.mode !== 'forward');
			self._replyTo.mode === 'forward' && (subject = 'Fwd: ' + self._message.originalSubject(subject));
			self._replyTo.active = self._replyTo.data.replyActive || false;

			if(self._replyTo.mode === 'forward'){

				self._replyTo.active = true;

			}else{

				self._message.inReplyTo = self._replyTo.data.externalId || self._replyTo.data.id + '@' + config.domain;
				self._message.addReference(self._replyTo.data.references, self._message.inReplyTo);

			}

			var checkAddr = self._replyTo.data.getSender();

			if(U.isMe(checkAddr)){

				U.switchAlias(checkAddr);

			}else for(var allTo = self._replyTo.data.allTo({myOwn : true}), i = 0; i < allTo.length; i++) U.isMe(allTo[i]) && U.switchAlias(allTo[i]);

			delete(self._replyTo.data);

		}

		self._subjectSet(subject);
		self._bodySet(message);

		if(files){

			self._message.attaches = files;
			self._readyToSend(true);

		}

		I.changePage('compose').then(function(){

			var promises = [];
			recipients.length && promises.push(self._to.recipientsCheck(recipients.map(function(x){ return x; })));

			if(self._replyTo && self._replyTo.copies && self._replyTo.copies.length){

				self._domCcBcc(true);
				promises.push(self._cc.recipientsCheck(self._replyTo.copies));

			}

			return Promise.all(promises);

		});

	};

	self.addElements = function(recipients, files){

		recipients = recipients || [];
		files = files || [];
		recipients instanceof Array || (recipients = [recipients]);
		files instanceof Array || (files = [files]);

		I.pageBackward('compose', DOM.inSelectionMode() ? {} : {noSubs : true}).then(function(){

			if(files.length){

				var filesCount = self._message.attaches.files.length;
				self._message.attaches.addFiles(document.getElementById('messageAttaches'), files, {limit: options['u' + U.class()]['a']});
				filesCount === self._message.attaches.files.length || self._readyToSend(true);

			}

			if(recipients.length){

				var to = self._addContactsTo ? (self._addContactsTo === 1 ? self._cc : self._bcc) : self._to;
				self._addContactsTo && self._domCcBcc(true);
				to.recipientsCheck(recipients.map(function(x){ return x.address; }));

			}else self._readyToSend();

		});

	};

	self.init = function(){

		navState.sort = 0;

		var _fillFunc = function(){

			document.getElementById(I.isDesktop ? 'btnDraft' : 'draftTitle').innerHTML = l[navState.page[1] ? 165 : 135].ucFirst();
			(I.isDesktop ? DOM.title : DOM.titleM)(l[navState.page[1] ? 135 : 72].ucFirst());

			if(

				self._cc.recipients.length ||
				self._bcc.recipients.length ||
				(self._source.draft instanceof Array && self._source.draft.length) ||
				(self._source.draft && self._source.draft.cc instanceof Array && self._source.draft.cc.length) ||
				(self._source.draft && self._source.draft.bcc instanceof Array && self._source.draft.bcc.length)

			) self._domCcBcc(true);

			self._domReplyTo();
			self._domSubject();
			self._domTTL();
			self._message.attaches.domFill(document.getElementById('messageAttaches'), -1);
			DOM.loader();

		};

		return self._domInit().then(function(){

			if(!navState.page[1] || self._changed){

				_fillFunc();
				self._deployRedactor();
				self._readyToSend();
				return;

			}

			E.waitingForMessageId = navState.page[1];

			return E.loadEmails(F.folders[2].id).then(function(){ //draft message

				var message;
				if(!(message = E.byId(navState.page[1]))) return;
				self._source = message;
				self._message.message = I.isDesktop ? self._source.message : (self._source.message ? self._source.message.replace(/<br\s\/>/g, '\n') : '');
				self._message.subject = self._source.subject || '';
				self._message.ttl = self._source.draftTTL;
				self._message.encrypted = self._source.encrypted || false;
				_fillFunc();
				var promises = [];

				if(self._source.attaches && !self._source.attaches.files.length){

					var messageFiles = {};
					messageFiles[self._source.id] = self._source.attachesIds.map(function(x){ return x[0]; });
					promises.push(self._source.attaches.get(self._source.channel.id, [messageFiles], true));

				}

				if(self._source.draft){

					self._source.draft instanceof Array && self._source.draft.length && promises.push(self._to.recipientsCheck(self._source.draft.map(function(x){ return x; })));
					self._source.draft.to instanceof Array && self._source.draft.to.length && promises.push(self._to.recipientsCheck(self._source.draft.to.map(function(x){ return x; })));
					self._source.draft.cc instanceof Array && self._source.draft.cc.length && promises.push(self._cc.recipientsCheck(self._source.draft.cc.map(function(x){ return x; })));
					self._source.draft.bcc instanceof Array && self._source.draft.bcc.length && promises.push(self._bcc.recipientsCheck(self._source.draft.bcc.map(function(x){ return x; })));

					if(self._source.draft.replyHTML){

						self._replyTo = {mode: 'reply'};

						if(self._source.draft.replyHTML){

							self._replyTo.replyHTML = self._source.draft.replyHTML;
							self._source.draft.replyActive && (self._replyTo.active = self._source.draft.replyActive);

						}

						self._domReplyTo();

					}

					self._source.draft.inReplyTo && (self._message.inReplyTo = self._source.draft.inReplyTo);
					self._source.draft.references && (self._message.references = self._source.draft.references.slice());
					self._deployRedactor();

				}

				return Promise.all(promises).then(function(){

					self._source.attaches && self._source.attaches.files.length && self._message.attaches.copy(self._source.attaches);
					self._message.attaches.domFill(document.getElementById('messageAttaches'));
					self._readyToSend();

				});

			});

		});

	};

	self._domCcBcc = function(show){

		show = show || false;
		show ? cc.classList.remove('hide') : cc.classList.add('hide');
		show ? bcc.classList.remove('hide') : bcc.classList.add('hide');

		if(I.isDesktop){

			if(show){

				openCcBcc.classList.remove('icon-dropdown');
				openCcBcc.classList.add('icon-dropdown-up');

			}else{

				openCcBcc.classList.remove('icon-dropdown-up');
				openCcBcc.classList.add('icon-dropdown');

			}

		}else show ? toTools.classList.add('opened') : toTools.classList.remove('opened');

	};

	self._uniqRecipients = function(caller){

		caller.recipients.forEach(function(x){

			caller === self._to || self._to.recipientDelete(x.id);
			caller === self._cc || self._cc.recipientDelete(x.id);
			caller === self._bcc || self._bcc.recipientDelete(x.id);

		});

	};

	self.composeToolsVisibility = function(show){

		if(I.isDesktop) return;
		var composeTools = document.getElementById('composeTools');
		show ? composeTools.show() : composeTools.hide();

	};

	self._readyToSend = function(changed, newRecipient){

		changed && (self._changed = true);
		if(['compose'].indexOf(navState.page[0]) < 0) return;
		self._domEncryption();
		newRecipient && self._uniqRecipients(this); //unique recipients
		self._hasInternalRecipients() || self._message.encrypted ? ttlBlock.show() : ttlBlock.hide();

		var draft = document.getElementById('btnDraft'),
			submit = document.getElementById('btnSend'),
			attachesReady = self._message.attaches.ready();

		if(

			!attachesReady ||
			!self._message.to.length ||
			!(
				(self._message.message || self._message.attaches.files.length) ||
				self._replyTo && self._replyTo.mode === 'forward'
			)

		){

			I.isDesktop ? submit.disabled = true : submit.classList.add('disabled');

		}else I.isDesktop ? submit.disabled = false : submit.classList.remove('disabled');

		!attachesReady || self.empty() || !self._isChanged() ? (I.isDesktop ? draft.disabled = true : draft.classList.add('disabled')) : (I.isDesktop ? draft.disabled = false : draft.classList.remove('disabled'));
	
	};

	self._isChanged = function(){

		if(

			self._source.message !== self._message.message ||
			self._source.subject !== self._message.subject ||
			self._source.encrypted !== self._message.encrypted ||
			self._source.draftTTL && self._source.draftTTL !== self._message.ttl

		) return true;

		if(self._source.draft){ //draft recipients

			if(self._replyTo && (self._replyTo.active !== self._source.draft.replyActive)) return true;
			if(self._source.draft instanceof Array && !self._source.draft.equals(self._to.recipients.map(function(x){ return x.address; }))) return true;
			if(self._source.draft.to instanceof Array){

				if(!self._source.draft.to.equals(self._to.recipients.map(function(x){ return x.address; }))) return true;

			}else if(self._to.recipients.length) return true;

			if(self._source.draft.cc instanceof Array){

				if(!self._source.draft.cc.equals(self._cc.recipients.map(function(x){ return x.address; }))) return true;

			}else if(self._cc.recipients.length) return true;

			if(self._source.draft.bcc instanceof Array){

				if(!self._source.draft.bcc.equals(self._bcc.recipients.map(function(x){ return x.address; }))) return true;

			}else if(self._bcc.recipients.length) return true;

		}else if(self._to.recipients.length || self._cc.recipients.length || self._bcc.recipients.length) return true;

		if(self._source.attaches){

			if(self._source.attaches.files.length !== self._message.attaches.files.length) return true;
			for(var i in self._source.attaches.files) if(!self._source.attaches.files[i].equals(self._message.attaches.files[i])) return true;

		}else if(self._message.attaches.files.length) return true;

		return false;

	};

	self._domInit = function(){

		var btnSend = document.getElementById('btnSend'),
			btnDraft = document.getElementById('btnDraft'),
			btnDiscard = document.getElementById('discard'),
			subject = document.getElementById('subject'),
			addContactsSafe = document.getElementById('addContactsSafe'),
			addContactsSafeCc = document.getElementById('addContactsSafeCc'),
			addContactsSafeBcc = document.getElementById('addContactsSafeBcc'),
			addFilesSafe = document.getElementById('addFilesSafe'),
			attachesAdd = document.getElementById('attachesAdd'),
			attachesContainer = document.getElementById('messageAttaches'),
			encrypted = document.getElementById('encrypted'),
			to = document.getElementById('to'),
			cc = document.getElementById('cc'),
			bcc = document.getElementById('bcc'),
			openCcBcc = document.getElementById('openCcBcc'),
			messageSignature = document.getElementById('messageSignature');

		//TITLES

		I.pageTitle(config.domain.ucFirst() + ' - ' + l[self._source.id ? 135 : 72].ucFirst());

		//RECIPIENTS BLOCK

		self._to = new RecipientsBlock(to, self._readyToSend, self._to.recipients);
		self._cc = new RecipientsBlock(cc, self._readyToSend, self._cc.recipients);
		self._bcc = new RecipientsBlock(bcc, self._readyToSend, self._bcc.recipients);
		self._message.to = self._to.recipients;
		self._message.cc = self._cc.recipients;
		self._message.bcc = self._bcc.recipients;

		//SUBJECT

		subject.onblur = function(){

			if(!self._readyForActions) return;
			self._subjectSet(this.value);
			self._readyToSend();

		};

		subject.onkeyup = function(e){

			if(!self._readyForActions) return;
			e.preventDefault();
			self._subjectSet(this.value);

			if(this.scrollHeight > 34 && this.scrollHeight <= 68){

				this.classList.add('twoRows');

			}else if(this.scrollHeight > 68){

				this.classList.add('threeRows');

			}

		};

		I.isDesktop || (self._resizerSubjectM = new TextareaResizer(subject, technicalDiv, 0));

		//CARBON COPIES

		openCcBcc && (openCcBcc.onclick = function(e){

			if(!self._readyForActions) return;
			I.clickSound();
			e && e.stopPropagation();
			self._domCcBcc(cc.classList.contains('hide'));

		});

		//ADD CONTACTS

		addContactsSafe && (addContactsSafe.onclick = function(e){

			if(!self._readyForActions) return;
			I.clickSound();
			self._addContactsTo = 0;
			e.stopPropagation();
			e.preventDefault();
			I.changePage('contacts');

		});

		addContactsSafeCc && (addContactsSafeCc.onclick = function(e){

			if(!self._readyForActions) return;
			I.clickSound();
			self._addContactsTo = 1;
			e.stopPropagation();
			e.preventDefault();
			I.changePage('contacts');

		});

		addContactsSafeBcc && (addContactsSafeBcc.onclick = function(e){

			if(!self._readyForActions) return;
			I.clickSound();
			self._addContactsTo = 2;
			e.stopPropagation();
			e.preventDefault();
			I.changePage('contacts');

		});

		//DISCARD

		btnDiscard.onclick = function(e){

			if(!self._readyForActions) return;
			I.clickSound();
			e.preventDefault();
			self.reset();
			I.pageBackward('inbox');

		};

		//ENCRYPTION

		encrypted.onclick = function(){

			if(!self._readyForActions) return;
			I.clickSound();
			self._message.encrypted = !self._message.encrypted;
			self._readyToSend(true);

		};

		//ATTACHES

		self._message.attaches.fileUploads(attachesContainer);

		attachesAdd.onclick = function(){

			I.clickSound();

			self._message.attaches.processNewFiles(attachesContainer, function(result){

				result === true ? I.changePage('storage') : self._readyToSend();

			}, {safeStorage: true, limit: options['u' + U.class()]['a']});

		};

		addFilesSafe && (addFilesSafe.onclick = function(){

			I.changePage('storage');

		});

		U.sig() && (!self._replyTo || self._replyTo.mode !== 'forward') && (self._domMessageSignature = new MessageBody(messageSignature, U.sig(), function(height){

			messageSignature.style.height = (height + 'px');
			messageSignature.show();

		}, {editable: true}));

		//DRAFT BUTTON

		btnDraft.onclick = function(){

			if(!self._readyForActions) return;
			self._preSend(true);

		};

		//SEND BUTTON

		btnSend.onclick = self._preSend;
		subject.catchCtrlEnter(self._preSend);

		//IOS INDENT FIXES

		client.ios() && technicalDiv.classList.add('narrow');
		self._readyForActions = true;
		return Promise.resolve();

	};

	self._domReplyTo = function(){

		var messageBody = document.getElementById('messageBody');
			
		var _replyBody = function(){

			messageBody.show();
			if(messageBody.getElementById('bodyIframe')) return;

			self._messageBody = new MessageBody(messageBody, self._replyTo.replyHTML, function(height){

				messageBody.style.height = (height + 'px');
				messageBody.show();

			}, {editable: true});

		};

		if(self._replyTo){

			self._replyTo.active && _replyBody();

			if(self._replyTo.mode !== 'forward'){

				attachPreviousMessageBlock.show();

				attachPreviousMessage.checked = self._replyTo.active;

				(app ? attachPreviousMessageBlock : attachPreviousMessage).onclick = function(){

					I.clickSound();
					app && (attachPreviousMessage.checked = !attachPreviousMessage.checked);
					self._replyTo.active = attachPreviousMessage.checked;
					self._readyToSend(true);

					if(self._replyTo.active){

						_replyBody();

					}else messageBody.hide();

				};

			}else attachPreviousMessageBlock.hide();

		}

	};

	self._preSend = function(draft){

		if(!self._readyForActions) return;
		draft = typeof draft === 'boolean' ? draft : false;

		if(

			(draft && (btnDraft.disabled || btnDraft.classList.contains('disabled'))) ||
			(!draft && (btnSend.disabled || btnSend.classList.contains('disabled')))

		) return; //not ready to send

		if((self._to.recipients.length + self._cc.recipients.length + self._bcc.recipients.length) >= options['u' + U.class()]['r']) return I.upgradeDialog(l[63].ucFirst() + ': ' + options['u' + U.class()]['r']); //too much recipients

		if(self._message.encrypted && self._hasExternalRecipientsNew()){

			var _ready = function(){

				btnSubmit.disabled = !(passwordInput.value && passwordInput.value === passwordConfirmInput.value);

			};

			var _send = function(){

				self._send({pwd: passwordInput.value, hint: passwordHint.value});

			};

			D.p([l[121].ucFirst(), l[526].ucFirst(), l[121].ucFirst(), l[21].ucFirst(), l[527].ucFirst()], [l[85].ucFirst(), l[164].ucFirst()], function(r){

				D.h();
				if(!r) return;
				_send();

			});

			var passwordConfirmBlock = document.getElementById('passwordConfirmBlock'),
				passwordBlock = document.getElementById('passwordBlock'),
				passwordInput = document.getElementById('password'),
				passwordHint = document.getElementById('hint'),
				passwordConfirmInput = document.getElementById('passwordConfirm'),
				passwordGenerate = document.getElementById('passwordGenerate'),
				btnSubmit = document.getElementById('btnSubmit'),
				pass;

			passwordGenerate.onclick = function(){

				pass = generateString(12, true, true, true);
				passwordInput.setAttribute('type', 'text');
				passwordConfirmInput.setAttribute('type', 'text');
				passwordInput.value = pass;
				passwordConfirmInput.value = pass;
				fireEvent(passwordInput, 'input');
				fireEvent(passwordConfirmInput, 'input');
				I.copyTextToClipboard(pass);

			};

			new PasswordInput(passwordBlock, _ready, _send, new PasswordConfirmInput(passwordConfirmBlock, passwordInput, _ready, _send), true);
			passwordInput.focus();

		}else self._send({draft: draft});

	};

	self._send = function(params){

		if(!self._readyForActions) return;
		params = params || {};
		I.clickSound();

		if(navState.page[0] === 'compose'){

			var btnSend = document.getElementById('btnSend'),
				btnDraft = document.getElementById('btnDraft');

			if(I.isDesktop){

				btnSend.disabled = true;
				btnDraft.disabled = true;
				params.draft ? btnDraft.classList.add('_loading') : btnSend.classList.add('_loading');

			}else{

				btnSend.classList.add('disabled');
				btnDraft.classList.add('disabled');

			}

		}

		if(self._message.message.length > options['ms']) return D.i([l[112].ucFirst(), l[16].ucFirst() + '<br />' + '[' + l[76] + ': ' + bytesToSize(self._message.message.length) + ', ' + l[22] + ': ' + bytesToSize(options['ms']) + ']'], [l[0].ucFirst()]);
		(I.isDesktop || params.draft) || (self._message.message = self._message.message.trim().replace(/[\n\r]/g, '<br />'));
		self._message.message && (self._message.message = styleMessage(self._message.message));

		if(params.draft){

			params.pwd && (self._message.encrypted = params.pwd);
			self._message.to = [];
			self._message.cc = [];
			self._message.bcc = [];
			self._message.draft || (self._message.draft = {});
			self._to.recipients.length && (self._message.draft.to = self._to.recipients.map(function(x){return x.address;}));
			self._cc.recipients.length && (self._message.draft.cc = self._cc.recipients.map(function(x){return x.address;}));
			self._bcc.recipients.length && (self._message.draft.bcc = self._bcc.recipients.map(function(x){return x.address;}));
			self._message.inReplyTo && (self._message.draft.inReplyTo = self._message.inReplyTo);
			self._message.references && (self._message.draft.references = self._message.references.slice());

			if(self._replyTo){

				self._message.draft.replyHTML = self._replyTo.active ? self._messageBody.combineHTML() : self._replyTo.replyHTML;
				self._replyTo.active && (self._message.draft.replyActive = self._replyTo.active);

			}

			if(self._source.id){ //update current draft message

				self._message.draft.id = self._source.id;
				self._source.copy(self._message);

			}

			F.increaseTotal(F.folders[2].id);

		}else{

			self._domMessageSignature && (self._message.message += '<br /><br /><br />' + self._domMessageSignature.combineHTML({bodyInner: true}));

			if(self._replyTo && (self._replyTo.mode === 'forward' || attachPreviousMessage.checked)){

				self._message.message = self._message.message.trim();
				self._message.message = self._messageBody.combineHTML(self._message.message ? {addToBody: '<div class="innerIframeText" style="padding:10px;margin-bottom:10px;border-style:dashed; border-width:1px; border-color:#e9e9e9;">' + self._message.message + '</div>'} : {});

			}

			F.increaseTotal(F.folders[1].id);

		}

		self._readyForActions = false;

		if(U.rc()){ //add recipients to contacts list

			var newContacts = false, allRecipients = self._recipients();

			for(var i in allRecipients){

				if(allRecipients[i].type) continue;
				newContacts = true;
				allRecipients[i].type = 1;
				allRecipients[i].folder = F.folders[0].id;

			}

			if(newContacts){

				U.netSave(['contacts']); //silent save
				C.domCount();

			}

		}

		var _done = function(messageInfo){

			if(messageInfo){

				FS.domStats();

				if(!params.draft && self._source.id){ //draft was sent, this uri is unavailable

					var newState = clone(navState);
					newState.page[1] = '';
					I.historyUpdate(clone(navState), newState);
					E.bulkDelete([self._source], {anyway: true}); //silent delete draft

				}

				if(!params.draft || (params.draft && !self._source.id)){ //add new message

					var channel = X.channelForId(messageInfo.c);

					if(channel instanceof cChannel){ //add sent email without loading from server

						var email = E.emails.add({

							id: messageInfo.i,
							time: messageInfo.t,
							size: messageInfo.s,
							ttl: messageInfo.l,
							read: true,
							folder: F.folders[params.draft ? 2 : 1].id,
							channel: channel,
							sender: channel.memberIndex(U.me.address)

						}).copy(self._message);

						self._message.cc.length && (email['ecc'] = self._message.cc.map(function(x){return x.address;}));
						channel.forContacts(self._message.to.concat(U.me)) || (email['eto'] = self._message.to.map(function(x){return x.address;}));
						E.groups.addMessage(email);

					}else I.e('cCompose._send [wrong channel]', new Error(l[363], true));

				}

			}

			self.reset();
			params.silent || I.pageBackward('inbox');

		};

		app && window.plugins.spinnerDialog.show('', '', true);

		return self._message.send({folderId: params.draft ? F.folders[2].id : F.folders[1].id, pwd: params.pwd, hint: params.hint}).then(function(result){

			app && window.plugins.spinnerDialog.hide();
			if(result === -1) return self._readyToSend(); //send failed
			result === 'cancelled' || _done(result);

		}).catch(function(response){

			app && window.plugins.spinnerDialog.hide();
			if(response === l[500]) return; //cancelled
			var comment = '';

			if(response.e === 543210){ //no disc space

				comment = l[11].ucFirst();

			}else if(!(response.no_space instanceof Array)){

				I.e('cCompose._send', new Error(l[90]));
				return;

			}else{

				for(var i in response.no_space) comment += addrReal(response.no_space[i]) + '<br />';
				comment = l[180].ucFirst() + ':' + '<br /><br />' + comment;

			}

			D.i([l[155].ucFirst(), comment], [l[0].ucFirst()], function(){

				D.h();
				_done();

			});

		});

	};

}