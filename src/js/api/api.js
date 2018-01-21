'use strict';

var Api = function(url){

	this._version = '1.0';
	this._url = url;

};

Api.prototype.sessionUpdate = function(params){

	var post = {a:'su'};
	typeof params.newEmails === 'undefined' || (post['emails'] = params.newEmails);
	params.appInit && (post['app_init'] = 1);

	if(!U.sid && common.firstVisit){

		common.firstVisit = false;

		if(common.utm){

			post['utm'] = common.utm;
			delete(common.utm);

		}

		post['page'] = navState.page.join('/');
		post['ua'] = encodeURIComponent(navigator.userAgent);
		document.referrer && (post['ref'] = encodeURIComponent(document.referrer));

	}

	return this._apiPost(post, function(result){

		return(typeof result.s === 'string');

	});

};

Api.prototype.userId = function(login, page){

	return this._apiPost({a: 'uu', l: login, p: page}, function(result){

		return typeof result.id === 'string' ? (result.id.length === 36 ? {login: login, id: result.id} : {login: login, id: ''}) : false;

	}.bind(this));

};

Api.prototype.signUp = function(data){

	var post = {

		a: 'un',
		login: data.login,
		nick: b64EncodeUnicode(data.nick),
		folder: data.folder,
		key: b2x(data.key),
		prk_s: e2s(data.prk_s),
		prk_e: e2s(data.prk_e),
		puk_s: data.puk_s,
		puk_e: data.puk_e,
		visit_card: data.visitCard,
		password_hash: b2x(data.passwordHash),
		settings: data.settings

	};

	if(data.captcha && data.captcha.id){

		post.c = data.captcha.answer;
		post.s = data.captcha.id;

	}

	if(data.uuid){

		post.id = data.id;
		post.uuid = data.uuid;

	}

	data.fingerprint && (post.fingerprint = data.fingerprint);

	return this._apiPost(post, function(result){

		if(typeof result.e === 'string') throw new Error(result.e);

		return(

			typeof result.type === 'number' && //user type
			typeof result.time === 'number' && //server time
			typeof result.aliases === 'object' && //user aliases
			typeof result.rsa_uuid === 'string' //rsa pair uuid

		) ? result : false;

	}.bind(this));

};

Api.prototype.signIn = function(login, passwordHash, params, notificationInfo){

	var post = {

		a: 'ul',
		l: login,
		h: b2x(passwordHash),
		key: b2x(params.sessionSecretKey),

	};

	params.tfa && (post.tfa = params.tfa);

	if(params.captcha && params.captcha.id){

		post.c = params.captcha.answer;
		post.s = params.captcha.id;

	}

	if(notificationInfo && notificationInfo.deviceUUID && notificationInfo.deviceToken){

		post.d_uuid = notificationInfo.deviceUUID;
		post.d_token = notificationInfo.deviceToken;

	}

	return this._apiPost(post, function(result){

		if(typeof result.tfa === 'number') return result;

		return (

			typeof result !== 'object' ||
			typeof result.s !== 'string' || //new session id
			typeof result.t !== 'number' || //user type
			typeof result.aliases !== 'object' || //user aliases
			typeof result.settings !== 'string' //user settings

		) ? false : result;

	}.bind(this));

};

Api.prototype.captchaGet = function(page){

	return this._apiPost({ a:'cg', p:page }, function(result){

		return (

			typeof result.d !== 'string' ||
			(result.cs && !(typeof result.cs === 'string' && result.cs)) ||
			(result.l && !(typeof result.l === 'number' && result.l > 0))

		) ? false : result;

	}, {wiredToPage : true});

};

Api.prototype.captchaCheck = function(answer, id){

	return this._apiPost({

		a: 'cc',
		c: answer,
		s: id

	}, function(result){

		return typeof result.p === 'string' || result.e === 344111 ? result : false;

	}.bind(this), {wiredToPage : true});

};

Api.prototype.getFeedbackId = function(feedbackName, toAlias){

	return this._apiPost({a: 'feedback', 'name': u2a(feedbackName), 'alias': toAlias}, function(result){

		return typeof result.id === 'string' ? result : false;

	}.bind(this));

};

Api.prototype.sendFeedback = function(key, message){

	return this._apiPost({a: 'feedback', id: key, message: b2a(msgpack.pack(message))}, function(result){

		return result;

	}.bind(this));

};

Api.prototype.prepareFeedback = function(feedbackId){

	return this._apiPost({a: 'feedback', id: feedbackId}, function(result){

		return typeof result.rsa === 'string' && typeof result.n === 'string' && typeof result.u === 'string' && typeof result.key === 'string' ? result : false;

	}.bind(this));

};

Api.prototype.emailsGetByFolder = function(folders, messagesInBlock){

	return this._apiPost({ a: 'eg', folders: folders, mib: messagesInBlock}, function(result){

		return result.emails instanceof Object ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailsGetByChannel = function(channelId, exceptIds){

	var post = {

		a: 'ec',
		channel: channelId

	};

	exceptIds && (post['except'] = exceptIds);

	return this._apiPost(post, function(result){

		return result.emails instanceof Object && typeof result.time === 'number' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.invitesNew = function(data){

	return this._apiPost({a:'in', invites: data}, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.invitesGet = function(ids, rsaIds){

	rsaIds = rsaIds || [];
	ids instanceof Array || (ids = [ids]);
	if(!ids.length && !rsaIds.length) return Promise.resolve(0);
	var post = {a: 'ig', channels: ids};
	rsaIds.length && (post.rsa = rsaIds); //if we have direct RSA messages we need to get self RSA keys

	return this._apiPost(post, function(result){

		return !(result.invites instanceof Array) || result.invites.length && !(result['rsa_chain'] instanceof Array) ? false : result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.avatarsGet = function(users){

	return this._apiPost({a: 'ag', users: users}, function(result){

		return result.avatars instanceof Object ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.userInit = function(notificationInfo){

	var post = {a: 'ui'};

	if(notificationInfo && notificationInfo.deviceUUID && notificationInfo.deviceToken){

		post.d_uuid = notificationInfo.deviceUUID;
		post.d_token = notificationInfo.deviceToken;

	}

	return this._apiPost(post, function(result){

		return (

			typeof result.key_s !== 'object' || //new session id
			typeof result.key_e !== 'object' || //user type
			typeof result.settings !== 'string' || //user settings
			typeof result.aliases !== 'object' || //user aliases
			typeof result.key !== 'string' || //session key
			typeof result.type !== 'number' || //user type
			typeof result.paid_to !== 'number' || //user paid to
			typeof result.stats !== 'object' //user stats

		) ? false : result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.getSettings = function(){

	var post = {a: 'us'};

	return this._apiPost(post, function(result){

		return typeof result.settings === 'string' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.optionsSave = function(data){

	var post = {a: 'os'};
	data.aliases && (post.aliases = data.aliases);
	data.alias && (post.alias = data.alias);
	data.prk_s && (post.prk_s = e2s(data.prk_s));
	data.prk_e && (post.prk_e = e2s(data.prk_e));
	data.puk_s && (post.puk_s = data.puk_s);
	data.puk_e && (post.puk_e = data.puk_e);
	data.passwordHash && (post.password_hash = b2x(data.passwordHash));
	data.settings && (post.settings = data.settings);
	data.contacts && (post.contacts = data.contacts);
	data.visitCard && (post.visit_card = data.visitCard);
	data.rsaChain && (post.rsa_chain = data.rsaChain);
	data.key && (post.key = b2x(data.key));
	typeof data.avatar !== 'undefined' && (post.avatar = data.avatar);

	return this._apiPost(post, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.getPublicKeys = function(apiUsers){

	if(!apiUsers.length) return Promise.resolve([]);

	return this._apiPost({a:'uk', users: apiUsers}, function(result){

		return typeof result.users === 'object' ? result.users : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.filesGet = function(channelId, filesByMessage){

	var post = {a: 'fg'};

	if(channelId){

		post['channel'] = channelId;
		post['files'] = filesByMessage;

	}

	return this._apiPost(post, function(result){

		return (result.files instanceof Object || result.files_direct instanceof Object) && typeof result.time === 'number' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.filesDelete = function(ids){

	return ids.length ? this._apiPost({a: 'fd', files: ids}, function(result){

		return result;

	}, {wiredToSession : true}) : Promise.resolve(0);

};

Api.prototype.filesNew = function(ids, type){

	return this._apiPost({

		a: 'fn',
		type: type,
		files: ids

	}, function(result){

		return typeof result.files === 'object' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.filesUploaded = function(channelId, files, type){

	return this._apiPost({

		a: 'fu',
		channel: channelId,
		type: type,
		files: files

	}, function(result){

		return typeof result.db_sizes === 'object' ? result.db_sizes : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.aliasNew = function(aliasData){

	return this._apiPost({a: 'an', alias_data: aliasData}, function(result){

		return typeof result.aliases === 'object' && typeof result.type === 'number' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailNew = function(data){

	var post = {a: 'en'};
	for(var i in data) post[i] = data[i];

	return this._apiPost(post, function(result){

		return typeof result.message === 'object' && typeof result.message.i === 'string' && typeof result.message.c === 'string' && typeof result.message.t === 'number' && typeof result.message.s === 'number' && typeof result.message.l === 'number' ? result.message : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.channelRead = function(channelId, youngerThen){

	return this._apiPost({

		a: 'xr',
		channel: channelId,
		younger: youngerThen,

	}, function(result){

		return result.data instanceof Array && typeof result.time === 'number' ? result : false;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.channelWrite = function(channelId, data){

	this._apiPost({

		a:'xw',
		channel: channelId,
		data: b2a(msgpack.pack(data))

	}, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailsMove = function(moveObject, trash){

	var post = {a: 'em', data: moveObject};
	if(trash) post.trash = 1;

	return this._apiPost(post, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailsDelete = function(data, files){

	return this._apiPost({

		a: 'ed',
		data: data,
		files: files

	}, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailsStarred = function(files){

	return this._apiPost({

		a: 'es',
		data: files

	}, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailsRead = function(files){

	return this._apiPost({

		a: 'er',
		data: files

	}, function(result){

		return result;

	}.bind(this), {wiredToSession : true});

};

Api.prototype.emailLinkDecode = function(encoded){

	return this._apiPost({a: 'ud', id: encoded}, function(result){

		return typeof result.address === 'string' && typeof result.type === 'number' ? result : -1;

	}.bind(this), {wiredToPage : true});

};

Api.prototype.new2xFactor = function(params){

	var post = clone(params);
	post.a = 'x2';

	return this._apiPost(post, function(result){

		if(params.disable) return true;
		if(params.email) return typeof result.secret === 'string' && typeof result.qr === 'string' ? result : false;
		if(params.secret) return typeof result.correct === 'number' ? result : false;

	}.bind(this), {wiredToPage : true});

};


Api.prototype._apiPost = function(post, checkFunc, params){

	params = params || {};
	var sidChanged = false;
	typeof params.deep === 'undefined' && (params.deep = 0);
	typeof post === 'object' && (post = '[' + JSON.stringify(post) + ']');

	var _retry = function(immidiatly){

		if(sidChanged && params.wiredToSession) return 'cancelled';
		immidiatly || (params.startPaused = true);
		params.deep++;
		return this._apiPost(post, checkFunc, params);

	}.bind(this);

	return N.request(this._url + U.sid, post, params).then(function(result){

		if(result === false) return 'cancelled'; //API request cancelled

		if(result === null){ //network failed

			N.haveActiveConnections() || DOM.offline();
			return _retry();

		}

		try{ //API request should return JSON

			result = JSON.parse(result);
			if(typeof result !== 'object' || typeof result.e === 'undefined') throw new Error(l[349]);

		}catch(e){

			DOM.offline();
			return _retry();

		}

		typeof result.s === 'string' && (sidChanged = U.sessionSet(result.s, result.id)); //new sid
		U.access(1) && typeof result.new_emails === 'object' && E.processIncoming({emails: result.new_emails}); //new messages

		if(typeof result.stats === 'object'){ //stats

			U.setDiskUsage(result.stats.du);
			F.setStats(result.stats.folders, post.a !== 'ui');
			FS.setStats(result.stats.files);

		}

		(typeof result.type === 'number') && (typeof result.paid_to === 'number') && U.setCredentials({ type: result.type, paidTo: result.paid_to });

		if(result.e !== 0 && typeof result.e === 'number'){ //API returns an error

			switch(result.e){

			case 100000: //unknown error
			case 111000: //API down
			case 888888: //empty request
			case 777777: //bad API command
			case 222333: //request processing failed
			case 400300: //bad request params
			case 333000: //wrong request params
			case 222000: //file not found
			case 555000: //not all objects found
			case 776655: //processing error

				I.e('Network [' + result.e + ']', new Error(l[90].ucFirst()), true);
				DOM.error(I.template('500'));
				return 'cancelled';

			case 999999: //bad session id

				if(!U.sid) return 'cancelled';
				params.deep ? DOM.offline() : U.logout(U.access(1) ? 'signin' : null, typeof result.s !== 'string');
				return _retry(!params.deep);
			
			case 300100: //denied

				U.access(1) && U.logout('signin', true);
				return 'cancelled';
			
			case 111333: //data too large
			case 333111: //message too large
			case 111111: //partial success
			case 543210: //no disc space
			case 123456: //bad password
			case 344111: //captcha error
			case 100200: //user exists
			case 100300: //bad nickname
			case 100400: //bad login
			case 444000: //nothing to do
			case 595959: //maximum

				throw new Error(result.e);
			
			default:

				return _retry();

			}

		}
		
		var precessedResult;

		if((precessedResult = checkFunc(result)) !== false){

			DOM.offline(true);
			return precessedResult;

		}else{

			DOM.offline();
			return _retry(); //never get back without correct data

		}
		
	}.bind(this));

};