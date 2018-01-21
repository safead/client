'use strict';

function cChannels(){

	var self = this;
	self._version = '1.0';
	self._branches = {};

	self.getChannel = function(contactsGroup){

		var i, j, uniq = {}, promises = [], channelsObj = {};
		(contactsGroup instanceof Array && contactsGroup[0] instanceof Array) || (contactsGroup = [contactsGroup]);

		for(i = contactsGroup.length - 1; i >= 0; i--){ //remove duplicate contacts if any

			uniq = {};
			(contactsGroup[i] instanceof Array) || (contactsGroup[i] = [contactsGroup[i]]); //to [[contact1, contact2, ...], [contact3, contact4, ...]]
			for(j = contactsGroup[i].length - 1; j >= 0; j--) uniq[contactsGroup[i][j].address] ? contactsGroup[i].splice(j, 1) : uniq[contactsGroup[i][j].address] = 1;

		}

		for(i = 0; i < contactsGroup.length; i++) promises.push(self._createId(contactsGroup[i]));

		var _resultedChannels = function(forIds){

			var res = [];

			for(i = 0; i < forIds.length; i++){

				if(!(channelsObj[forIds[i]]['channel'] instanceof cChannel)) throw new Error(l[363]);
				res.push(channelsObj[forIds[i]]['channel']);

			}

			return forIds.length > 1 ? res : res[0];

		};

		return Promise.all(promises).then(function(ids){

			var needed = [];

			for(i = 0; i < ids.length; i++){

				channelsObj[ids[i]] = {};
				channelsObj[ids[i]]['id'] = ids[i];
				channelsObj[ids[i]]['contacts'] = contactsGroup[i];
				(channelsObj[ids[i]]['channel'] = self.channelForId(ids[i])) || needed.push(ids[i]);

			}

			return (needed.length ? self._invitesGet(needed) : Promise.resolve()).then(function(result){

				if(result === 'cancelled') return result;
				promises = [];

				for(i in channelsObj){

					channelsObj[i]['channel'] || (channelsObj[i]['channel'] = self.channelForId(i));
					if(channelsObj[i]['channel']) continue;

					channelsObj[i]['channel'] = new cChannel(

						self._version,
						newUuid(),
						'',
						i,
						channelsObj[i]['contacts'],
						[U.me.address]

					);

					self._branches[channelsObj[i]['channel']._branchId] = new cBranch(channelsObj[i]['channel']._branchId);
					self._branches[channelsObj[i]['channel']._branchId]._addChannel(channelsObj[i]['channel']);
					promises.push(Promise.all([channelsObj[i]['contacts'], channelsObj[i]['channel']._initAES()]));

				}

				if(!promises.length) return _resultedChannels(ids);

				return Promise.all(promises).then(function(results){

					promises = [];
					for(var i in results) promises.push(Promise.all([results[i][0], results[i][1], results[i][1]._createInvite(results[i][0])]));
					return Promise.all(promises);

				}).then(function(results){

					return A.invitesNew(results.map(function(x){

						return {channel: x[1].id, users: x[0].map(function(x){

							return [x.address, U.keyring.keys[x.currentKeys.encId].uuid];

						}), data: b2a(msgpack.pack(x[2]))};

					}));

				}).then(function(result){

					if(result === 'cancelled') return result;
					if(!result.t) throw new Error(l[90]);

					for(i in channelsObj){

						channelsObj[i]['channel'] || (channelsObj[i]['channel'] = self.channelForId(i));
						if(!channelsObj[i]['channel']) throw new Error(l[363]);
						channelsObj[i]['channel']._created || (channelsObj[i]['channel']._created = result.t);

					}

					return _resultedChannels(ids);
	
				});

			});

		});

	};

	self.prepareChannels = function(channelIds, rsaIds){

		rsaIds = rsaIds || [];
		channelIds instanceof Array || (channelIds = [channelIds]);
		if(!channelIds.length && !rsaIds.length) return Promise.resolve(true);
		return self._invitesGet(channelIds, rsaIds);

	};

	self._createId = function(contacts){

		var sortedFingerprints = [], idx;

		for(var i in contacts){

			if(!contacts[i].fp) throw new Error(l[363]); //fingerprints are changed randomly after each password change
			idx = arrayIndex(sortedFingerprints, 0, sortedFingerprints.length - 1, contacts[i].fp);
			sortedFingerprints.splice(idx[1], 0, contacts[i].fp);

		}

		return crypto.subtle.digest('SHA-256', s2b(sortedFingerprints.join(','))).then(function(result){

			return s2uuid(b2x(result));

		});

	};

	self.channelForId = function(id){

		var res = null;
		for(var i in self._branches) if(res = self._branches[i]._channelById(id)) return res;
		return res;

	};

	self._channelForContacts = function(contacts){

		var channel;
		for(var i in self._branches) if(channel = self._branches[i]._forContacts(contacts)) return channel;
		return null;

	};

	self._invitesGet = function(ids, rsaIds){

		return A.invitesGet(ids, rsaIds).then(function(result){

			if(result === 'cancelled') return result;

			return result ? Promise.all([result.invites, U.rsaChain(result['rsa_chain'])]).then(function(results){

				if(!results[0].length) return false;
				return self._channelsFromInvites(results[0]);

			}) : false;

		});

	};

	self._channelsFromInvites = function(invites){

		var i, j, promises = [];
		for(i = 0; i < invites.length; i++) promises.push(Encryption.decrypt(U.keyring, U.keyIdByUuid(invites[i].key_id), msgpack.unpack(a2b(invites[i].data))));

		return Promise.all(promises).then(function(results){

			var contact, objects = [], invitersToVerify = {}, aliasesToRequest = [];

			for(i = 0; i < results.length; i++){

				objects[i] = msgpack.unpack(results[i].data);
				objects[i]._created = invites[i].time;
				objects[i]._id = invites[i].channel;

				if(

					!objects[i]['k'] ||
					U.isMe(objects[i].c) ||
					!(contact = C.byAddress(objects[i].c)) ||
					contact.type !== 1 ||
					!contact.verifiedKey

				) continue;

				objects[i].signCheck = true;
				if(U.keyring.keys[objects[i]['k'][0]]) continue;
				invitersToVerify[objects[i].c] || (invitersToVerify[objects[i].c] = {maxAge: objects[i]['k'][1]});
				invitersToVerify[objects[i].c][objects[i]['k'][0]] = {time: objects[i]['k'][1], valid: false};
				invitersToVerify[objects[i].c].maxAge = Math.min(invitersToVerify[objects[i].c].maxAge, objects[i]['k'][1], contact.verifiedKey.time);

			}

			for(i in invitersToVerify) aliasesToRequest.push({user: i, time: Math.max(invitersToVerify[i].maxAge - 1, 0)});

			return aliasesToRequest.length ? C.checkPublickKeys(aliasesToRequest).then(function(result){ //now all required keys are imported and validated

				if(result === 'cancelled') return result;
				var promises = [];

				for(i = objects.length - 1; i >= 0; i--){

					if(!objects[i].signCheck) continue;

					if(!U.keyring.keys[objects[i]['k'][0]]){ //sign key is compromised and not imported

						D.i([l[112].ucFirst(), l[512].ucFirst() + ' <b>' + addrReal(objects[i].c) + '</b> ' + l[511] + '! ' + l[514], ], [l[0].ucFirst()]);
						objects.splice(i, 1);
						continue;

					}

					promises.unshift(Promise.all([Signing.verify(U.keyring, objects[i]['k'][0], msgpack.unpack(a2b(invites[i].data))), objects[i]]));

				}

				return Promise.all(promises).then(function(results){ //check invites signatures

					for(i = results.length - 1; i >= 0; i--) if(!results[i][0]){

						for(j in objects) if(objects[j] === results[i][1]){

							objects.splice(j, 1);
							break;

						}

					}

					return self._channelsFromObjects(objects);

				});

			}).catch(function(e){

				I.e('cChannels._channelsFromInvites inner', e);

			}) : self._channelsFromObjects(objects);

		}).catch(function(e){

			I.e('cChannels._channelsFromInvites', e);

		});

	};

	self._channelsFromObjects = function(objects){

		var i, promises = [];

		for(i = 0; i < objects.length; i++){

			promises.push(crypto.subtle.importKey('raw', objects[i].w, Ciphering.ENC.alg, true, Ciphering.ENC.use));
			promises.push(crypto.subtle.importKey('raw', objects[i].s, Ciphering.MAC.alg, true, Ciphering.MAC.use));

		}

		return Promise.all(promises).then(function(results){

			var channel, res = {};

			for(i = 0; i < results.length; i += 2){

				channel = new cChannel(

					objects[i / 2].v,
					objects[i / 2].b,
					objects[i / 2].n,
					objects[i / 2]._id

				);

				channel._created = objects[i / 2]._created;
				channel.members = objects[i / 2].m;
				channel._keyWrap = results[i];
				channel._keySign = results[i + 1];
				channel._admins = objects[i / 2].a;
				channel._creator = objects[i / 2].c;
				channel._cipher = new Ciphering(channel._keyWrap, channel._keySign); //channel ciphering
				if(!self._branches[channel._branchId]) self._branches[channel._branchId] = new cBranch(channel._branchId);
				self._branches[channel._branchId]._addChannel(channel);
				res[channel.id] = channel;

			}

			return res;

		});

	};

	self.load = function(data){

		return self._fromEncoded(data).then(function(){

			return self.store(data);

		});

	};

	self.store = function(encrypted){

		return I.lsWrite('channels', encrypted);

	};

	self._restore = function(){

		return I.lsRead('channels').then(function(result){

			return result === null ? 0 : self._fromEncoded(result);

		});

	};

	self.encode = function(){

		var i, promises = [];
		for(i in self._branches) promises.push(self._branches[i]._channels[self._branches[i]._channels.length - 1]._toObject());

		return Promise.all(promises).then(function(results){
			
			return Encryption.encrypt(U.keyring, [U.keyring.keys.ENC.id], {data: msgpack.pack(results), aad: s2b('aad').buffer}); //pack and encode

		}).then(function(result){

			return Signing.sign(U.keyring, [U.keyring.keys.SIGN.id], result); //signing

		}).then(function(result){

			return b2a(msgpack.pack(result));

		});

	};

	self._fromEncoded = function(data){

		data = msgpack.unpack(a2b(data));

		return Signing.verify(U.keyring, [U.keyring.keys.SIGN.id], data).then(function(){ //check signature

			return Encryption.decrypt(U.keyring, [U.keyring.keys.ENC.id], data); //decrypt and unpack data

		}).then(function(result){

			return self._channelsFromObjects(msgpack.unpack(result.data));

		});

	};

	self.allMembers = function(){

		var i, j, x, res = {};
		for(i in self._branches) for(j in self._branches[i]._channels) for(x in self._branches[i]._channels[j].members) res[self._branches[i]._channels[j].memberAddress(x)] = 1;
		return res;

	};

}

function cBranch(id){

	var self = this;
	self._id = id,
	self._channels = [];

	self._addChannel = function(channel){

		var i, idx = 0;

		for(i = 0; i < self._channels.length; i++){

			if(self._channels[i].id === channel.id){

				if(self._channels[i]._created !== channel._created) self._channels[i]._created = channel._created;
				return self._channels[i];

			}

			if(self._channels[i]._created >= channel._created) break;
			idx++;

		}

		self._channels.splice(idx, 0, channel);
		return channel;

	};

	self.name = function(){

		return self._channels[self._channels.length - 1]._name;

	};

	self._forContacts = function(contacts){

		for(var i in self._channels) if(self._channels[i].forContacts(contacts)) return self._channels[i];
		return null;

	};

	self._channelById = function(id){

		for(var i in self._channels) if(self._channels[i].id === id) return self._channels[i];
		return null;

	};

}

function cChannel(version, branchId, name, id, contacts, admins){

	var self = this;
	self._version = version,
	self._branchId = branchId,
	self._name = name,
	self.id = id || '',
	self.members = contacts ? contacts.map(function(x){return x.address;}) : [],
	self._keyWrap = null;
	self._keySign = null;
	self._cipher = null;
	self._created = 0;
	self._refreshed = 0;
	self._admins = admins || [U.me.address],
	self._creator = U.me.address;

	self._initAES = function(){

		return Promise.all([

			crypto.subtle.generateKey(Ciphering.ENC.alg, true, Ciphering.ENC.use),
			crypto.subtle.generateKey(Ciphering.MAC.alg, true, Ciphering.MAC.use)

		]).then(function(results){

			self._keyWrap = results[0];
			self._keySign = results[1];
			self._cipher = new Ciphering(self._keyWrap, self._keySign);
			return self;

		});

	};

	self._createInvite = function(contacts){

		return self._toObject(U.keyring.keys.SIGN).then(function(object){

			return Encryption.encrypt(U.keyring, contacts.map(function(x){return x.currentKeys.encId;}), {data: msgpack.pack(object), aad: s2b(self.id).buffer}); //pack & encrypt

		}).then(function(inviteEnc){

			return Signing.sign(U.keyring, [U.keyring.keys.SIGN.id], inviteEnc); //sign

		});

	};

	self.forContacts = function(contacts){

		if(self.members.length !== contacts.length) return false;
		var i, j, res;

		for(i in self.members){

			res = false;

			for(j in contacts) if(self.memberAddress(i) === contacts[j].address){

				res = true;
				break;

			}

			if(!res) return false;

		}

		return true;

	};

	self.memberIndex = function(address){

		for(var i = 0; i < self.members.length; i++) if(self.memberAddress(i) === address) return i;
		throw new Error(l[86]);

	};

	self.memberAddress = function(idx){

		if(!self.members[idx]) throw new Error(l[86]);
		return self.members[idx] instanceof Array ? self.members[idx][0] : self.members[idx];

	};

	self.memberNick = function(idx, real){

		if(!self.members[idx]) return '';

		var address = '', nick = '';

		if(self.members[idx] instanceof Array){

			address = self.members[idx][0];
			nick = self.members[idx][1];

		}else address = self.members[idx];

		if(real) return nick || address;
		return C.nameByAddr(address, real) || nick || addrReal(address);

	};

	self.write = function(data){

		return self.encode(data).then(function(result){

			return A.channelWrite(self.id, result);

		});

	};

	self.read = function(options){

		if(options.youngerThen && self._refreshed >= options.youngerThen) return Promise.resolve([]);

		return A.channelRead(self.id, options.youngerThen).then(function(result){

			if(result === 'cancelled') return;
			self._refreshed = results['time'];
			return result.data;

		});

	};

	self.encode = function(data){

		data instanceof ArrayBuffer || (data = msgpack.pack(data));
		return self._cipher.encipher(data);

	};

	self.decode = function(data){

		data = msgpack.unpack(a2b(data));

		return self._cipher.decipher(data).catch(function(){

			return Promise.resolve(null);

		});

	};

	self._toObject = function(signKey){

		return Promise.all([

			crypto.subtle.exportKey('raw', self._keyWrap),
			crypto.subtle.exportKey('raw', self._keySign)

		]).then(function(results){

			return {

				v: self._version,
				b: self._branchId,
				n: self._name,
				m: self.members,
				a: self._admins,
				c: self._creator,
				w: results[0],
				s: results[1],
				k: [signKey.id, signKey.time],

			};

		});

	};

	self.getMyRecipient = function(){

		for(var i = 0; i < self.members.length; i++) if(U.isMyAlias(self.memberAddress(i))) return self.memberAddress(i);

	};

	self.createdTime = function(){

		return I.dateFormat(self._created, 1);

	};

	self.my = function(){

		return U.isMe(self._creator);

	};

}