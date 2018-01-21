'use strict';

/*
 * Perform key derivation basing on user-supplied password.
 * @global
 * @param {(string|Uint8Array|ArayBuffer)} password
 * @param {(string|Uint8Array|ArayBuffer)} salt
 * @param {number} [cost=8192] computational cost parameter
 * @return {Promise}
*/

function derivePassword(password, salt, cost){

	if(!password) throw new ReferenceError(derivePassword.EBADPASSWORD);
	typeof password === 'string' && (password = u2b(password));
	password instanceof ArrayBuffer && (password = new Uint8Array(password));
	if(!(password instanceof Uint8Array)) throw new TypeError(derivePassword.EBADPASSWORD);
	if(!salt) throw new ReferenceError(derivePassword.EBADSALT);
	if(typeof salt === 'string') salt = u2b(salt);
	if(salt instanceof ArrayBuffer) salt = new Uint8Array(salt);
	if(!(salt instanceof Uint8Array)) throw new TypeError(derivePassword.EBADSALT);
	cost = cost || 8192;
	var seed = new Uint8Array(salt.byteLength + 4),
		view = new DataView(seed.buffer);
	seed.set(salt, 0);
	view.setUint32(salt.byteLength, cost);

	return crypto.subtle.importKey('raw', password, derivePassword.KDF.alg, derivePassword.KDF.ext, derivePassword.KDF.use).then(function(pwKey){

		return crypto.subtle.sign(derivePassword.KDF.alg, pwKey, seed).then(function(halfBlock){

			var blockSize = 2 * halfBlock.byteLength,
				buffer = new Uint8Array(blockSize * cost),
				view = new DataView(buffer.buffer);
			halfBlock = new Uint8Array(halfBlock);

			for(var i = 0; i < cost; i++){

				buffer.set(halfBlock, i * blockSize);
				view.setUint32((i + 1) * blockSize - 4, i + 1);

			}

			return crypto.subtle.sign(derivePassword.KDF.alg, pwKey, buffer);

		});

	});

}


/*
 * Password derivation error messages.
 * @enum
*/

derivePassword.EBADPASSWORD = 'Bad password',
derivePassword.EBADSALT = 'Bad salt';

/*
 * Password derivation algorithm parameters
 * @const
*/

derivePassword.KDF = {

	ext: false,
	use: [
		'sign',
	],
	alg: {
		name: 'HMAC',
		hash: 'SHA-384'
	},

};

/*
 * Authenticated encryption using AES-CBC with HMAC_SHA-256 for message authentication.
 * @class
 * @param {CryptoKey} encKey - content encryption key
 * @param {CryptoKey} macKey - message authentication code key
*/

function Ciphering(encKey, macKey){

	if((!encKey || !(encKey instanceof Object)) || (!macKey || !(macKey instanceof Object))) throw new SyntaxError(Ciphering.EARGS);
	//	if((!encKey || !(encKey instanceof CryptoKey)) || (!macKey || !(macKey instanceof CryptoKey))) throw new SyntaxError(Ciphering.EARGS);
	this.encKey = encKey,
	this.macKey = macKey;

}

/*
 * TODO doc
*/

Ciphering.prototype.encipher = function(data){

	return Ciphering.encipher(this.encKey, this.macKey, data);

};

/*
 * TODO doc
*/

Ciphering.prototype.decipher = function(data){

	return Ciphering.decipher(this.encKey, this.macKey, data);

};

/*
 * Ciphering error messages.
 * @enum
*/

Ciphering.EARGS = 'Illegal arguments',
Ciphering.EBADV = 'Bad version',
Ciphering.EBADIV = 'Bad IV',
Ciphering.EBADAAD = 'Bad AAD',
Ciphering.EBADTAG = 'Bad TAG',
Ciphering.EINVALID = 'MAC verification failed';

/*
 * Symmetric encryption parameters
 * @const
*/

Ciphering.ENC = {

	ext: true,
	iv_len: 16,
	use: [
		'encrypt',
		'decrypt',
	],
	alg: {
		'name': 'AES-CBC',
		'length': 256,
	},

};

/*
 * Message authentication parameters
 * @const
*/

Ciphering.MAC = {

	ext: true,
	use: [
		'sign',
		'verify',
	],
	alg: {
		'name': 'HMAC',
		'hash': 'SHA-256',
		'length': 128,
	},

};

/*
 * @private
*/

function _Chipering_checkArguments(encKey, macKey, data){

	if(!encKey || !macKey || !data || !(encKey instanceof Object) || !(macKey instanceof Object)) throw new SyntaxError(Ciphering.EARGS);
	//	if(!encKey || !macKey || !data || !(encKey instanceof CryptoKey) || !(macKey instanceof CryptoKey)) throw new SyntaxError(Ciphering.EARGS);
	data instanceof ArrayBuffer && (data = {data: data});
	if(data.v && typeof data.v !== 'number') throw new SyntaxError(Ciphering.EBADV);
	if(data.iv && !(data.iv instanceof ArrayBuffer)) throw new SyntaxError(Ciphering.EBADIV);
	if(data.aad && !(data.aad instanceof ArrayBuffer)) throw new SyntaxError(Ciphering.EBADAAD);
	if(data.tag && !(data.tag instanceof ArrayBuffer)) throw new SyntaxError(Ciphering.EBADTAG);
	return data;

}

/*
 * TODO doc
*/

Ciphering.encipher = function(encKey, macKey, data){

	data = _Chipering_checkArguments(encKey, macKey, data);
	var iv = data.iv || crypto.getRandomValues(new Uint8Array(Ciphering.ENC.iv_len)).buffer,
		aad = data.aad || null,	v = 1;

	return crypto.subtle.encrypt(mixin({'iv': iv}, Ciphering.ENC.alg), encKey, data.data).then(function(edata){

		data = edata;
		return crypto.subtle.sign(Ciphering.MAC.alg, macKey, msgpack.pack([v, aad, iv, edata]));

	}).then(function(tag){

		data = {'v': v, 'iv': iv, 'data': data, 'tag': tag};
		aad && (data['aad'] = aad);
		return data;

	});

};

/*
 * TODO doc
*/

Ciphering.decipher = function(encKey, macKey, data){

	data = _Chipering_checkArguments(encKey, macKey, data);
	if(data.v !== 1) throw new SyntaxError(Ciphering.EBADV);
	if(!data.iv) throw new SyntaxError(Ciphering.EBADIV);
	if(!data.tag) throw new SyntaxError(Ciphering.EBADTAG);
	var aad = data.aad || null, iv = data.iv;

	return crypto.subtle.verify(Ciphering.MAC.alg, macKey, data.tag, msgpack.pack([data.v, aad, iv, data.data])).then(function(valid){

		if(!valid) throw new Error(Ciphering.EINVALID);

	}).then(function(){

		return crypto.subtle.decrypt(mixin({'iv': iv}, Ciphering.ENC.alg), encKey, data.data);

	}).then(function(ddata){

		data = {'data': ddata};
		aad && (data['aad'] = aad);
		return data;

	});

};

/*
 * @class Keyring
 * @param {CryptoKey} kwk - key wrapping key
 * @param {CryptoKey} kak - key authentication key
*/

function Keyring(kwk, kak){

//	if((!kwk || !(kwk instanceof CryptoKey)) || (!kak || !(kak instanceof CryptoKey))) throw new SyntaxError(Keyring.EARGS);
	if((!kwk || !(kwk instanceof Object)) || (!kak || !(kak instanceof Object))) throw new SyntaxError(Keyring.EARGS);
	this.keyWrapKey = kwk,
	this.keyAuthKey = kak;
	this.keys = {};

}

/*
 * Key ID parameters
 * @const
*/

Keyring.KID = {

	len: 16,
	alg: 'SHA-256',

};

/*
 * Key Wrapping Key parameters
 * @const
*/

Keyring.KWK = {

	ext: false,
	use: [
		'encrypt',
		'decrypt',
	],
	alg: {
		'name': 'AES-CBC',
		'length': 256,
	},

};

/*
 * Key Authentication Key parameters
 * @const
*/

Keyring.KAK = {

	ext: false,
	use: [
		'sign',
		'verify',
	],
	alg: {
		'name': 'HMAC',
		'hash': 'SHA-256',
		'length': 128,
	},

};

/*
 * @enum
*/

Keyring.KEY_ROLES = {

	'ENC': { // Public Key Encryption Role

		ext: true,
		use: [
			'encrypt',
			'decrypt',
		],
		alg: {
			'name': 'RSA-OAEP',
			'hash': 'SHA-1',
			'modulusLength': 4096,
			'publicExponent': new Uint8Array([1,0,1]),
		},
		toString: function(){ return 'ENC'; }

	},

	'SIGN': { // Public Key Signatures Role

		ext: true,
		use: [
			'verify',
			'sign',
		],
		alg: {
			'name': 'RSASSA-PKCS1-v1_5',
			'hash': 'SHA-256',
			'modulusLength': 4096,
			'publicExponent': new Uint8Array([1,0,1]),
		},
		toString: function(){ return 'SIGN'; }

	}

};

/*
 * Keyring error messages constants.
 * @enum
*/

Keyring.EARGS = 'Illegal arguments',
Keyring.EBADSECRET = 'Bad secret',
Keyring.EBADSECRETLEN = 'Illegal secret length',
Keyring.EBADROLE = 'Bad key role',
Keyring.ESTATE = 'Illegal state',
Keyring.EMALFORMED = 'Malformed key',
Keyring.ENOKEY = 'Key not found';

/*
 * Create a keyring from the symmetric secret value.
 * @static
 * @param {(string|ArrayBuffer|Uint8Array)} - Raw or base64-encoded secret value
 * @return {Promise<Keyring>}
*/

Keyring.create = function(secret){

	typeof secret === 'string' && (secret = s2b(atob(secret)));
	secret instanceof ArrayBuffer && (secret = new Uint8Array(secret));
	if(!(secret instanceof Uint8Array)) throw new TypeError(Keyring.EBADSECRET);

	if(8 * secret.byteLength < Keyring.KWK.alg.length + Keyring.KAK.alg.length) throw new SyntaxError(Keyring.EBADSECRETLEN);

	return Promise.all([

		crypto.subtle.importKey('raw', secret.subarray(0, Keyring.KWK.alg.length >> 3), Keyring.KWK.alg, Keyring.KWK.ext, Keyring.KWK.use),
		crypto.subtle.importKey('raw', secret.subarray(Keyring.KWK.alg.length >> 3), Keyring.KAK.alg, Keyring.KAK.ext, Keyring.KAK.use),

	]).then(function(keys){

		return new Keyring(keys[0], keys[1]);

	});

};

/*
 * Generate new key of the specified key role.
 * @param {string} role - key role
 * @return {Promise<CryptoKey>} Promise for newly generated key.
*/

Keyring.prototype.newKey = function(role){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole) throw new Error(Keyring.EBADROLE);
	var self = this;

	return crypto.subtle.generateKey(keyRole.alg, keyRole.ext, keyRole.use).then(function(key){

		key.role = keyRole.toString();

		return crypto.subtle.exportKey('spki', key.publicKey).then(function(keyData){

			return crypto.subtle.digest(Keyring.KID.alg, keyData);

		}).then(function(kid){

			kid = b2z(kid).substr(0, Keyring.KID.len);
			key.id = kid;
			self.keys[keyRole] = self.keys[kid] = key;
			return key;

		});

	});

};

/*
 * Get {CryptoKey} instance of the specified role having the specified identifier.
 * @param {string} role - key role
 * @param {string} [kid] - Optional key identifier (ignored for now)
 * @return {Promise<CryptoKey>} Promise for key.
*/

Keyring.prototype.getKey = function(role, kid){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole) throw new Error(Keyring.EBADROLE);
	var key = kid ? this.keys[kid] : this.keys[keyRole];

	if(key){

		if(key.role != keyRole) return Promise.reject(new Error(Keyring.ENOKEY));
		return Promise.resolve(key);

	}

	// TODO make API request to get key from server
	// TODO check Bloom filter prior to API request

	return Promise.reject(new Error(Keyring.ENOKEY));

};

/*
 * Wrap and sign the existing key of the specified key role.
 * @param {string} role - key role
 * @return {Promise<string>} Promise for wrapped and base64-encoded key.
*/

Keyring.prototype.saveKey = function(role){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole || !keyRole.ext) throw new Error(Keyring.EBADROLE);
	var encKey = this.keyWrapKey, macKey = this.keyAuthKey, key = this.keys[keyRole];
	if(!encKey || !macKey || !key || !key.privateKey.extractable) throw new Error(Keyring.ESTATE);
	var self = this;

	return crypto.subtle.exportKey('jwk', key.privateKey).then(function(jwkPrv){

		jwkPrv['kid'] = key.id;
		jwkPrv['kr'] = keyRole.toString();
		jwkPrv['key_ops'] = keyRole.use;

		switch(jwkPrv.kty){

		case 'RSA':

			['n','e','d','p','q','dp','dq','qi'].forEach(function(x){

				jwkPrv[x] = a2b(jwkPrv[x]).buffer;

			});

			break;

		default:

			throw new Error(Keyring.ESTATE);
		}

		return Ciphering.encipher(self.keyWrapKey, self.keyAuthKey, msgpack.pack(jwkPrv));

	});

};

/*
 * Verify and unwrap the supplied key pretending to the specified key role.
 * @param {string} role - key role
 * @param {string} data - raw or base64-encoded key
 * @param {boolean} [noext] - if `true` force the key to be non-extractable, defaults to `ext` attribute of the key role otherwise
 * @return {Promise<CryptoKey>} Promise for loaded key.
*/

Keyring.prototype.loadKey = function(role, data, noext){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole) throw new SyntaxError(Keyring.EBADROLE);
	var decKey = this.keyWrapKey, macKey = this.keyAuthKey;
	var self = this;

	return Ciphering.decipher(decKey, macKey, data).catch(function(){

		throw new Error(Keyring.EMALFORMED);

	}).then(function(dec){

		var jwkPrv = msgpack.unpack(dec.data);
		if(jwkPrv.kr != keyRole) throw new Error(Keyring.EMALFORMED);

		var jwkPub = {

			'kty': jwkPrv.kty,
			'alg': jwkPrv.alg,
			'key_ops': [jwkPrv.key_ops[0]],

		};

		switch(jwkPrv.kty){

		case 'RSA':

			['n','e','d','p','q','dp','dq','qi'].forEach(function(x){

				jwkPrv[x] = b2a(jwkPrv[x]);

			});

			jwkPub['n'] = jwkPrv.n, jwkPub['e'] = jwkPrv.e;
			break;

		default:

			throw new Error(Keyring.EMALFORMED);

		}

		return Promise.all([

			crypto.subtle.importKey('jwk', jwkPub, keyRole.alg, keyRole.ext, [keyRole.use[0]]),
			crypto.subtle.importKey('jwk', jwkPrv, keyRole.alg, noext ? false : keyRole.ext, [keyRole.use[1]]),

		]).then(function(res){

			var key = {'id': jwkPrv.kid, 'role': keyRole.toString(), 'publicKey': res[0], 'privateKey': res[1]};
			self.keys[key.id] = key;
			if(!self.keys[keyRole]) self.keys[keyRole] = key;
			return key;

		});

	});

};

/*
 * Export public key into OpenSSL-compatible PEM container.
 * @param {string} role - role of the key being exported
 * @return {Promise<string>} PEM string.
*/

Keyring.prototype.exportPublicKey = function(role){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole) throw new Error(Keyring.EBADROLE);
	var key = this.keys[keyRole];
	if(!key || !key.publicKey) throw new Error(Keyring.ESTATE);

	return crypto.subtle.exportKey('spki', key.publicKey).then(function(keyData){

		return '-----BEGIN PUBLIC KEY-----\n' + btoa(b2s(keyData)).match(/.{1,64}/g).join('\n') + '\n' + '-----END PUBLIC KEY-----\n';

	});

};

/*
 * Import public key from OpenSSL-compatible PEM container.
 * @param {string} role - role of the key being exported
 * @param {string} keyData - PEM-encoded public key
 * @return {Promise<CryptoKey>} Promise for imported key.
*/

Keyring.prototype.importPublicKey = function(role, keyData, keyUUID){

	var keyRole = Keyring.KEY_ROLES[role];
	if(!keyRole) throw new Error(Keyring.EBADROLE);
	if(typeof keyData !== 'string') throw new TypeError(Keyring.EMALFORMED);

	keyData = s2b(atob(keyData.replace(/-(-)*\s?BEGIN\s+PUBLIC\s+KEY\s*-(-)*\r?\n/, '').replace(/-(-)*\s?END\s+PUBLIC\s+KEY\s*-(-)*\r?\n?/, '').replace(/\s/g, '').replace(/\r?\n/g, '')));
	var self = this;

	return Promise.all([

		crypto.subtle.digest(Keyring.KID.alg, keyData),
		crypto.subtle.importKey('spki', keyData, keyRole.alg, keyRole.ext, [keyRole.use[0]]),

	]).then(function(res){

		var kid = b2z(res[0]).substr(0, Keyring.KID.len), key = {'id': kid, 'role': keyRole.toString(), 'publicKey': res[1]};
		self.keys[kid] = self.keys[kid] || key;
		keyUUID && (self.keys[kid].uuid = keyUUID);
		return key;

	});

};

/*
 * @class Encryption
 * @param {Object} options - encryption options
*/

function Encryption(options){

	options = options || {};
	this.keyring = options.keyring;
	if(!this.keyring) throw new SyntaxError(Encryption.EKEYRING);

}

/*
 * TODO doc
*/

Encryption.prototype.encrypt = function(keys, data){

	return Encryption.encrypt(this.keyring, keys, data);

};

/*
 * TODO doc
*/

Encryption.prototype.decrypt = function(keys, data){

	return Encryption.decrypt(this.keyring, keys, data);

};

/*
 * Public Key Encryption error messages.
 * @enum
*/

Encryption.EKEYRING = 'Keyring required',
Encryption.EBADDATA = 'Bad data',
Encryption.ENOPUBKEY = 'No suitable public key found',
Encryption.ENOPRVKEY = 'No suitable private key found',
Encryption.EMALFORMED = 'Data integrity check failed';

/*
 * TODO doc
*/

Encryption.encrypt = function(keyring, keys, data){

	if(!keyring) throw new ReferenceError(Encryption.EKEYRING);
	(keys instanceof Array) || (keys = [keys]);
	if(!keys.length) throw new SyntaxError();
	(data instanceof ArrayBuffer) && (data = {data: data});
	var encRole = Keyring.KEY_ROLES.ENC, rcpts = data.rcpts || [];

	return Promise.all([

		crypto.subtle.generateKey(Ciphering.ENC.alg, true, Ciphering.ENC.use),
		crypto.subtle.generateKey(Ciphering.MAC.alg, true, Ciphering.MAC.use),

	]).then(function(cek){

		return Promise.all([

			Ciphering.encipher(cek[0], cek[1], data),
			crypto.subtle.exportKey('raw', cek[0]),
			crypto.subtle.exportKey('raw', cek[1]),

		]);

	}).then(function(res){

		data = res.shift();

		return Promise.all(keys.map(function(kid){

			return keyring.getKey(encRole, kid).then(function(encKey){

				return crypto.subtle.encrypt(encRole.alg, encKey.publicKey, msgpack.pack(res));

			}).then(function(ecek){

				var rcpt = {'cek': ecek};
				kid && (rcpt['kid'] = kid);
				rcpts.push(rcpt);

			});

		}));

	}).then(function(){

		data['v'] = 1, data['rcpts'] = rcpts;
		return data;

	});

};

/*
 * TODO doc
*/

Encryption.decrypt = function(keyring, keys, data){

	if(!keyring) throw new ReferenceError(Encryption.EKEYRING);
	keys || (keys = []);
	keys instanceof Array || (keys = [keys]);
	if(!data || !data.data || !(data.data instanceof ArrayBuffer) || !data.rcpts || !(data.rcpts instanceof Array) || data.v !== 1) throw new Error(Encryption.EBADDATA);
	var encRole = Keyring.KEY_ROLES.ENC, rcptByKid = {};
	data.rcpts.forEach(function(rcpt){ rcptByKid[rcpt.kid] = rcpt; });
	keys.length || (keys = Object.keys(rcptByKid));

	return Promise.all(keys.map(function(kid){

		if(!(kid in rcptByKid) || !keyring.getKey) return null;

		return keyring.getKey(encRole, kid).then(function(encKey){

			if(!encKey.privateKey) return null;
			return crypto.subtle.decrypt(encRole.alg, encKey.privateKey, rcptByKid[kid].cek);

		}).catch(function(e){

			DEBUG_ERR(e); // Can't decrypt, it's ok for now
			return null;

		});

	})).then(function(res){

		for(var i = 0; i < res.length; i++){

			if(!res[i]) continue;

			try{

				return msgpack.unpack(res[i]);

			}catch(e){

				DEBUG_ERR(e);
				return Promise.reject(new Error(Encryption.EINVALID));

			}

		}

		return null;

	}).then(function(cek){

		if(!cek) return Promise.reject(new Error(Encryption.ENOPRVKEY));

		return Promise.all([

			crypto.subtle.importKey('raw', cek[0], Ciphering.ENC.alg, true, Ciphering.ENC.use),
			crypto.subtle.importKey('raw', cek[1], Ciphering.MAC.alg, true, Ciphering.MAC.use),

		]);

	}).then(function(cek){

		return Ciphering.decipher(cek[0], cek[1], data);

	});

};

/*
 * @class Signing
 * @param {Object} options - signing options
*/

function Signing(options){

	options = options || {};
	this.keyring = options.keyring;
	if(!this.keyring) throw new SyntaxError(Signing.EKEYRING);

}

/*
 * TODO doc
*/

Signing.prototype.sign = function(keys, data){

	return Signing.sign(this.keyring, keys, data);

};

/*
 * TODO doc
*/

Signing.prototype.verify = function(keys, data){

	return Signing.verify(this.keyring, keys, data);

};

/*
 * Public Key Signing error messages.
 * @enum
*/

Signing.EKEYRING = 'Keyring required',
Signing.EBADDATA = 'Bad data';

/*
 * TODO doc
*/

Signing.sign = function(keyring, keys, data){

	if(!keyring) throw new ReferenceError(Signing.EKEYRING);
	(keys instanceof Array) || (keys = [keys]);
	if(!keys.length) throw new SyntaxError();
	data instanceof ArrayBuffer && (data = {data: data});
	var signRole = Keyring.KEY_ROLES.SIGN;
	data.sigs = data.sigs || [], data.v  = 1;

	return Promise.all(keys.map(function(kid){

		return keyring.getKey(signRole, kid).then(function(signKey){

			kid = signKey.id;
			return crypto.subtle.sign(signRole.alg, signKey.privateKey, msgpack.pack([data.v, data.data]));

		}).then(function(sig){

			sig = {'sig': sig};
			kid && (sig['kid'] = kid);
			data.sigs.push(sig);
			return data;

		});

	})).then(function(){

		return data;

	});

};

/*
 * TODO doc
*/

Signing.verify = function(keyring, keys, data){

	if(!keyring) throw new ReferenceError(Signing.EKEYRING);
	keys || (keys = []);
	keys instanceof Array || (keys = [keys]);
	if(!data || !data.data || !(data.data instanceof ArrayBuffer) || !data.sigs || !(data.sigs instanceof Array) || data.v !== 1) throw new Error(Signing.EBADDATA);
	var signRole = Keyring.KEY_ROLES.SIGN;
	var sigByKid = {};
	data.sigs.forEach(function(sig){ sigByKid[sig.kid] = sig; });
	keys.length || (keys = Object.keys(sigByKid));

	return Promise.all(keys.map(function(kid){

		kid = kid || keyring.keys[signRole].id;
		if(!(kid in sigByKid)) return false;

		return keyring.getKey(signRole, kid).then(function(signKey){

			return crypto.subtle.verify(signRole.alg, signKey.publicKey, sigByKid[kid].sig, msgpack.pack([ data.v, data.data]));

		});

	})).then(function(res){

		var valid = true;
		for(var i = 0; i < res.length; i++) valid = valid && res[i];
		return valid;

	});

};

/*
 * Create persistent content-based file ID.
 * @param {Blob} file - file/blob object to create id for
 * @param {CryptoKey} macKey - secret HMAC key (MAC component of the master/device key is expected here)
 * @param {number} [chunkSize] - optional chunk size to split content at hashing time
 * @return {Promise<string>} - Promise for Z-Base32 file ID.
*/

function createFileId(file, macKey, chunkSize){

	if(!(file instanceof Blob) && !(file instanceof File)) throw new TypeError('file is expected to be a Blob instance');
	chunkSize = chunkSize || 1 << 20;

	var buffer = new Uint8Array(8 + 32 * Math.ceil(file.size / chunkSize)),
		fsh = (file.size / 0x100000000) | 0,
		fsl = file.size | 0;

	buffer[0] = 0,
	buffer[1] = fsh >>> 16 & 0x1f,
	buffer[2] = fsh >>> 8 & 0xff,
	buffer[3] = fsh & 0xff,
	buffer[4] = fsl >>> 24,
	buffer[5] = fsl >>> 16 & 0xff,
	buffer[6] = fsl >>> 8 & 0xff,
	buffer[7] = fsl & 0xff;

	return new Promise(function(res, rej){

		function _process_chunk(pos){

			if(pos < file.size){

				var reader = new FileReader();
				reader.onerror = function(){ res(l[449]); };
				reader.onabort = rej;

				reader.onload = function(e){

					crypto.subtle.digest(macKey.algorithm.hash, e.target.result).then(function(hash){

						buffer.set(new Uint8Array(hash), 8 + 32 * Math.floor(pos / chunkSize));
						_process_chunk(pos + chunkSize);

					});

				};

				reader.readAsArrayBuffer(file.slice(pos, Math.min(pos + chunkSize, file.size)));

			}else res(crypto.subtle.sign(macKey.algorithm, macKey, buffer).then(b2z));

		}

		_process_chunk(0);

	});

}

function initKeyring(keyMaterial){

	if(!(keyMaterial instanceof ArrayBuffer)) throw new Error(l[4]);
	return Keyring.create(keyMaterial);

}