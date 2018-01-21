'use strict';

function cMessages(){

	var self = this;
	self.titleMaxLength = 200;
	self.items = [];
	self.encrypted = {};
	self._version = '1.0';

	self.add = function(data){

		var message;
		if(message = self.byId(data.id)) return message;
		message = new cMessage();
		message.id = data.id;
		data.channel && (message.channel = data.channel);
		data.rsaId && (message.rsaId = data.rsaId);
		message.time = data.time ? data.time : 0;
		message.read = data.read ? true : false;
		data.moved && (message.moved = true);
		typeof data.starred !== 'undefined' && data.starred  && (message.starred = true);
		typeof data.size !== 'undefined' && (message.size = data.size);
		typeof data.ttl !== 'undefined' && (message.ttl = Math.floor((new Date((new Date()).getTime() + 1000 * data.ttl).getTime()) / 1000));
		typeof data.sender !== 'undefined' && (message.sender = data.sender);
		data.folder && (message.folder = data.folder);
		self.items.splice(arrayIndexProperty(self.items, 0, self.items.length - 1, message.time, 'time')[1], 0, message);
		return message;

	};

	self.byId = function(id){

		for(var i = 0; i < self.items.length; i++) if(self.items[i].id === id) return self.items[i];
		return null;

	};

	self.setRead = function(messages, local){

		messages instanceof Array || (messages = [messages]);
		var toSend = [], newCount;

		for(var i in messages){

			if(!messages[i] || messages[i].read) continue;
			messages[i].read = true;
			F.decreaseUnread(messages[i].folder);
			toSend.push([messages[i].folder, messages[i].channel ? messages[i].channel.id : messages[i].rsaId, messages[i].id]);

		}

		!local && toSend.length && A.emailsRead(toSend);
		return toSend.length;

	};

	self.setStarred = function(messages, value, local){

		messages instanceof Array || (messages = [messages]);
		var toSend = [];

		for(var i in messages){

			if(messages[i].starred === value) continue;
			messages[i].starred = value;
			toSend.push([messages[i].folder, messages[i].channel ? messages[i].channel.id : messages[i].rsaId, messages[i].id, value ? 1 : 0]);
			(value ? F.increaseStarred : F.decreaseStarred)(messages[i].folder);

		}

		if(!toSend.length) return 0;
		local ? Promise.resolve(true) : A.emailsStarred(toSend);
		return value;

	};

	self.haveForFolder = function(folderId, oneOnly){

		var i, count = 0, isStarred = folderId == F.folders[4].id;

		if(oneOnly){

			for(i in self.items) if(self.items[i].folder === folderId && !self.items[i].moved) return true;
			return false;

		}else{

			for(i in self.items) isStarred ? self.items[i].starred && count++ : self.items[i].folder === folderId && count++;
			return count;

		}

	};

	self.haveAllForFolder = function(folderId){

		if(!folderId) throw new Error(l[363]);
		var count = 0;
		self.encrypted[folderId] && (count = self.encrypted[folderId].length);
		count += self.haveForFolder(folderId);
		return F.messagesCount(folderId) <= count;

	};

	self.haveAll = function(){

		var i, count = 0, maxItems = 0;
		for(i in self.encrypted) count += self.encrypted[i].length;
		count += self.items.length;

		for(i = 0; i < F.folders.length; i++){

			if(i === 4) continue;
			maxItems += F.messagesCount(F.folders[i].id);

		}

		return maxItems <= count;

	};

	self.allIds = function(){

		var i, j, res = self.items.map(function(x){ return x.id; });
		for(i in self.encrypted) for(j in self.encrypted[i]) res.push(self.encrypted[i][j].id);
		return res;

	};

	self.allCount = function(){

		var i, res = self.items.length;
		for(i in self.encrypted) res += self.encrypted[i].length;
		return res;

	};

	self.byChannelId = function(channelId, youngerThen){

		var res = [];
		youngerThen = youngerThen || 0;
		for(var i = 0; i < self.items.length; i++) self.items[i].channel && self.items[i].channel.id === channelId && self.items[i].time > youngerThen && res.push(self.items[i]);
		return res;

	};

	self.getOldest = function(folderId){

		var i, res = {older: 0, items: []}, movedItems = [];

		if(self.encrypted[folderId]) for(i in self.encrypted[folderId]){

			if(self.encrypted[folderId][i].moved){

				movedItems.push(self.encrypted[folderId][i].id);

			}else if(!res.older || res.older > self.encrypted[folderId][i].time){

				res = {older: self.encrypted[folderId][i].time, items: [self.encrypted[folderId][i].id]};

			}else if(res.older === self.encrypted[folderId][i].time){

				res.items.push(self.encrypted[folderId][i].id);

			}

		}

		for(i in self.items){

			if(self.items[i].folder !== folderId) continue;

			if(self.items[i].moved){

				movedItems.push(self.items[i].id);

			}else if(!res.older || res.older > self.items[i].time){

				res = {older: self.items[i].time, items: [self.items[i].id]};

			}else if(res.older === self.items[i].time){

				res.items.push(self.items[i].id);

			}

		}

		res.items = res.items.concat(movedItems);
		return res;

	};

	self.getYoungest = function(folderId){

		var i, res = {younger: 0, items: []}, movedItems = [];

		if(self.encrypted[folderId]) for(i in self.encrypted[folderId]){

			if(self.encrypted[folderId][i].moved){

				movedItems.push(self.encrypted[folderId][i].id);

			}else if(!res.younger || res.younger < self.encrypted[folderId][i].time){

				res = {younger: self.encrypted[folderId][i].time, items: [self.encrypted[folderId][i].id]};

			}else if(res.younger === self.encrypted[folderId][i].time){

				res.items.push(self.encrypted[folderId][i].id);

			}

		}

		for(i in self.items){

			if(self.items[i].folder !== folderId) continue;

			if(self.items[i].moved){

				movedItems.push(self.items[i].id);

			}else if(!res.younger || res.younger < self.items[i].time){

				res = {younger: self.items[i].time, items: [self.items[i].id]};

			}else if(res.younger === self.items[i].time){

				res.items.push(self.items[i].id);

			}

		}

		res.items = res.items.concat(movedItems);
		return res;

	};

}

function cMessage(){

	var self = this;

	self._preProcess = function(contactsGroups){

		return X.getChannel(contactsGroups).then(function(channels){ //get existent encryption channel or create new

			if(channels === 'cancelled') return channels;
			channels instanceof Array || (channels = [channels]);
			var i, promises = [], data, multiPromises;

			for(i = 0; i < channels.length; i++){

				data = {

					f: channels[i].memberIndex(U.me.address),
					s: self.subject,
					m: self.message,

				};

				if(self.draft){

					data['t'] = self.ttl;
					data['r'] = self.draft;
					data['e'] = self.encrypted ? true : false;

				}else{

					self.inReplyTo && (data['rt'] = self.inReplyTo);
					self.references && (data['ref'] = self.references.slice());

				}

				self.attaches.files.length && (data['a'] = self.attaches.ids());
				self.cc.length && (data['cc'] = self.cc.map(function(x){return x.address;}));
				channels[i].forContacts(self.to.concat(U.me)) || (data['to'] = self.to.map(function(x){return x.address;}));
				multiPromises = [channels[i]];
				multiPromises.push(channels[i].encode(data));
				self.attaches.files.length && multiPromises.push(self.attaches.metadata(channels[i]));
				promises.push(Promise.all(multiPromises));

			}

			return Promise.all(promises);

		});

	};

	self._allRecipientsToSend = function(){

		var res = [], i, uniq = {};

		for(i in self.rec.to){

			if(uniq[self.rec.to[i].address]) continue;
			uniq[self.rec.to[i].address] = 1;
			res.push(self.rec.to[i]);

		}

		for(i in self.rec.cc){

			if(uniq[self.rec.cc[i].address]) continue;
			uniq[self.rec.cc[i].address] = 1;
			res.push(self.rec.cc[i]);

		}

		for(i in self.rec.bcc){

			if(uniq[self.rec.bcc[i].address]) continue;
			uniq[self.rec.bcc[i].address] = 1;
			res.push(self.rec.bcc[i]);

		}

		return res;

	};

	self._haveExternal = function(){

		for(var i in self.rec.to) if(!addrIsInternal(self.rec.to[i].address)) return true;
		for(i in self.rec.cc) if(!addrIsInternal(self.rec.cc[i].address)) return true;
		for(i in self.rec.bcc) if(!addrIsInternal(self.rec.bcc[i].address)) return true;
		return false;

	};

	self.send = function(params){

		var i, promises = [];
		self.raw = {to: [], cc: [], bcc: []};
		self.rec = {to: [].concat(self.to), cc: [].concat(self.cc), bcc: [].concat(self.bcc)};

		return (self.draft || !params.pwd ? Promise.resolve() : C.prepareNewUsers(self._allRecipientsToSend(), params.pwd)).then(function(result){ //register new users if have some

			if(result === 'cancelled') return result;
			var contactsGroup = [], contactsGroups = [], haveExternal = !self.encrypted && self._haveExternal();

			for(i = self.rec.to.length - 1; i >= 0; i--){

				haveExternal && self.raw.to.unshift(addrReal(self.rec.to[i].address));

				if(addrIsInternal(self.rec.to[i].address) || (self.encrypted && self.rec.to[i].currentKeys.time)){

					contactsGroup.unshift(self.rec.to[i]);

				}else self.rec.to.splice(i, 1);

			}

			contactsGroups.push(contactsGroup.concat(U.me));

			for(i = self.rec.cc.length - 1; i >= 0; i--){

				haveExternal && self.raw.cc.unshift(addrReal(self.rec.cc[i].address));

				if(addrIsInternal(self.rec.cc[i].address) || (self.encrypted && self.rec.cc[i].currentKeys.time)){

					contactsGroups.push([self.rec.cc[i], U.me]);

				}else self.rec.cc.splice(i, 1);

			}

			for(i = self.rec.bcc.length - 1; i >= 0; i--){

				haveExternal && self.raw.bcc.unshift(addrReal(self.rec.bcc[i].address));

				if(addrIsInternal(self.rec.bcc[i].address) || (self.encrypted && self.rec.bcc[i].currentKeys.time)){

					contactsGroups.push([self.rec.bcc[i], U.me]);

				}else self.rec.bcc.splice(i, 1);

			}

			return self._preProcess(contactsGroups);

		}).then(function(results){

			if(results === 'cancelled') return results;
			var data = { fol: params.folderId };
			params.hint && (data.hint = params.hint);
			self.deletedFiles && (data['draft_df'] = self.deletedFiles);

			if(self.draft){

				self.draft.id && (data['draft_id'] = self.draft.id);
				data['ttl'] = U.maxTTL();

			}else data['ttl'] = self.ttl;

			var _prepareToSend = function(preResults, dataToSend, key){

				if(!preResults.length) throw new Error(l[363]);
				var preResult = preResults.shift();
				dataToSend[key] || (dataToSend[key] = []);

				dataToSend[key].push({

					addresses: [],
					channel: preResult[0].id,
					data: b2a(msgpack.pack(preResult[1])),

				});

				preResult[2] && (dataToSend[key][dataToSend[key].length - 1].attaches = preResult[2]);

				for(var j = 0; j < preResult[0].members.length; j++){

					if(key !== 'to' && preResult[0].memberAddress(j) === U.me.address) continue;
					dataToSend[key][dataToSend[key].length - 1].addresses.push(preResult[0].memberAddress(j));

				}

			};

			_prepareToSend(results, data, 'to');
			for(i = 0; i < self.rec.cc.length; i++) _prepareToSend(results, data, 'cc');
			for(i = 0; i < self.rec.bcc.length; i++) _prepareToSend(results, data, 'bcc');
			promises = [];

			if(self.raw.to.length || self.raw.cc.length || self.raw.bcc.length){

				data.raw = {

					subject: self.subject,
					body: self.message

				};

				self.raw.to.length && (data.raw.to = self.raw.to);
				self.raw.cc.length && (data.raw.cc = self.raw.cc);
				self.raw.bcc.length && (data.raw.bcc = self.raw.bcc);
				self.inReplyTo && (data.raw.in_reply_to = self.inReplyTo);
				self.references && (data.raw.references = self.references.slice());
				if(!self.attaches.files.length) return A.emailNew(data);
				for(i in self.attaches.files) promises.push(Promise.all([self.attaches.files[i].name, self.attaches.files[i]._file || self.attaches.files[i].download(true)]));

			}

			if(!promises.length) return A.emailNew(data);
			app && window.plugins.spinnerDialog.show('', l[519], true);

			return Promise.all(promises).then(function(results){

				promises = [];
				for(i in results) promises.push(Promise.all([results[i][0], readToArrayBuffer(results[i][1])]));

				return Promise.all(promises).then(function(results){

					data.raw.attaches = [];
					for(i in results) data.raw.attaches.push([results[i][0], Z.fileMimeType(results[i][0]), btoa(b2s(results[i][1]))]);
					return A.emailNew(data);

				});

			}).catch(function(e){

				D.i([l[112].ucFirst(), l[449].ucFirst() + ' \'' + e + '\'. ' + l[535].ucFirst() + '.'], [l[0].ucFirst()]);
				self.attaches.interrupt();
				return -1;

			});

		});

	};

	self.getAttaches = function(){

		if(!self.attachesIds || self.attaches) return Promise.resolve(true);
		var messageFiles = {};
		messageFiles[self.id] = self.attachesIds.map(function(x){ return x[0]; });
		self.attaches = new cFiles(3, self.attachesIds.length);
		return self.attaches.get(self.channel ? self.channel.id : self.rsaId, [messageFiles], true);

	};

	self.getBody = function(isReply){

		var res = self.message ? self.message.trim() : '';
		return implodeHTMLParts(getHTMLParts(res), '', isReply ? '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;padding:10px 0;display:block;text-align:right;font-style:italic;color:#adaead">' + l[266] + ' ' + I.dateFormat(self.time, 4) + ', ' + ' &lt;<span style="font-family:Arial,Helvetica,sans-serif;color:#4aaaef!important;text-decoration:none!important;outline:0;cursor:pointer">' + addrReal(self.getSender()) + '</span>&gt; ' + l[267] + ':</div>' : '');

	};

	self.getSender = function(){

		if(self.sender instanceof Array) return addrInternal(self.sender[0]);
		if(typeof self.sender === 'string') return addrInternal(self.sender);
		if(typeof self.sender === 'undefined' || !self.channel) return '';
		return self.channel.memberAddress(self.sender);

	};

	self.getSenderName = function(real){

		if(self.channel) return self.channel.memberNick(self.sender, real);
		var address = '', nick = '';

		if(self.sender instanceof Array){

			address = self.sender[0];
			nick = self.sender[1];

		}else if(typeof self.sender === 'string'){

			address = self.sender;

		}else return 'Unknown';

		address = addrInternal(address);
		return C.nameByAddr(address) || nick || address;

	};

	self.allTo = function(params){

		params = params || {};
		var res = [], i, addr;

		if(self.eto) for(i = 0; i < self.eto.length; i++) res.push(self.eto[i]);
		if(self.ecc) for(i = 0; i < self.ecc.length; i++) res.push(self.ecc[i]);

		if(self.channel){

			if(self.draft){

				self.draft instanceof Array && self.draft.map(function(x){ res.push(x); });
				self.draft.to instanceof Array && self.draft.to.length && self.draft.to.map(function(x){ res.push(x); });
				self.draft.cc instanceof Array && self.draft.cc.length && self.draft.cc.map(function(x){ res.push(x); });
				self.draft.bcc instanceof Array && self.draft.bcc.length && self.draft.bcc.map(function(x){ res.push(x); });

			}else for(i = 0; i < self.channel.members.length; i++){

				if(i === self.sender) continue;
				addr = self.channel.memberAddress(i);
				(params.myOwn || !U.isMe(addr)) && res.push(addr);

			}			

		}

		for(i in res) res[i] = params.preferNames ? (C.nameByAddr(res[i]) || addrReal(res[i])) : addrReal(res[i]);
		return res.length ? res : ['(' + l[42].ucFirst() + ')'];

	};

	self.displayAddresses = function(){

		var sender = self.getSender();
		if(!U.isMe(sender)) return addrReal(sender); //inbox
		if(!self.channel) return addrReal(self.source); //direct

		if(self.channel.members.length > 1){ //sent

			var res = [];

			for(var i = 0; i < self.channel.members.length; i++){

				if(U.isMe(self.channel.memberAddress(i))) continue;
				res.push(addrReal(self.channel.memberAddress(i)));

			}

			return res.join(', ');

		}

		if(!self.draft) return '';
		if(self.draft instanceof Array) return self.draft.map(function(x){ return addrReal(x);}).join(', ');
		return self.allTo().join(', ');

	};

	self.firstRecipient = function(){

		var address = self.getSender();
		if(!U.isMe(address) || !self.channel) return address;
		address = '';

		if(self.channel.members.length === 1){ //draft or sent

			if(self.eto instanceof Array){

				address = self.eto[0];

			}else if(!self.draft){

				return ''; //draft without recipients

			}else if(self.draft instanceof Array){

				address = self.draft[0][0];

			}else if(self.draft.to instanceof Array && self.draft.to.length){

				address = self.draft.to[0];

			}else if(self.draft.cc instanceof Array && self.draft.cc.length){

				address = self.draft.cc[0];

			}else if(self.draft.bcc instanceof Array && self.draft.bcc.length){

				address = self.draft.bcc[0];

			}

		}

		if(address) return address;

		for(var i = 0; i < self.channel.members.length; i++){ //sent

			if(U.isMe(self.channel.memberAddress(i))) continue;
			return self.channel.memberAddress(i);

		}

		return '';

	};

	self.recipients = function(){

		var res = [];
		self.eto && (res = res.concat(self.eto.map(function(x){ return x; })));
		self.channel && (res = res.concat(self.channel.members.map(function(x){ return x instanceof Array ? x[0] : x; })));
		return res;

	};

	self.recipientsCopies = function(){

		return self.ecc ? self.ecc.map(function(x){ return x; }) : [];

	};

	self.search = function(regex){

		var arr = [], contact;

		for(var i in regex){

			if(regex[i].test(' ' + self.oText + ' ')) continue;
			if(self.subject && regex[i].test(' ' + self.subject + ' ')) continue;

			if(self.channel){

				for(var j in self.channel.members){

					contact = C.byAddress(self.channel.memberAddress(0));
					arr.push(contact.name);
					arr.push(self.channel.memberAddress(j));
					arr.push(addrReal(self.channel.memberAddress(j)));
					arr.push(self.channel.memberNick(j));

				}

				if(regex[i].test(' ' + arr.join(' ') + ' ')) continue;

			}

			if(self.sender instanceof Array){

				if(regex[i].test(' ' + self.sender[0] + ' ') || regex[i].test(' ' + self.sender[1] + ' ')) continue;

			}else if(typeof self.sender === 'string'){

				if(regex[i].test(' ' + self.sender + ' ')) continue;

			}

			return false;

		}

		return true;

	};

	self.membersAddresses = function(){

		var res = [];

		if(self.channel){

			res = self.channel.members.map(function(x){ return x instanceof Array ? x[0] : x; });

		}else{

			var address = self.sender instanceof Array ? self.sender[0] : self.sender; //sender's email
			res = [addrInternal(address === 'noreply' ? 'support' : address)];

		}

		return res;

	};

	self.getSubject = function(){

		if(!self.subject) return '';
		var res = clearTags(self.subject.length > self.titleMaxLength ? self.subject.substr(0, self.titleMaxLength - 3) + '...' : clearTags(self.subject));
		return res.replace(/\r?\n|\r/g, ' ');

	};

	self.originalSubject = function(val){

		var res = val ? val : self.subject || '';

		var _clear = function(){

			var original = res;
			for(var i in common.subjPrefixRE) res = res.replace(new RegExp(common.subjPrefixRE[i], 'ig'), '');
			return original !== res;

		};

		while(_clear()) _clear();
		return res.trim();

	};

	self.getReplySubject = function(){

		var origSubj = self.originalSubject();
		return origSubj ? 'Re: ' + origSubj : '';

	};

	self.getDescription = function(){

		if(!self.message) return '';
		return self.oText.length > 200 ? self.oText.substr(0, 200 - 3) + '...' : self.oText;

	};

	self.attachesSize = function(){

		var size = 0;
		if(!self.attachesIds) return 0;
		self.attachesIds.forEach(function(x){ size += x.length > 2 ? x[2] : 0;});
		return size;

	};

	self.secureLevel = function(){

		if(self.source) return 1;
		var address = self.getSender();
		U.isMe(address) && (address = self.firstRecipient());
		if(!addrIsInternal(address)) return 0;
		return C.secureLevel(address);

	};

	self.decode = function(){

		if(!self.decryptor){

			self.setCorrupted();
			return Promise.resolve(self);

		}

		return self.rsaId ? self._decodeDirect() : self._decodeChanneled();

	};

	self._decodeChanneled = function(){

		if(!(self.decryptor instanceof cChannel)) throw new Error(l[363]);

		return self.decryptor.decode(self.encoded).then(function(result){

			self.channel = self.decryptor;
			self._fromDecoded(msgpack.unpack(result.data));
			return self;

		}).catch(function(){

			self.setCorrupted();
			return self;

		});

	};

	self._decodeDirect = function(){

		return Encryption.decrypt(U.keyring, self.decryptor, msgpack.unpack(a2b(self.encoded))).then(function(result){

			self._fromDecoded(msgpack.unpack(result.data));
			return self;

		}).catch(function(){

			self.setCorrupted();
			return self;

		});

	};

	self._fromDecoded = function(data){

		if(data === null){

			self.setCorrupted();
			return;

		}

		self.channel || (self.to = U.findMe(data.u));
		self.message = data.m.trim();
		self.sender = data.f;
		self.subject = data.s;
		self.oText = self.message.getClearText();
		typeof data.e !== 'undefined' && (self.encrypted = data.e);
		data.n && (self.source = data.n);
		data.r && (self.draft = data.r);
		data.t && (self.draftTTL = data.t);
		data.to && (self.eto = data.to.slice());
		data.cc && (self.ecc = data.cc.slice());
		data.bcc && (self.ebcc = data.bcc.slice());
		data.i && (self.externalId = data.i);
		data.rt && (self.inReplyTo = data.rt);
		data.ref && (self.references = data.ref.slice());
		data.a && (self.attachesIds = data.a.slice());
		delete(self.decryptor);

	};

	self.copy = function(source){

		self.message = source.message;
		self.subject = source.subject;
		self.oText = source.oText || source.message.getClearText();
		typeof source.sender !== 'undefined' && (self.sender = source.sender);
		typeof source.source !== 'undefined' && (self.source = source.source);
		source.externalId && (self.externalId = source.externalId);
		source.to && (self.to = source.to);
		source.eto && (self.eto = source.eto);
		source.ecc && (self.ecc = source.ecc);
		source.ebcc && (self.ebcc = source.ebcc);

		if(source.draft){

			source.encrypted ? (self.encrypted = source.encrypted) : self.encrypted && delete(self.encrypted);
			source.draftTTL ? (self.draftTTL = source.draftTTL) : self.draftTTL = source.ttl;
			self.draft || (self.draft = {});
			source.draft.to ? self.draft.to = source.draft.to.map(function(x){ return x; }) : self.draft.to && delete(self.draft.to);
			source.draft.cc ? self.draft.cc = source.draft.cc.map(function(x){ return x; }) : self.draft.cc && delete(self.draft.cc);
			source.draft.bcc ? self.draft.bcc = source.draft.bcc.map(function(x){ return x; }) : self.draft.bcc && delete(self.draft.bcc);
			source.draft.references && (self.draft.references = source.draft.references.slice());
			source.draft.inReplyTo && (self.draft.inReplyTo = source.draft.inReplyTo);

			if(source.draft.replyHTML){

				self.draft.replyHTML = source.draft.replyHTML;
				self.draft.replyActive = source.draft.replyActive || false;

			}else{

				delete(self.draft.replyHTML);
				delete(self.draft.replyActive);

			}

		}else{

			source.inReplyTo && (self.inReplyTo = source.inReplyTo);
			source.references && (self.references = source.references.slice());

		}

		if(source.attaches && source.attaches.files.length){

			self.attachesIds = source.attaches.ids();
			self.attaches = source.attaches;

		}else if(source.attachesIds){

			self.attachesIds = source.attachesIds;

		}else{

			self.attaches && delete(self.attaches);
			self.attachesIds && delete(self.attachesIds);

		}

		return self;

	};

	self.addReference = function(references, messageId){

		self.references = references ? references.slice() : [];
		self.references.push(messageId);

	};

	self.setCorrupted = function(){

		delete(self.decryptor);
		self.corrupted = true;

	};

	self.isTrash = function(){

		return F.byId(self.folder, true) === 3;

	};

	self.isVisible = function(){

		return !self.isTrash() || (history.state.pos > 1 && myHistory[history.state.pos - 1].page.length > 1 && myHistory[history.state.pos - 1].page[1] === 3);

	};

}