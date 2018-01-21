'use strict';

function cInterface(){

	var self = this;
	self.deployed = false;
	self.panelLeft = null;
	self.panelRight = null;
	self.swiping = null;
	self.fis = 250;
	self._timeoutTitle = 0;
	self._waiters = [];
	self._sentErrors = [];
	self._bodyListeners = [];
	self._notFinishedObjects = [];
	self._skipDeploy = false;
	self.touchIdEnabled = false;
	self.reconnectTimeout = 0;
	self.reconnectInterval = 10;
	self.reconnectAfter = self.reconnectInterval;
	self.swipeOpened = {};
	self.container = document.getElementById('content-holder');
	self.topMenu = null;
	self.chooseFile = null;
	self.chooseFiles = null;
	self.connectionStates = {coeff: 1};
	self.filter = [];

	self._init = function(reload){

		if(app && app.locked) return;

		if(!U.sid && !self.offline){

			self.container.customClear();
			DOM.loader(l[7], 0);
			app && window.plugins.nativepagetransitions.executePendingTransition();

		}

		return self.reset().then(function(){

			return U.heartbeat(reload || !U.sid);

		}).then(function(result){

			if(!result) return;
			N.stopWiredToPage();
			DOM.cleaning();

			switch(navState.page[0]){

			case '':
			case 'contact':

				return DOM.index();

			case 'signin':

				return DOM.signin();

			case 'signup':

				return DOM.signup();

			case 'inbox':

				return DOM.inbox();

			case 'compose':

				return DOM.compose();

			case 'message':

				return DOM.message();

			case 'contacts':

				return DOM.contacts();

			case 'settings':

				return DOM.settings();

			case 'storage':

				return DOM.filestorage();

			case 'plans':

				return DOM.plans();

			case 'read':

				return DOM.read();
				
			case 'mail':

				return DOM.mail();
				
			case 'ico':

				return DOM.ico();
				
			default:

				return I.loadFile('/html/' + navState.page[0] + '_' + U.lang() + '.html').then(function(result){

					if(result === 'cancelled') return;
					return DOM.page(result);

				}).catch(function(){

					return DOM.error(I.template('404'));

				});

			}

		}).catch(function(e){

			self.e('cInterface.init', e);

		});

	};

	self.environment = function(){

		var promises = [];

		self.styles = { //prepare style blobs

			mobile: '/css/mobile.css',
			croppie: '/css/croppie.css',

		};

		if(!app){

			self.styles['desktop'] = '/css/desktop.css';
			self.styles['landing'] = '/css/landing.css';
			self.styles['ico'] = '/css/ico.css';

		}

		for(var i in self.styles) promises.push(Promise.all([i, self.loadFile(self.styles[i])]));

		if(app){

			promises.push(Promise.all([

				I.checkTouchId(), //check touchId enabled
				P.init() //push notifications init

			]));

		}

		return Promise.all(promises).then(function(results){

			if(app){ //load styles and style resources to blobs

				results.pop();
				var regexp = /url\(([^)]+)\)/g, m, pos, resources = {};
				promises = [];

				for(i = 0; i < results.length; i++){

					do{

						if((m = regexp.exec(results[i][1]))){

							resources[m[1]] = {anchor: ''};

							if((pos = m[1].indexOf('?')) > 0 || (pos = m[1].indexOf('#')) > 0){

								resources[m[1]].url = m[1].substr(0, pos);
								resources[m[1]].anchor = m[1].substr(pos);

							}else resources[m[1]].url = m[1];

						}

					}while(m);

				}

				for(i in resources) promises.push(Promise.all([i, self.loadFile(resources[i].url, true)]));

				return Promise.all(promises).then(function(objects){

					for(i = 0; i < objects.length; i++) resources[objects[i][0]].blobURL = URL.createObjectURL(new Blob([objects[i][1]], {type: Z.fileMimeType(objects[i][0])}));

					for(i = 0; i < results.length; i++){

						results[i][1] = results[i][1].replace(regexp, function(match, filePath){

							return match.replace(filePath, resources[filePath].blobURL + resources[filePath].anchor);

						});

					}

					return results;

				});
					
			}else return results;
			
		}).then(function(results){

			for(i = 0; i < results.length; i++) self.styles[results[i][0]] = URL.createObjectURL(new Blob([results[i][1]], {type: 'text/css'}));
			return true;

		}).catch(function(e){

			self.e('cInterface.environment', e, true);

		});

	};

	self.loadFile = function(filePath, asArrayBuffer){

		asArrayBuffer = asArrayBuffer || false;

		if(app){

			return (new CordovaFS()).read(filePath, cordova.file.applicationDirectory + 'www').then(function(result){

				return asArrayBuffer ? result : b2s(result);

			});

		}else return N.request(filePath, null, {maxTries: 1});

	};

	self.appInit = function(){

		cordova.plugins.backgroundMode.enable();
		document.removeEventListener('resume', app.onDevicePaused);
		document.removeEventListener('pause', self.appPause);
		document.removeEventListener('resume', self.appResume);
		document.addEventListener('pause', self.appPause, false);
		document.addEventListener('resume', self.appResume, false);
		self.initURL = window.location.href;
		self.fileSelect = new FileSelect();

		self.keyChainNamespace = new cordova.plugins.SecureStorage(function(){}, function(){

			self.keyChainNamespace = null;

		}, config.domain);

		P = new Notifications();
		self.connectionStates[Connection.UNKNOWN] = {name: 'Unknown connection', coeff: 10};
		self.connectionStates[Connection.ETHERNET] = {name: 'Ethernet connection', coeff: 1};
		self.connectionStates[Connection.WIFI] = {name: 'WiFi connection', coeff: 1};
		self.connectionStates[Connection.CELL_2G] = {name: '2G connection', coeff: 10};
		self.connectionStates[Connection.CELL_3G] = {name: '3G connection', coeff: 5};
		self.connectionStates[Connection.CELL_4G] = {name: '4G connection', coeff: 1};
		self.connectionStates[Connection.CELL] = {name: 'Cell generic connection', coeff: 10};
		self.connectionStates[Connection.NONE] = {name: 'No network connection', coeff: 0};
		self.connectionStates.coeff = self.connectionStates[navigator.connection.type].coeff;

		document.addEventListener('offline', function(){

			window.plugins.toast.showShortTop(l[231].ucFirst());

		}, false);

		document.addEventListener('online', function(){

			window.plugins.toast.showShortTop(self.connectionStates[navigator.connection.type].name.ucFirst());
			self.connectionStates.coeff = self.connectionStates[navigator.connection.type].coeff;

		}, false);

	};

	self.clearReconnectTimeout = function(resetToZero){

		I.reconnectAfter = resetToZero ? 0 : I.reconnectInterval;
		if(!self.reconnectTimeout) return false;
		clearTimeout(self.reconnectTimeout);
		delete(self.reconnectTimeout);

	};

	self.appPause = function(){

		if(app.paused) return;
		app.paused = true;
		self.inAppBrowser && self.inAppBrowser.close();
		window.plugins.spinnerDialog.hide();
		self.offline && I.clearReconnectTimeout(true);
		app.locked || U.setDeviceVars({lastAction: Date.now() / 1000 | 0});
		N.haveActiveConnections() || cordova.plugins.backgroundMode.disable();

	};

	self.appResume = function(){

		if(!app.paused) return;
		app.paused = false;
		cordova.plugins.backgroundMode.enable();
		var uri = app.deepLink ? app.deepLink : window.location.pathname;
		app.deepLink = '';

		if(U.access(1)){

			var now = Date.now() / 1000 | 0;
			app.locked = true;

			switch(U.pcm()){

			case 1: //immidiatly

				break;

			case 2: //after 15 min

				now - U.lastAction() < 15 * 60 && (app.locked = false);
				break;

			case 3: //after 30 min

				now - U.lastAction() < 30 * 60 && (app.locked = false);
				break;

			case 4: //after 1 hour

				now - U.lastAction() < 60 * 60 && (app.locked = false);
				break;

			case 5: //after 2 hours

				now - U.lastAction() < 120 * 60 && (app.locked = false);
				break;

			case 6: //after 3 hours

				now - U.lastAction() < 180 * 60 && (app.locked = false);
				break;

			case 7: //after 6 hours

				now - U.lastAction() < 360 * 60 && (app.locked = false);
				break;

			default: //no passcode required

				app.locked = false;

			}

			var _reloadInterface = function(){

				self.offline ? DOM.offline() : N.startQueue(true);
				U.heartbeat(true, true);
				E.decryptNext();

			};

			if(!app.locked) return _reloadInterface();

			(new Passcode(self.container)).check(U.passCode(), false, U.touchId()).then(function(result){

				app.locked = false;
				if(!result) return U.logout('signin', true);
				if(self.offline) return DOM.offline();
				N.startQueue(true);
				U.heartbeat(true, true);
				E.decryptNext();
				config.initialized && self.changePage(uri, {effect: 'flipup'});

			});

		}else{

			self.offline ? DOM.offline() : N.startQueue(true);

		}

	};

	self._injectStyles = function(){

		var _clearOtherStyles = function(stylesIds){

			I.container.customClear();
			for(var i in stylesIds) document.head.getElementById(stylesIds[i]) && self.removeStyle(stylesIds[i]);

		};

		if(client.desktop()){

			if(document.head.getElementById('desktop')) return Promise.resolve(true);
			_clearOtherStyles(['landing', 'ico']);
			self.isDesktop = true;
			return self.addStyle('desktop', self.styles['desktop']);

		}else{

			if(document.head.getElementById('mobile')) return Promise.resolve(true);
			_clearOtherStyles(['landing', 'ico']);
			self.isMobile = true;
			return self.addStyle('mobile', self.styles['mobile']);

		}

	};

	self.checkTouchId = function(){

		return new Promise(function(res){

			if(!app) return res(false);

			window.plugins.touchid.isAvailable(function(){ //touchId is available

				self.touchIdEnabled = true;
				res(true);

			}.bind(this), function(){ //touchId is unavailable

				self.touchIdEnabled = false;
				res(false);

			});

		});

	};

	self.addStyle = function(id, src){

		return new Promise(function(res){

			createElement('link', {type: 'text/css', 'rel': 'stylesheet', 'href': src, 'id': id}, 'head', function(){

				res();

			});

		});

	};

	self.removeStyle = function(id){

		var elem = document.head.getElementById(id);
		elem && elem.remove();
		return true;

	};

	self.closeAllAnimated = function(except){

		for(var i in self.swipeOpened){

			if(except && except === i) continue;
			self.swipeOpened[i].close();

		}

		self.topMenu && self.topMenu.close();
		self.dropdownOpened && I.dropdownOpened !== except && self.dropdownOpened.action();

	};

	self.addNotFinished = function(object){

		for(var i in self._notFinishedObjects) if(self._notFinishedObjects[i] === object) return;
		self._notFinishedObjects.push(object);

	};

	self.removeNotFinished = function(){

		self._notFinishedObjects = [];
		/*
		for(var i in self._notFinishedObjects) if(self._notFinishedObjects[i] === object){

			self._notFinishedObjects.splice(i, 1);
			break;

		}
		*/

	};

	self.canAct = function(){

		return !self._notFinishedObjects.length;

	};

	self.closeActions = function(exceptId){

		self.container.onclick = function(e){

			if(app){ //return to main screen

				if(self.panelLeft && self.panelLeft.opened){

					if(e.clientX > window.screen.availWidth - 50) self.panelLeft.close();

				}else if(self.panelRight && self.panelRight.opened){

					if(e.clientX < 50) self.panelRight.close();

				}

			}

			self.closeAllAnimated(exceptId);

		};

	};

	self.heightFilled = function(heightUsed){

		if(!self.dimensions) return 1;
		var avail = self.dimensions.totalHeight;

		for(var i in self.dimensions){

			if(i === 'totalHeight') continue;
			avail -= self.dimensions[i];

		}

		return avail - heightUsed;

	};

	self.addBodyListener = function(type, cb){

		self._bodyListeners.push([type, cb]);
		document.body.addEventListener(type, cb);

	};

	self._clearBodyListeners = function(){

		for(var i in self._bodyListeners){

			document.body.removeEventListener(self._bodyListeners[i][0], self._bodyListeners[i][1]);

		}

		self._bodyListeners = [];

	};

	self.reset = function(stopFileStreams){

		self._clearBodyListeners();
		DOM.loader();
		self.closeAllAnimated();
		FS.free(stopFileStreams);
		E.free(stopFileStreams);
		D.h();
		self.closeActions();
		enableInputs();
		return self._injectStyles();

	};

	self.done = function(){

		typeof self.waitFor === 'function' ? self.waitFor() : self.waitFor = null;

	};

	self.domRememberTopScroll = function(val){

		if(typeof val === 'undefined'){

			var elem = I.isDesktop ? document.body : self.container.getElementById('contentBody');
			if(!elem) return;
			val = elem.scrollTop;

		}

		if(navState.scrollTop === val) return;
		navState.scrollTop = val;
		self.historyChange(navState);

	};

	self.changePage = function(newPage, params){

		params = params || {};
		var pos, newState = {};

		if(app){

			pos = newPage.indexOf('/www');
			(pos >= 0) && (newPage = window.location.pathname.substr(pos + 4));
			(newPage === '/index.html') && (newPage = '/');

		}

		newPage = newPage || '';
		pos = newPage.indexOf('#');

		if(pos >= 0){

			newState.anchor = newPage.substr(pos + 1);
			newPage = newPage.substr(0, pos);

		}

		params.effect = (params.effect === 'none' ? false : (params.effect || 'slide'));
		newPage[newPage.length - 1] !== '/' && (newPage += '/');
		newPage[0] === '/' && (newPage = newPage.substr(1, newPage.length));
		!I.isDesktop && newPage === 'signin/' && (newPage = '');
		newState.page = newPage.split('/');
		newState.page.length > 1 && /^[0-9]*$/.test(newState.page[1]) && (newState.page[1] = parseInt(newState.page[1]));
		!newState.page[newState.page.length - 1] && newState.page.pop();
		newState.page.length || (newState.page[0] = '');
		newState.search = [];
		newState.numPage = 0;
		newState.sort = -1;

		var _closeMenu = function(showLoader){

			return new Promise(function(res){

				if(!(self.panelLeft && self.panelRight) || !(self.panelLeft.opened || self.panelRight.opened)){

					res(false);

				}else{

					(self.panelLeft.opened ? self.panelLeft : self.panelRight).close(showLoader).then(function(){

						res(true);

					});

				}

			});

		};

		return new Promise(function(res){

			var isNewPage = params.reload || false;

			if(history.state && myHistory.length && history.state.pos < myHistory.length){

				newState.sort = myHistory[history.state.pos].sort;
				newState.search = myHistory[history.state.pos].search.map(function(x){return x;});
				newState.numPage = myHistory[history.state.pos].numPage;
				myHistory[history.state.pos].anchor && (newState.anchor = myHistory[history.state.pos].anchor);
				myHistory[history.state.pos].page.equals(newState.page) || (isNewPage = true);

			}else history.replaceState({pos: 0}, '', self._fullURI(newState.page));

			_closeMenu(true).then(function(menuWasClosed){

				self._canChangePage(newState.page).then(function(allow){

					if(!allow){

						DOM.loader();
						return res();

					}

					window.location.pathname === self._fullURI(newState.page) && (isNewPage = false);

					if(isNewPage){

						newState.sort = -1;
						self._historyCut(history.state.pos + 1);
						self._historyAdd(newState);
						history.pushState({pos: myHistory.length - 1}, '', self._fullURI(newState.page));

					}else self.historyChange(newState);

					var _finishTransition = function(){

						self._init(params.reload || false);
						setTimeout(window.plugins.nativepagetransitions.executePendingTransition, 0);

					};

					self.waitersAdd(res);
					navState = newState;

					if(app && (['flipup', 'flip'].indexOf(params.effect) >= 0 || !menuWasClosed) && params.effect){

						params.effect === 'flipup' ? window.plugins.nativepagetransitions.flip({

							direction : 'up',
							duration: common.transitionSpeed,
							iosdelay :  -1,
							androiddelay :  -1,

						}, _finishTransition) : params.effect === 'flip' ? window.plugins.nativepagetransitions.flip({

							direction : 'left',
							duration: common.transitionSpeed,
							iosdelay :  -1,
							androiddelay :  -1,

						}, _finishTransition) : params.effect === 'fade' ? window.plugins.nativepagetransitions.fade({

							duration: common.transitionSpeed,
							iosdelay :  -1,
							androiddelay :  -1,

						}, _finishTransition) : window.plugins.nativepagetransitions.slide({

							direction : 'left',
							duration: common.transitionSpeed,
							slowdownfactor: -1,
							iosdelay :  -1,
							androiddelay :  -1,

						}, _finishTransition);

					}else self._init(params.reload || false);

				});

			});

		});

	};

	window.addEventListener('popstate', function(e){

		if(!e.state) return;

		self._canChangePage(myHistory[e.state.pos].page).then(function(allow){

			if(!allow) return;
			navState.page = myHistory[e.state.pos].page.map(function(x){return x;});
			navState.search = myHistory[e.state.pos].search.map(function(x){return x;});
			navState.numPage = myHistory[e.state.pos].numPage;
			navState.sort = myHistory[e.state.pos].sort;
			navState.scrollTop = myHistory[e.state.pos].scrollTop;
			var realURI = self._fullURI(navState.page);
			if(window.location.pathname !== realURI) history.replaceState({pos: e.state.pos}, '', realURI);

			if(self._skipDeploy){

				self._skipDeploy = false;
				self.waitersDone();
				return;

			}

			if(self.panelLeft && self.panelRight && (self.panelLeft.opened || self.panelRight.opened)){

				self._init();
				return (self.panelLeft.opened ? self.panelLeft : self.panelRight).close();

			}

			if(app){

				window.plugins.nativepagetransitions.slide({

					direction : 'right',
					duration: common.transitionSpeed,
					slowdownfactor: -1,
					iosdelay :  -1,
					androiddelay :  -1,

				}, function(){

					self._init();
					setTimeout(window.plugins.nativepagetransitions.executePendingTransition, 0);

				});

			}else self._init();

		});

	}, false);

	self._canChangePage = function(newPage){

		return W.lost(newPage);
		
	};

	self._historyAdd = function(state){

		myHistory.push(clone(state));
		self.store();
		
	};

	self.historyChange = function(state){

		if(!history.state) return false;
		var newState = clone(state);
		history.replaceState({pos: history.state.pos}, '', self._fullURI(newState.page));
		myHistory[history.state.pos] = newState;
		self.store();
		
	};

	self._historyCut = function(toLength){

		if(toLength >= myHistory.length) return;
		myHistory.splice(toLength);
		
	};

	self.historyUpdate = function(oldState, newState){

		var i, j, found;

		for(i in myHistory){

			found = true;

			if(myHistory[i].page.length !== oldState.page.length) continue;

			for(j = 0; j < myHistory[i].page.length; j++){

				if(myHistory[i].page[j] !== oldState.page[j]){

					found = false;
					break;

				}

			}

			if(found) myHistory[i] = clone(newState);

		}

		self.store();
		
	};

	self.pageBackward = function(lookFor, options){

		if(!history.state.pos){

			self.changePage(lookFor);
			return;

		}

		options = options || {};
		var goToPos = 0, found = false;

		if(typeof lookFor !== 'undefined'){

			for(var i = history.state.pos; i >= 0; i--){

				if(myHistory[i].page[0] !== lookFor || (options.noSubs && myHistory[i].page[1])) continue;
				found = true;
				goToPos = i;
				options.oneMore && (goToPos = i > 0 ? i - 1 : 0);
				break;

			}

		}else goToPos = history.state.pos ? history.state.pos - 1 : 0;

		if(lookFor && !found || history.length < Math.abs(goToPos - history.state.pos)){

			if(options.oneMore) return Promise.resolve(true);
			lookFor === 'inbox' && (lookFor += '/0');
			return self.changePage(lookFor);

		}else if(goToPos === history.state.pos){

			if(!(self.panelLeft && self.panelRight) || !(self.panelLeft.opened || self.panelRight.opened)) return Promise.resolve(true);
			return (self.panelLeft.opened ? self.panelLeft : self.panelRight).close();

		}

		return new Promise(function(res){

			self.waitersAdd(res);
			options.skipDeploy && (self._skipDeploy = true);
			history.go(goToPos - history.state.pos);

		});
		
	};

	self.pageForward = function(lookFor, options){

		options = options || {};
		var goToPos = myHistory.length - 1, found = false;

		if(lookFor){

			for(var i = history.state.pos; i < myHistory.length; i++){

				if(myHistory[i].page[0] !== lookFor || (options.noSubs && myHistory[i].page[1])) continue;

				found = true;
				goToPos = i;
				options.oneMore && (goToPos = i < myHistory.length - 1 ? i + 1 : myHistory.length);
				break;

			}

		}else goToPos = history.state.pos < myHistory.length - 1 ? history.state.pos + 1 : myHistory.length - 1;

		if(lookFor && !found){

			if(options.oneMore) return Promise.resolve(true);
			lookFor === 'inbox' && (lookFor += '/0');
			return self.changePage(lookFor);

		}else if(goToPos === history.state.pos) return Promise.resolve(true);

		return new Promise(function(res){

			self.waitersAdd(res);
			options.skipDeploy && (self._skipDeploy = true);
			window.history.go(goToPos - history.state.pos);

		});
		
	};

	self._fullURI = function(page){

		var newURI = '';
		for(var i = 0; i < page.length; i++) if(page[i] !== ''){ newURI += page[i] + '/'; } else break;
		return app ? config.appPath + newURI : '/' + newURI;

	};

	self.waitersAdd = function(waiterFunc){

		self._waiters.push(waiterFunc);
		
	};

	self.waitersDone = function(){

		for(var i = self._waiters.length - 1; i >= 0; i--) self._waiters[i]();
		self._waiters = [];
		
	};

	self.initTemplates = function(templates){

		var arr = templates.split(/<!--\[(.+)\]-->/g);
		arr.shift();
		TPL = {};
		for(var i = 0; i < arr.length; i +=2) TPL[arr[i]] = self.translate(arr[i + 1].trim()).toDOM();
		self._months = [l[201],l[202],l[203],l[204],l[205],l[206],l[207],l[208],l[209],l[210],l[211],l[212]];
		self._monthsFull = [l[250],l[251],l[252],l[253],l[254],l[255],l[256],l[257],l[258],l[259],l[260],l[261]];
		self._days = [l[213],l[214],l[215],l[216],l[217],l[218],l[219]];

	};

	self.template = function(name){

		try{

			var tplName = (self.isDesktop ? '' : 'm ') + name;
			return TPL[TPL[tplName] ? tplName : name].cloneNode(true);

		}catch(e){

			alert('template \'' + name + '\' not found');

		}

	};

	self.pageTitle = function(title, blinkTitle){

		var unread = F.unread();
		if(unread && !blinkTitle) return self.pageTitle(l[370].ucFirst(), '(' + unread + ') ' + config.domain.ucFirst());
		document.title = title;
		var blinked = false;
		clearTimeout(self._timeoutTitle);

		if(blinkTitle){

			var _change = function(){

				self._timeoutTitle = setTimeout(function(){

					blinked = !blinked;
					document.title = blinked ? blinkTitle : title;
					_change();

				}, 1000);

			};

			_change();

		}

	};

	self.translate = function(html){

		html = html.replace(/\[>(\D)?(\d+)<\]/g, function(a, b, c){

			var r = l[parseInt(c)];

			if(b){

				switch(b){

				case 'U':

					r = r.toUpperCase();
					break;

				case 'L':

					r = r.toLowerCase();
					break;

				case 'F':

					r = r.ucFirst();
					break;

				case 'A':

					r = r.ucAll();
					break;

				}

			}

			return r;

		});

		html = html.replace(/\[>UDOMAIN<\]/g, config.domain.ucFirst());
		html = html.replace(/\[>DOMAIN<\]/g, config.domain);
		html = html.replace(/\[>YEAR<\]/g, new Date().getFullYear());
		return html;

	};

	self.switchPaging = function(numPage){

		navState.numPage = numPage;
		self.historyChange(navState);

	};

	self.setSort = function(sortBy, set){

		navState.sort = set ? sortBy : (navState.sort === sortBy) ? -sortBy : sortBy;
		self.switchPaging(0);

	};

	self.fileInput = function(multiple){

		multiple = multiple || false;
		var name = 'chooseFile' + (multiple ? 's' : '');
		if(self[name]) return;
		self[name] = document.createElement('input');
		self[name].setAttribute('type', 'file');
		multiple && self[name].setAttribute('multiple', true);
		self[name].className = 'hide';
		document.body.appendChild(self[name]);

	};

	self.dateFormat = function(ts, type){

		type = type || 0;

		var r = '', now = new Date(),
			time = ts ? new Date(ts * 1000) : now,
			month = time.getMonth(),
			year = time.getFullYear(),
			date = time.getDate(),
			hour = time.getHours(),
			min = time.getMinutes(),
			sec = time.getSeconds();

		hour < 10 && (hour = '0' + hour);
		min < 10 && (min = '0' + min);
		sec < 10 && (sec = '0' + sec);

		if(!type){

			date < 10 && (date = '0' + date);
			++month < 10 && (month = '0' + month);
			r = date + '/' + month + '/' + year.toString().substr(2, 2) + ' ' + hour + ':' + min + ':' + sec;

		}else if(type === 1){

			date < 10 && (date = '0' + date);
			month = self._months[month];
			r = date + '&nbsp;' + month + '&nbsp;' + year + '&nbsp;' + hour + ':' + min + ':' + sec;

		}else if(type === 2){

			date < 10 && (date = '0' + date);
			var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf();
			month = self._months[month];

			if(time.valueOf() < today - 86400000){

				r = month.ucFirst() + (month.lenfth > 3 ? '.' : ' ') + date;

			}else if(time.valueOf() < today){

				r = l[198];

			}else{

				r = hour + ':' + min;

			}

		}else if([3, 7].indexOf(type) >= 0){

			var diff = timeDiff(now, time);
			var remainingTime = Math.round((time - now) / 1000);
			hour = Math.floor(remainingTime / 3600);

			if(now >= time){

				r = l[237];

			}else if(hour > 24){

				if(diff.years > 0) r = diff.years + '&nbsp;' + self.countableWord(diff.years, [l[469], l[470], l[471], l[472]]);
				if(diff.months > 0 && ((type === 3 && !r) || type === 7)) r += (r ? ', ' : '') + diff.months + '&nbsp;' + self.countableWord(diff.months, [l[473], l[474], l[475], l[476]]);
				if(diff.days > 0 && ((type === 3 && !r) || type === 7)) r += (r ? ', ' : '') + diff.days + '&nbsp;' + self.countableWord(diff.days, [l[220], l[221], l[222], l[223]]);

			}else{

				min = Math.floor((remainingTime - hour * 3600) / 60);
				sec = remainingTime % 60;
				hour < 10 && (hour = '0' + hour);
				min < 10 && (min = '0' + min);
				sec < 10 && (sec = '0' + sec);
				r = hour + ':' + min + ':' + sec;

			}

		}else if(type === 4){

			var monthFull = self._monthsFull[time.getMonth()].ucFirst();
			r = date + '&nbsp;' + monthFull + '&nbsp;' + year + ',&nbsp;' + '&nbsp;' + hour + ':' + min + ':' + sec;

		}else if(type === 5){

			date < 10 && (date = '0' + date);
			++month < 10 && (month = '0' + month);
			r = date + '.' + month + '.' + year + '&nbsp;' + hour + ':' + min + ':' + sec;

		}else if(type === 6){

			r = date + ' ' + self._months[month].ucFirst();

		}else if(type === 8){

			date < 10 && (date = '0' + date);
			++month < 10 && (month = '0' + month);
			r = date + '.' + month + '.' + year;

		}else if(type === 9){

			r = date + ' ' + self._months[month].ucFirst() + ' ' + year;

		}else if(type === 10){

			date < 10 && (date = '0' + date);
			++month < 10 && (month = '0' + month);
			r = year + '' + month + date + hour + min + sec;

		}

		return r;

	};

	self.countableWord = function(d, words){

		var o = d % 10;

		if(d === 1){

			return words[0];

		}else if([11, 12, 13, 14].indexOf(d) >= 0){

			return words[2];

		}else if(o === 1){

			return words[3];

		}else if([1, 2, 3, 4].indexOf(o) >= 0){

			return words[1];

		}else if(o > 1 && o < 5){

			return words[3];

		}else{

			return words[2];

		}

	};

	self.onWindowResize = function(){

		setTimeout(function(){

			DOM.adaptiveHeader();
			self.alphabet && !(document.activeElement && document.activeElement instanceof HTMLInputElement) && self.alphabet.scale();

		}, 0);

	};

	self.store = function(){

		if(app) return Promise.resolve(true);
		return self.lsWrite('interface', {history: myHistory}, true);

	};

	self.restore = function(){

		if(app) return Promise.resolve(true);

		return I.lsRead('interface', true).then(function(result){

			if(!result || !(result instanceof Object) || !(result.history instanceof Array)) return false;
			myHistory = result.history;
			return true;

		});

	};

	self.copyTextToClipboard = function(text, message){

		if(app){

			cordova.plugins.clipboard.copy(text);
			window.plugins.toast.showShortTop(message || l[503].ucFirst());
			return;

		}

		document.activeElement && document.activeElement.blur();
		var textArea = document.createElement('textarea');
		textArea.value = text;
		document.body.appendChild(textArea);
		textArea.select();

		try{

			document.execCommand('copy');

		}catch(e){

			alert('Unable to copy');

		}

		setTimeout(function(){

			textArea.blur();
			document.body.removeChild(textArea);

		}, 0);

	};

	self.search = function(keywords){

		keywords = keywords || [];
		navState.search = keywords;
		self.historyChange(navState);

	};

	self.inInbox = function(){

		return navState.page[0] === 'inbox';

	};

	self.inMessageView = function(){

		return navState.page[0] === 'message';

	};

	self.inSearch = function(){

		return self.inInbox() && navState.page[1] === 'search';

	};

	self.inStarred = function(){

		return self.inInbox() && navState.page[1] === 4;

	};

	self.inMessages = function(){

		return self.inInbox() || self.inMessageView();

	};

	self.lsWrite = function(name, data, permanent){

		return new Promise(function(res){

			data = b2a(msgpack.pack(data));

			if(I.keyChainNamespace){ //app

				return I.keyChainNamespace.set(function(){

					res(true);

				}, function(){

					res(false);

				}, name, data);

			}

			try{ //browser

				if(!common.useLocalStorage) return res(null);
				(permanent ? window.localStorage : window.sessionStorage).setItem(name, data);
				res(true);

			}catch(e){

				common.useLocalStorage = false;
				res(false);

			}

		});

	};

	self.lsRead = function(name, permanent){

		return new Promise(function(res){

			if(I.keyChainNamespace){ //app

				return I.keyChainNamespace.get(function(result){

					res(msgpack.unpack(a2b(result)));

				}, function(){

					res(null);

				}, name);

			}

			try{

				if(!common.useLocalStorage) return res(null);
				var result = (permanent ? window.localStorage : window.sessionStorage).getItem(name);
				res(result ? msgpack.unpack(a2b(result)) : null);

			}catch(e){

				common.useLocalStorage = false;
				res(null);

			}

		});

	};

	self.lsClear = function(){

		return new Promise(function(res){

			return Promise.all([

				self.lsDelete('avatars', true),
				self.lsDelete('channels', true),
				self.lsDelete('keysSecured', true),
				self.lsDelete('user', true),
				self.lsDelete('session', true),

			]).then(res);

		});

	};

	self.lsDelete = function(name, permanent){

		return new Promise(function(res){

			if(I.keyChainNamespace){ //app

				return I.keyChainNamespace.remove(function(){

					res(true);

				}, function(){

					res(false);

				}, name);

			}

			try{

				if(!common.useLocalStorage) return res(null);
				sessionStorage.removeItem(name);
				permanent && localStorage.removeItem(name);
				res(true);

			}catch(e){

				res(null);

			}

		});

	};

	self.keyboardActions = function(beforeShow, afterShow, beforeHide, afterHide){

		if(!app) return;
		self._keyboardWillShow && window.removeEventListener('keyboardWillShow', self._keyboardWillShow);

		self._keyboardWillShow = function(){

			beforeShow && beforeShow();
			window.removeEventListener('keyboardWillShow', self._keyboardWillShow);
			delete(self._keyboardWillShow);

		};

		window.addEventListener('keyboardWillShow', self._keyboardWillShow);
		self._keyboardDidShow && window.removeEventListener('keyboardDidShow', self._keyboardDidShow);

		self._keyboardDidShow = function(){

			afterShow && afterShow();
			window.removeEventListener('keyboardDidShow', self._keyboardDidShow);
			delete(self._keyboardDidShow);

		};

		window.addEventListener('keyboardDidShow', self._keyboardDidShow);
		self._keyboardWillHide && window.removeEventListener('keyboardWillHide', self._keyboardWillHide);

		self._keyboardWillHide = function(){

			beforeHide && beforeHide();
			window.removeEventListener('keyboardWillHide', self._keyboardWillHide);
			delete(self._keyboardWillHide);

		};

		window.addEventListener('keyboardWillHide', self._keyboardWillHide);
		self._keyboardDidHide && window.removeEventListener('keyboardDidHide', self._keyboardDidHide);

		self._keyboardDidHide = function(){

			afterHide && afterHide();
			window.removeEventListener('keyboardDidHide', self._keyboardDidHide);
			delete(self._keyboardDidHide);

		};

		window.addEventListener('keyboardDidHide', self._keyboardDidHide);

	};

	self.deviceClearDirectory = function(dir){

		if(!app) return Promise.resolve(true);
		return new CordovaFS().clearDirectory(dir);

	};

	self.clickSound = function(){

		if(!app) return false;
		nativeclick.trigger();

	};

	self.upgradeDialog = function(reason){

		D.u([l[553].ucFirst(), reason.ucFirst()], [l[227].ucFirst(), l[164].ucFirst()], function(result){

			D.h();
			result && I.changePage('plans');

		});

	};

	self._criticalError = function(e){

		switch(e.message){

		case l[105]:

			return 0;

		case l[11]:
		case l[415]:

			return 1;

		default:

			return 2;

		}

	};

	self.e = function(source, error, silent){

		DEBUG_ERR('GLOBAL ERROR: ' + source + ' : ', error, 'silent', silent);

		var name, publicRSA, key, keyring, alias;

		var _sendDone = function(){

			if(app && !silent) return window.location = I.initURL;
			document.getElementById('btnClose').show();

		};

		var _send = function(){

			if(!config.erid || self._sentErrors.indexOf(source + error) >= 0) return;
			self._sentErrors.push(source + error);

			return A.prepareFeedback(config.erid).then(function(result){

				if(result === 'cancelled') return;
				publicRSA = result.rsa;
				name = result.n;
				alias = result.u;
				key = result.key;

				return Keyring.create(crypto.getRandomValues(new Uint8Array(48))).then(function(result){

					keyring = result;
					return keyring.importPublicKey('ENC', publicRSA);

				}).then(function(result){

					var info = source + ' ' + error.message + '<br /><br />' + '[uri: ' + document.location.hash + ']' + '<br />' + '[ua: ' + navigator.userAgent + ']';

					var data = {

						n: a2u(name),
						u: alias,
						f: 'noreply@' + config.domain,
						s: source,
						m: info

					};

					return Encryption.encrypt(keyring, result.id, {data: msgpack.pack(data), aad: s2b('aad').buffer});

				}).then(function(result){

					return A.sendFeedback(key, result);

				}).then(_sendDone).catch(_sendDone);

			});

		};

		return new Promise(function(res){

			DOM.loader();
			var errorType = self._criticalError(error);

			switch(errorType){

			case 0: //just logout

				U.logout('signin', true);
				break;

			case 2: //send error report

				_send();
				
			default: //show error message

				(silent || app) || D.i([errorType === 3 ? l[112].ucFirst() : l[6].ucFirst(), errorType === 3 ? (l[8].ucFirst() + '...') : error.message.ucFirst(), (errorType === 3 ? (source + ': ') : '') + error.message.ucFirst()],  [l[10].ucFirst()], function(r){

					D.h();
					res();

				});

				break;

			}

		});

	};

}