'use strict';

function cUser(){

	var self = this;
	self._version = '1.0.0';
	self.me = {};
	self.sid = '';
	self.id = '';
	self.sessionUpdateTime = 0;
	self.sessionTimeout = null;

	self._v = { //variables

		t: 0,
		d: 0,

	};

	self._d = { //device variables

		pcm: 0, //app passCode mode
		passBlocked: 0, //incorrect passcode try time
		passTries: 3, //incorrect passcode tries
		passCode: '', //passcode
		touchId: false, //touchId protection
		lastAction: 0, //last device action
		login: '',
		lang: 'en',
		pwdHush: '',
		tfa: false, //2-x factor auth

	};

	self._s = { //options

		rpp: 10, //results per page
		rc: false, //add recipients to contacts after send
		ge: false, //group emails like chat messages
		sig: '', //email signature
		f: {}, //folders
		c: {}, //contacts
		x: {}, //channels

	};

	self.keyring = {};
	self.cipher = {};
	self.aliases = [];
	self._s.f = new cFolders();
	self._s.c = new cContacts();
	self._s.x = new cChannels();

	self.type = function(){return self._v.t;};
	self.login = function(){return self._d.login;};
	self.email = function(){return addrReal(self._d.login);};
	self.paidTo = function(){return self._v.paidTo;};
	self.lang = function(){return self._d.lang;};
	self.diskUsage = function(){return self._v.d;};
	self.rc = function(){return self._s.rc;};
	self.ge = function(){return self._s.ge;};
	self.sig = function(){return self._s.sig;};
	self.rpp = function(){return self._s.rpp;};
	self.pcm = function(){return self._d.pcm;};
	self.tfa = function(){return self._d.tfa;};
	self.passBlocked = function(){return self._d.passBlocked;};
	self.passTries = function(){return self._d.passTries;};
	self.passCode = function(){return self._d.passCode;};
	self.touchId = function(){return self._d.touchId;};
	self.lastAction = function(){return self._d.lastAction;};

	self.init = function(){

		F = self._s.f;
		C = self._s.c;
		X = self._s.x;

		return self._restoreDevice().then(function(result){

			if(result === null) throw new Error(l[4].ucFirst());
			if(!app || !self._d.passCode || !self._d.pcm) return true;

			return I.reset().then(function(){

				return (new Passcode(I.container)).check(self._d.passCode, false, U.touchId());

			}).then(function(result){

				if(!result) throw new Error(l[105].ucFirst());

			});

		}).then(function(){

			return self._sessionRestore();

		}).then(function(result){

			return result && U.access(1) && U.sid ? self._reInit() : true;

		}).catch(function(){

			self.logout(null, true);
			return false;

		});

	};

	self.class = function(){

		if([0].indexOf(self._v.t) >= 0) return 0;
		if([1, 2].indexOf(self._v.t) >= 0) return 1;
		return self._v.t;

	};

	self.setDiskUsage = function(v){

		self._v.d = v;
		DOM.diskUsage();

	};

	self.isMyAlias = function(v){

		for(var i in self.aliases) if(self.aliases[i].alias === v) return true;
		return false;

	};

	self.setOption = function(name, val){

		switch(name){

		case 'rpp':

			if(self._s.rpp === val) return;
			self._s.rpp = val;
			break;

		case 'rc':

			val = val ? 1 : 0;
			if(self._s.rc === val) return;
			self._s.rc = val;
			break;

		default:

			return;

		}

		return self.netSave(['settings']);

	};

	self.setDeviceVars = function(data){

		for(var i in data){

			switch(i){

			case 'pcm':

				self._d.pcm = data[i];
				break;

			case 'passCode':

				self._d.passCode = data[i];
				break;

			case 'passBlocked':

				self._d.passBlocked = data[i];
				break;

			case 'passTries':

				self._d.passTries = data[i] < 0 ? 0 : data[i];
				break;

			case 'touchId':

				self._d.touchId = data[i];
				app && self._d.touchId && window.plugins.toast.showShortTop(l[537].ucFirst());
				break;

			case 'lastAction':

				self._d.lastAction = data[i];
				break;

			case 'twoFactorAuth':

				self._d.tfa = data[i];
				break;

			}

		}

		return self._storeDevice();

	};

	self._storeDevice = function(){

		return I.lsWrite('device', self._d, true);

	};

	self._restoreDevice = function(){ //device variables
		
		return I.lsRead('device', true).then(function(result){

			(result && typeof result.lang === 'string') || (result = null);
			if(!result) return result;
			self._d = result;
			return true;

		});

	};

	self.deviceWrap = function(data, password){

		return Promise.resolve(data); //not used

		/*
		if(!password) return Promise.resolve(data);

		return stringToAESKeys(password).then(function(keys){

			return Ciphering.encipher(keys[0], keys[1], msgpack.pack(data));

		});
		*/

	};

	self.deviceUnwrap = function(data, password){

		return Promise.resolve(data); //not used

		/*
		if(!password || !data) return Promise.resolve(data);
		if(!(data.data instanceof ArrayBuffer)) throw new Error(l[4]);

		return stringToAESKeys(password).then(function(keys){

			return Ciphering.decipher(keys[0], keys[1], data);

		}).then(function(result){

			return msgpack.unpack(result.data);

		}).catch(function(e){

			return false;

		});
		*/

	};

	self.netLogin = function(login, pwd, params){

		params = params || {};

		return A.userId(login, 'l').then(function(result){

			if(result === 'cancelled') return;
			if(!result.id) throw new Error(l[69]);
			params.uuid = result.id;
			return derivePassword(u2b(pwd), params.uuid, 8192);

		}).then(function(derivedPassword){

			params.pwd = pwd;
			params.derivedPassword = derivedPassword;
			params.sessionSecretKey = crypto.getRandomValues(new Uint8Array(48)); //session encryption key for my RSA pair to store locally secure way

			return crypto.subtle.digest('SHA-256', params.derivedPassword).then(function(hash){

				return self._netSignIn(login, hash, params);

			});

		});

	};

	self._netSignIn = function(login, hash, params){

		return A.signIn(login, hash, params, P).then(function(response){

			if(response === 'cancelled') return false;

			if(response.tfa){

				app && window.plugins.spinnerDialog.hide();

				return DOM.googleAuthCode().then(function(result){

					if(!result) throw new Error(-1);
					self._d.tfa = true;
					params.tfa = result;
					return self._netSignIn(login, hash, params);

				});

			}

			return Promise.all([

				self._initVars(params.derivedPassword, response.key_s, response.key_e, response.settings, response.contacts),
				self._createHush(params.pwd, params.uuid),
				self._storeKeysSecured(params.derivedPassword, params.sessionSecretKey)

			]).then(function(results){

				delete(params.pwd);
				delete(params.sessionSecretKey);
				delete(params.derivedPassword);

				return self.setCredentials({

					login: login,
					hush: results[1],
					type: response.t,
					paidTo: response.paid_to,
					aliases: response.aliases

				});

			});

		});

	};

	self.netSignup = function(id, uuid, login, nick, pwd, captcha, fingerprint){

		var derivedPassword, secureStorageKey = '';
		uuid || (secureStorageKey = crypto.getRandomValues(new Uint8Array(48))); //secured key material to session storage

		return derivePassword(u2b(pwd), id, 8192).then(function(result){

			derivedPassword = result;
			return self._initRSA(derivedPassword); //init RSA keys

		}).then(function(result){

			self._s.f.folders = [];
			self._s.f.add(l[129], 1);
			self._s.f.add(l[130], 1);
			self._s.f.add(l[131], 1);
			self._s.f.add(l[132], 1);
			self._s.f.add(l[133], 1);

			return Promise.all([

				result, //RSA keys
				self._visitCard(self.keyring, self.keyring.keys.SIGN, self.keyring.keys.ENC, [self.keyring.keys.SIGN.id]), //user visit card
				crypto.subtle.digest('SHA-256', derivedPassword), //hash of derived password
				self._settingsEncrypt(), //settings

			]);

		}).then(function(results){

			return A.signUp({

				login: login,
				nick: nick,
				folder: self._s.f.folders[0].id,
				key: secureStorageKey,
				prk_s: results[0][0],
				prk_e: results[0][1],
				puk_s: results[0][2],
				puk_e: results[0][3],
				visitCard: results[1],
				passwordHash: results[2],
				settings: results[3],
				captcha: captcha,
				id: id,
				uuid: uuid,
				fingerprint: fingerprint

			});

		}).then(function(response){

			if(response === 'cancelled') return response;

			if(uuid){ //no more actions for users created by myself

				self._d.login = login;
				self.response = response;
				return self;

			}

			return Promise.all([

				self._createHush(pwd, id), //password hush
				self._storeKeysSecured(derivedPassword, secureStorageKey) //secured key material to session storage

			]).then(function(results){

				secureStorageKey = null; //from now all the secrets are in memory only

				return self.setCredentials({

					login: login,
					hush: results[0],
					type: response.type,
					aliases: response.aliases,
					rsaUUID: response.rsa_uuid,
					rsaTime: response.time

				});

			}).then(function(){

				return self._storeDevice();

			}).then(function(){

				return self;

			});

		});

	};

	self._reInit = function(){
		
		return A.userInit(P).then(function(response){

			if(response === 'cancelled') return response;

			return self._restoreKeysSecured(x2b(response.key)).then(function(keyMaterial){

				return self._initVars(keyMaterial, response.key_s, response.key_e, response.settings, response.contacts);

			}).then(function(){

				return self.setCredentials({

					login: self._d.login,
					aliases: response.aliases,
					type: response.type,
					paidTo: response.paid_to,

				});
	
			}).then(function(){

				response.avatar && AV.set(response.avatar);
				return true;

			});

		});

	};

	self._storeKeysSecured = function(derivedPassword, secureKey){

		return Promise.all([

			crypto.subtle.importKey('raw', secureKey.subarray(0, Ciphering.ENC.alg.length >> 3), Ciphering.ENC.alg, Ciphering.ENC.ext, Ciphering.ENC.use),
			crypto.subtle.importKey('raw', secureKey.subarray(Ciphering.ENC.alg.length >> 3), Ciphering.MAC.alg, Ciphering.MAC.ext, Ciphering.MAC.use),

		]).then(function(keys){

			return Ciphering.encipher(keys[0], keys[1], derivedPassword);

		}).then(function(result){

			return I.lsWrite('keysSecured', result, app);

		});

	};

	self._restoreKeysSecured = function(secureKey){

		return I.lsRead('keysSecured', app).then(function(encodedKeyMaterial){

			if(encodedKeyMaterial === null) return false;

			return Promise.all([

				crypto.subtle.importKey('raw', secureKey.subarray(0, Ciphering.ENC.alg.length >> 3), Ciphering.ENC.alg, Ciphering.ENC.ext, Ciphering.ENC.use),
				crypto.subtle.importKey('raw', secureKey.subarray(Ciphering.ENC.alg.length >> 3), Ciphering.MAC.alg, Ciphering.MAC.ext, Ciphering.MAC.use),

			]).then(function(keys){

				return Ciphering.decipher(keys[0], keys[1], encodedKeyMaterial);

			}).then(function(result){

				if(result.data.byteLength !== 48) throw new Error(l[4]);
				return result.data;

			});

		});

	};

	self._initVars = function(keyMaterial, key_s, key_e, settingsEnc, contactsEnc){

		if(

			!(keyMaterial instanceof ArrayBuffer) ||
			!(typeof key_s === 'object' && typeof key_s.data === 'string' && typeof key_s.uuid === 'string' && typeof key_s.time === 'number') || //user private RSA signing key
			!(typeof key_e === 'object' && typeof key_e.data === 'string' && typeof key_e.uuid === 'string' && typeof key_e.time === 'number') //user private RSA encoding key

		) throw new Error(l[90]);

		return self._restoreRSA(keyMaterial, key_s, key_e).then(function(){

			var promises = [];
			if(typeof settingsEnc === 'string') promises.push(self._settingsDecode(settingsEnc)); //user settings
			if(typeof contactsEnc === 'string') promises.push(self._s.c.load(contactsEnc)); //user contacts
			return Promise.all(promises);

		});

	};

	self.setCredentials = function(data){

		if(data.rsaUUID){

			if(!data.rsaTime) throw new Error('rsa id must have time pair');
			self.keyring.keys.SIGN.uuid = self.keyring.keys.ENC.uuid = data.rsaUUID;
			self.keyring.keys.SIGN.time = self.keyring.keys.ENC.time = data.rsaTime;

		}

		data.nick && self.changeNick(data.nick);
		data.folder && self.changeFolder(data.folder);
		data.hush && (self._d.pwdHush = data.hush);
		typeof data.addRecipients !== 'undefined' && (self._s.rc = data.addRecipients);
		typeof data.groupEmails !== 'undefined' && (self._s.ge = data.groupEmails);
		typeof data.signature !== 'undefined' && (self._s.sig = data.signature);

		if(data.aliases){ //user aliases

			self.aliases = [];

			data.aliases.forEach(function(alias){

				try{ var nick = b64DecodeUnicode(alias.nick); }catch(e){ nick = ''; }
				var folderIndex = F.byId(alias.folder, true);
				self.aliases.push({'alias': alias.alias, 'fp': alias.fingerprint, 'folder': folderIndex && [1, 2, 4].indexOf(folderIndex) < 0 ? alias.folder : F.folders[0].id, 'nick': clearTags(nick)});
				alias.avatar && AV.set(alias.avatar, alias.alias);
				alias.alias === self._d.login && (self.me.fp = alias.fingerprint);

			});

		}

		if(typeof data.paidTo !== 'undefined' && self._v.paidTo !== data.paidTo){

			self._v.paidTo = data.paidTo;

			if(config.initialized && self._v.t === data.type){

				D.i([l[387].ucFirst(), l[550].ucFirst() + ': ' + I.dateFormat(self._v.paidTo, 9)], [l[0].ucFirst()]);
				DOM.userMembership();

			}

		}

		if(typeof data.type !== 'undefined' && self._v.t !== data.type){

			if(config.initialized){

				if(self._v.t > 0 && data.type > 2){

					D.i([l[387].ucFirst(), l[548].ucFirst() + ' "' + self.typeName(data.type).ucFirst() + '"'], [l[0].ucFirst()]);

				}else if(self._v.t > 2 && data.type < 3){

					D.c([l[112].ucFirst(), l[546]], [l[547].ucFirst(), l[102].ucFirst()], function(result){

						D.h();
						if(result) I.changePage('plans');

					});

				}

			}

			self._v.t = data.type;
			self._sessionStore();
			DOM.userMembership();

		}

		if(data.login){

			self._d.login = data.login;
			SecureFeedbackEmailForAnswer = self._d.login + '@' + config.domain; //default email for feedback

		}

		if(data.rsaUUID || data.login || data.aliases){ //changing this values recreate my contact

			self.me = new cContact(self._d.login, self.currentNick());
			self.me.currentKeys.signId = self.keyring.keys.SIGN.id;
			self.me.currentKeys.encId = self.keyring.keys.ENC.id;

			for(var i in self.aliases){

				if(self.aliases[i].alias !== self._d.login) continue;
				self.me.fp = self.aliases[i].fp;
				break;

			}

			if(!self.me.fp) throw new Error('user fingerprint not defined');

		}

		return self._d.login === U._d.login ? self._storeDevice() : Promise.resolve(true);

	};

	self.typeName = function(type){

		switch(type){

		case 3:

			return l[173];

		case 4:

			return l[174];

		case 5:

			return l[177];

		default:

			return l[549];

		}

	};

	self.currentNick = function(forAlias){

		forAlias = forAlias ? addrInternal(forAlias) : self._d.login;
		for(var i in self.aliases) if(self.aliases[i].alias === forAlias) return self.aliases[i].nick;
		throw new Error(l[363]);

	};

	self.changeNick = function(val){

		for(var i in self.aliases) if(self.aliases[i].alias === self._d.login) return self.aliases[i].nick = clearTags(val);
		throw new Error(l[363]);

	};

	self.aliasByAddress = function(address){

		for(var i in self.aliases) if(self.aliases[i].alias === address) return self.aliases[i];
		throw new Error(l[363]);

	};

	self.defaultFolder = function(){

		for(var i in self.aliases) if(self.aliases[i].alias === self._d.login){

			var folderIndex = F.byId(self.aliases[i].folder, true);
			return folderIndex !== null && [1, 2, 4].indexOf(folderIndex) < 0 ? self.aliases[i].folder : F.folders[0].id;

		}

		throw new Error(l[363]);

	};

	self.deleteFolder = function(folderId){

		var res = false;

		for(var i in self.aliases) if(self.aliases[i].folder === folderId){

			self.aliases[i].folder = F.folders[0].id;
			res = true;

		}

		return res;

	};

	self.aliasFolder = function(alias){

		if(!alias) return F.folders[0].id;

		for(var i in self.aliases) if(self.aliases[i].alias === alias){

			var folder = F.byId(self.aliases[i].folder);
			return folder ? folder.id : F.folders[0].id;

		}

		throw new Error(l[363]);

	};

	self.changeFolder = function(val){

		for(var i in self.aliases) if(self.aliases[i].alias === self._d.login) return self.aliases[i].folder = val;
		throw new Error(l[363]);

	};

	self.keyIdByUuid = function(uuid, required){

		for(var i in self.keyring.keys){

			if(self.keyring.keys[i].role !== 'ENC' || self.keyring.keys[i].uuid !== uuid) continue;
			return self.keyring.keys[i].id;

		}

		if(required){

			throw new Error(l[363]);

		}else return null;

	};

	self.rsaChain = function(rsaKeys, index, keyId){

		index = index || 0;
		if(!rsaKeys || index >= rsaKeys.length) return Promise.resolve(true);
		keyId = keyId || self.keyring.keys.ENC.id;

		return Encryption.decrypt(self.keyring, [keyId], msgpack.unpack(a2b(rsaKeys[index].key))).then(function(result){

			return initKeyring(result.data).then(function(result){

				return result.loadKey('ENC', s2e(rsaKeys[index].data));

			}).then(function(result){ //add new user public keys to my keyring

				self.keyring.keys[result.id] = {};
				self.keyring.keys[result.id].id = result.id;
				self.keyring.keys[result.id].privateKey = result.privateKey;
				self.keyring.keys[result.id].role = result.role;
				self.keyring.keys[result.id].time = rsaKeys[index].time;
				self.keyring.keys[result.id].uuid = rsaKeys[index].uuid;

				return self.rsaChain(rsaKeys, ++index, result.id);

			});

		});

	};

	self._initRSA = function(keyMaterial){

		return initKeyring(keyMaterial).then(function(result){

			if(self.keyring){

				for(var i in self.keyring.keys){ //store previous keys in new keyring

					if(['SIGN', 'ENC'].indexOf(i) >= 0) continue;
					result.keys[i] = self.keyring.keys[i];

				}

			}

			self.keyring = result;
			self.cipher = new Ciphering(self.keyring.keyWrapKey, self.keyring.keyAuthKey);

			return Promise.all([ //new private keys

				self.keyring.newKey('SIGN'),
				self.keyring.newKey('ENC'),

			]);

		}).then(function(){

			return Promise.all([ 

				self.keyring.saveKey('SIGN'), //private RSA keys exports, (encrypted by Keyring initial password & salt)
				self.keyring.saveKey('ENC'),
				self.keyring.exportPublicKey('SIGN'), //public RSA keys export
				self.keyring.exportPublicKey('ENC'),

			]);

		});

	};

	self._restoreRSA = function(keyMaterial, keySignEncoded, keyEncEncoded){

		return initKeyring(keyMaterial).then(function(result){

			self.keyring = result;
			self.cipher = new Ciphering(self.keyring.keyWrapKey, self.keyring.keyAuthKey);

			return Promise.all([

				self.keyring.loadKey('SIGN', s2e(keySignEncoded.data)),
				self.keyring.loadKey('ENC', s2e(keyEncEncoded.data))

			]);

		}).then(function(){

			self.keyring.keys.SIGN.uuid = keySignEncoded.uuid;
			self.keyring.keys.SIGN.time = keySignEncoded.time;
			self.keyring.keys.ENC.uuid = keyEncEncoded.uuid;
			self.keyring.keys.ENC.time = keyEncEncoded.time;
			return true;

		});

	};

	self.access = function(min){

		return self._v.t >= min;

	};

	self.granted = function(level){

		if(!self.access(level)){

			I.changePage('');
			return false;

		}

		return true;

	};

	self.sessionSet = function(sid, id){

		var changed = self.sid !== sid;
		self.sessionUpdateTime = Date.now() / 1000 | 0;
		clearTimeout(self.sessionTimeout);
		self.sessionTimeout = null;
		changed && N.stopWiredToSession();
		self.sid = sid;
		typeof id === 'string' && (self.id = id);

		self._sessionStore().then(function(){

			return self.heartbeat();

		});

		return changed;

	};

	self.heartbeat = function(force, appInit){

		return new Promise(function(res){

			if(force){

				clearTimeout(self.sessionTimeout);
				self.sessionUpdateTime = 0;

			}else if(app) return res(true);

			var sec = config.heartbeatTimeout - ((Date.now() / 1000 | 0) - self.sessionUpdateTime);
			sec < 0 && (sec = 0);
			if(self.sessionTimeout && sec > 0) return res(true);
			clearTimeout(self.sessionTimeout);

			self.sessionTimeout = setTimeout(function(){

				clearTimeout(self.sessionTimeout);
				self.sessionTimeout = null;

				A.sessionUpdate({newEmails: U.access(1), appInit: appInit}).then(function(result){

					if(result === false) throw new Error(l[5]);
					res(true);

				}).catch(function(){

					self.sessionUpdateTime = (Date.now() / 1000 | 0);
					clearTimeout(self.sessionTimeout);
					self.sessionTimeout = null;
					self.heartbeat();
					res(false);

				});

			}, 1000 * sec);

			sec > 0 && res(true);

		});

	};

	self.sessionClear = function(){

		self.sid = self.id = '';
		self.sessionUpdateTime = 0;
		self._sessionStore();

	};

	self._sessionStore = function(){

		return self.deviceWrap([self.sid, self.sessionUpdateTime, self.id, self._v.t]).then(function(result){

			return I.lsWrite('session', result, app);

		});

	};

	self._sessionRestore = function(passcode){

		return I.lsRead('session', app).then(function(result){

			return self.deviceUnwrap(result, passcode);

		}).then(function(result){

			if(!result || !(result instanceof Array) || typeof result[0] !== 'string' || typeof result[1] !== 'number' || typeof result[2] !== 'string' || typeof result[3] !== 'number') return false;
			self.sid = result[0];
			self.sessionUpdateTime = result[1];
			self.id = result[2];
			self._v.t = result[3];
			(self.sid || self._v.t) && (common.firstVisit = false);
			return true;

		});

	};

	self.langChange = function(lang){

		return I.loadFile(languages[lang]).then(function(result){

			l = JSON.parse(result);
			self._d.lang = lang;
			return true;

		});

	};

	self.reset = function(){

		self.keyring = {};
		self._v.t = 0;
		self._v.d = 0;
		self._d.pwdHush = '';
		SecureFeedbackEmailForAnswer = '';
		F = self._s.f = new cFolders();
		C = self._s.c = new cContacts();
		X = self._s.x = new cChannels();

	};

	self.logout = function(loc, clearSession){

		clearSession && self.sessionClear();

		return (self.setDeviceVars({pcm: 0, passBlocked: 0, passTries: 3, passCode: ''})).then(function(){

			var _go = function(){

				app && window.plugins.nativepagetransitions.cancelPendingTransition();
				loc === null || I.changePage(loc, {effect: 'flipup'});

			};

			if(!self.access(1)) return _go();
			self.reset();
			I.lsClear();
			I.reset(true);
			E = new cEmails();
			FS = new cFiles();
			AV = new cAvatars();
			W.reset();
			_go();

		});

	};

	self.isMe = function(v){

		for(var i in self.aliases) if(addrInternal(v) === self.aliases[i].alias) return true;
		return false;

	};

	self.findMe = function(aliases){

		aliases instanceof Array || (aliases = [aliases]);
		for(var i in aliases) for(var j in self.aliases) if(aliases[i] === self.aliases[j].alias) return aliases[i];
		return '';

	};

	self.netSave = function(toSave){

		if(!toSave || !toSave.length) return;
		var promises = [];

		for(var i in toSave){

			switch(toSave[i]){

			case 'aliases':

				promises.push(toSave[i], self.aliases.map(function(alias){ return [alias.alias, b64EncodeUnicode(alias.nick), alias.folder]; }));
				break;

			case 'settings':

				promises.push(toSave[i], self._settingsEncrypt());
				break;

			case 'contacts':

				promises.push(toSave[i], self._s.c.encode());
				break;

			case 'avatar':

				promises.push(toSave[i], Promise.all([self._d.login, AV.asBase64()]));
				break;

			}

		}

		return Promise.all(promises).then(function(results){

			var data = {};
			for(var i = 0; i < results.length; i+=2) data[results[i]] = results[i + 1];
			return A.optionsSave(data);

		}).then(function(response){

			if(response === 'cancelled') return false;
			response.avatar_uuid && AV.set({uuid: response.avatar_uuid});
			return true;

		});

	};

	self._settingsEncrypt = function(){

		var data = {

			rpp: self._s.rpp,
			rc: self._s.rc,
			ge: self._s.ge,
			sig: self._s.sig,
			f: self._s.f.toObject(),

		};

		return Encryption.encrypt(self.keyring, [self.keyring.keys.ENC.id], {data: msgpack.pack(data), aad: s2b(self.id).buffer}).then(function(result){ //pack and encode user settings

			return Signing.sign(self.keyring, [self.keyring.keys.SIGN.id], result); //sign packet

		}).then(function(result){

			return b2a(msgpack.pack(result));

		});

	};

	self._settingsDecode = function(data){

		data = msgpack.unpack(a2b(data));

		return Signing.verify(self.keyring, [self.keyring.keys.SIGN.id], data).then(function(result){ //check signature

			if(!result) throw new Error('settings signature is wrong');
			return Encryption.decrypt(self.keyring, [self.keyring.keys.ENC.id], data); //decrypt and unpack data

		}).then(function(result){

			result = msgpack.unpack(result.data);
			self._s.rpp = result.rpp;
			self._s.rc = result.rc;
			self._s.ge = result.ge;
			self._s.sig = result.sig || '';
			self._s.f.fromObject(result.f);
			return true;

		});

	};

	self._visitCard = function(keyring, keyPublicSign, keyPublicEnc, signKeysIds){

		signKeysIds instanceof Array || (signKeysIds = [signKeysIds]);

		return Signing.sign(keyring, signKeysIds, msgpack.pack({ //user visit card, signed by current signing key

			ver: self._version,
			key_sign_id: keyPublicSign.id,
			key_enc_id: keyPublicEnc.id,

		})).then(function(result){

			return b2a(msgpack.pack(result));

		});

	};

	self._checkPassword = function(pwd){

		return self._createHush(pwd, self.id).then(function(result){

			return result === self._d.pwdHush;

		});

	};

	self.maxTTL = function(){

		return parseInt(lastObjectKey(options['u' + self.class()]['t']));

	};

	self.switchAlias = function(switchTo){

		switchTo = addrInternal(switchTo);
		if(switchTo === U.login()) return Promise.resolve(true);

		return this.setCredentials({login: switchTo}).then(function(){

			DOM.aliasView();

		});

	};

	self.settingsReload = function(){

		A.getSettings().then(function(result){

			self._settingsDecode(result.settings).then(function(){

				I.isDesktop ? F.domFill(document.getElementById('folders')) : F.domFillM(document.getElementById('folders'));
				F.setStats();

			});

		});

	};

	self._createHush = function(pwd, salt){

		return derivePassword(u2b(pwd), salt, 8192).then(function(result){

			return crypto.subtle.digest('SHA-256', result);

		}).then(function(result){

			return crypto.subtle.digest('SHA-256', result);

		}).then(function(result){

			return b2x(result);

		});

	};

	self.changeCredentials = function(oldPassword, pwd, params){

		if(!oldPassword){

			return self.setCredentials(params).then(function(){

				return self.netSave(['aliases', 'settings']);

			});

		}

		var prevPrivateSign = self.keyring.keys.SIGN,
			prevPrivateEnc = self.keyring.keys.ENC,
			derivedPassword, data;

		return Promise.all([

			self._checkPassword(oldPassword), //check old password
			derivePassword(u2b(pwd), self.id, 8192) //prepare new key material

		]).then(function(results){

			if(!results[0]) throw new Error(l[327]);

			derivedPassword = results[1];

			return Promise.all([

				self._initRSA(derivedPassword), //init new RSA
				derivePassword(u2b(oldPassword), self.id, 8192), //old derived password
				crypto.subtle.digest('SHA-256', derivedPassword), //hash of new derived password

			]);

		}).then(function(newData){

			return Promise.all([

				self._settingsEncrypt(), //encrypted user settings
				self._s.c.encode(), //encrypted user contacts
				self._visitCard(self.keyring, self.keyring.keys.SIGN, self.keyring.keys.ENC, [prevPrivateSign.id, self.keyring.keys.SIGN.id]), //user visit card
				Encryption.encrypt(self.keyring, [self.keyring.keys.ENC.id], {data: newData[1], aad: s2b(self.id).buffer}), //previous rsa derived key encrypted by new rsa key
				self._createHush(pwd, self.id), //create new password hush

			]).then(function(results){

				var secureStorageKey = crypto.getRandomValues(new Uint8Array(48)); //session encryption key for my RSA pair to store locally secure way

				data = {

					aliases: self.aliases.map(function(alias){ return [alias.alias, u2a(alias.nick), alias.folder]; }),
					prk_s: newData[0][0],
					prk_e: newData[0][1],
					puk_s: newData[0][2],
					puk_e: newData[0][3],
					passwordHash: newData[2],
					settings: results[0],
					contacts: results[1],
					visitCard: results[2],
					rsaChain: {'uuid': prevPrivateEnc.uuid, 'key': b2a(msgpack.pack(results[3]))},
					key: secureStorageKey

				};

				params.alias && (data.alias = params.alias);

				return A.optionsSave(data).then(function(response){

					if(response === 'cancelled') return;
					if(!response.rsa_uuid || !response.rsa_time || !response.type || !response.aliases) throw new Error(l[90]);

					data = {

						type: response.type,
						rsaUUID: response.rsa_uuid,
						rsaTime: response.rsa_time,
						aliases: response.aliases,
						hush: results[4]

					};

					params.login && (data.login = params.login);

					return self.setCredentials(data).then(function(){

						return self._storeKeysSecured(derivedPassword, secureStorageKey).then(function(){

							secureStorageKey = null; //from now all the secrets are in memory only

						});

					});

				});

			});

		});

	};

}