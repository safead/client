'use strict';

function cDOM(){

	var self = this;
	self._version = '1.0.0';
	self.container = document.getElementById('content-holder');

	//INTERFACE

	self._interface = function(){

		var loggedIn = U.access(1),
			innerInterface = loggedIn && window.location.pathname !== '/',
			innerFound = document.getElementById('mainBlock'),
			outerFound = document.getElementById('interfaceOuter'),
			isDeployed = true, df, elem;
		self._resetCustomBlocks();
		!innerInterface && innerFound && (isDeployed = false);
		isDeployed && (isDeployed = (loggedIn && innerFound) || (!loggedIn && outerFound));
		if(isDeployed) return true; //outer interface already deployed

		df = I.template((I.isDesktop ? innerInterface : loggedIn) ? 'interface inner' : 'interface');
		self._reset();

		if(I.isDesktop){ //desktop

			if(innerInterface){

				elem = df.getElementById('panelMain');
				self._panelMain(elem);

			}else{

				df.getElementById('headerTop').appendChild(I.template('index header'));

			}

		}else{ //mobile

			app && I.container.classList.add('appMode');

			if(loggedIn){

				df.getElementById('panelTop').appendChild(I.template('panel top inner'));
				I.topMenu = new TopMenu(df.getElementById('panelTopMenu'), df.getElementById('topInfoBlock'));
				df.getElementById('menuLeft').appendChild(I.template('menu left')); //swipe menus
				self._panelLeftInitM(df);
				df.getElementById('menuRight').appendChild(I.template('menu right'));
				self._panelRightInitM(df);
				I.panelLeft = new SwipeMenu(df.getElementById('mainBlock'), df.getElementById('menuLeft'), df.getElementById('btnMenuLeft'), 290, true);
				I.panelRight = new SwipeMenu(df.getElementById('mainBlock'), df.getElementById('menuRight'), df.getElementById('userBlock'), 280);
				I.panelLeft.wiredMenu = I.panelRight;
				I.panelRight.wiredMenu = I.panelLeft;

			}

		}

		self._deployInterface(df);
		I.isDesktop || self.aliasView();
		self._initCommonLinks();
		self.contentBody = document.getElementById('contentBody');
		loggedIn && I.isDesktop && self.adaptiveHeader();
		return true;

	};

	self._resetCustomBlocks = function(){

		var composeTools = document.getElementById('composeTools'),
			topPrefix = document.getElementById('topPrefix');

		composeTools && composeTools.remove();
		topPrefix && topPrefix.customClear();

	};

	self.aliasView = function(df){

		df = df || document;
		I.isDesktop && (df.getElementById('userName').innerHTML = U.currentNick());

		if(U.access(1)){

			df.getElementById('userEmail').innerHTML = U.type() === 2 ? '<a class="red">' + l[408] + '</a>' : U.email();
			AV.deploy({items: [df.getElementById('userAvatar')]});

		}

	};

	//INDEX

	self.index = function(){

		if(!self._interface()) return;
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[3].ucFirst());
		var df = I.template('index'), elem;

		if(I.isDesktop){ //desktop

			document.getElementById('headerSignup').show();
			self._signinInit(document.getElementById('headerTop'));
			document.getElementById('headerSignin').show();
			document.getElementById('contentBody').className = 'mainpage-content';
			document.getElementById('interfaceOuter').className = 'mainpage';
			document.getElementById('btnSubmit').noloading();

			if(U.access(1)){

				elem = df.getElementsByClassName('jSignup');
				elem.length && elem.forEach(function(x){ x.hide(); });
				document.getElementById('headerSignin').classList.add('h');
				elem = document.getElementById('headerSignup');
				elem.setAttribute('href', 'inbox/0');
				elem.innerHTML = l[129];

			}

		}else{ //mobile

			if(U.access(1)){

				return I.changePage('inbox/0');

			}else{

				document.getElementById('panelTop').fill(self._panelTop('panel top index'));
				elem = document.getElementById('panelBottom');
				elem && elem.remove();
				self._signinInit(df);

			}

		}

		self._deploy(df);
		self._initCommonLinks();
		navState.page[0] === 'contact' && document.getElementById(secureFeedbackButtonId).click();

	};

	//READ

	self.read = function(){

		DOM.loader(l[273], 100);

		var df = I.template('guest message');

		self._initGuestRead(df).then(function(result){

			if(result === true) return I.changePage('inbox/0');

			if(result === -1){

				return D.i([l[50].ucFirst(), l[44].ucFirst()], [l[0].ucFirst()], function(){

					D.h();
					I.changePage('/');

				});

			}

			I.container.customClear();

			(U.access(1) ? U.logout(null, true).then(function(){

				return U.heartbeat(true);
				
			}) : Promise.resolve(true)).then(function(result){

				if(!result || !self._interface()) return;

				if(I.isDesktop){ //desktop

					self._signinInit(document.getElementById('headerTop'));

				}else{ //mobile

					document.getElementById('panelTop').fill(self._panelTop('panel top index'));

				}

				I.pageTitle(config.domain.ucFirst() + ' - ' + l[93].ucFirst());
				self._deploy(df, 'messagePassword');
				DOM.loader();
				self._initCommonLinks();

			});

		});

	};

	//PLANS

	self.plans = function(){

		I.pageTitle(config.domain.ucFirst() + ' - ' + l[74].ucFirst());

		return I.loadFile('/html/plans_' + U.lang() + '.html').then(function(response){

			if(response === 'cancelled') return;
			var regexp = /\[>(\d*)_([^<]*)<\]/, i;

			while(i = response.match(regexp)){

				switch(i[2]){

				case 'SPACE':

					response = response.replace(regexp, bytesToSize(options['u' + i[1]]['d']));
					break;

				case 'ALIASES':

					response = response.replace(regexp, options['u' + i[1]]['x']);
					break;

				case 'RECIPIENTS':

					response = response.replace(regexp, options['u' + i[1]]['r']);
					break;

				case 'MAX_FILES':

					response = response.replace(regexp, options['u' + i[1]]['a']);
					break;

				case 'FILE_SIZE':

					response = response.replace(regexp, bytesToSize(options['u' + i[1]]['l']));
					break;

				case 'MESSAGE_SIZE':

					response = response.replace(regexp, bytesToSize(options['u' + i[1]]['l'] * options['u' + i[1]]['a']));
					break;

				case 'TTL':

					response = response.replace(regexp, lastObjectKey(options['u' + i[1]]['t']) / (365 * 24));
					break;

				default:

					response = response.replace(regexp, '__ERROR__');
					break;

				}

			}

			DOM.page('');
			self.backButton(true);

			createElement('iframe', {src: 'https://order.safe.ad/', style: 'width:101%;height:1px', scrolling: 'no', id: 'orderIframe'}, document.getElementById('pageHTML'), function(iframe){

				iframe.contentWindow.postMessage({html: response, user: {type: U.type(), paid_to: U.paidTo(), login: U.login(), email: U.email()}, opt: options}, '*');

				window.onmessage = function(message){

					if(message.origin !== 'https://order.safe.ad') return;

					switch(message.data.action){

					case 'signup':

						I.changePage('signup');
						break;

					case 'height':

						iframe.style.height = message.data.val + 'px';
						break;

					case 'pd': //payment should be successful

						D.i([l[387].ucFirst(), l[314]], [l[0].ucFirst()]);
						break;

					case 'upgrade': //upgrade from premium to corporate

						D.c([l[75].ucFirst(), l[551]], [l[552].ucFirst(), l[164].ucFirst()], function(result){

							D.h();
							result && iframe.contentWindow.postMessage({conv: true, selected: message.data.selected}, '*');

						});

						break;

					default:

						break;

					}

				};

			});

			var elem = document.getElementById('headerSignup');
			elem && U.access(1) && (I.isDesktop ? elem.invis() : elem.hide());

		});

	};

	//PAGE

	self.page = function(content){

		if(!self._interface()) return;
		var df = I.template(U.access(1) ? 'page inner' : 'page'),
			container = df.getElementById('pageHTML');

		container.appendChild(content instanceof Object ? content.cloneNode(true) : content.toDOM());
		var title = container.getElementsByTagName('H1'); //browser title

		if(title.length){ //page title

			I.pageTitle(config.domain.ucFirst() + ' - ' + title[0].innerHTML.ucAll());
			U.access(1) && title[0].id === 'transferable' && (I.isDesktop ? self.title(title[0].innerHTML.ucAll(), df) : self.titleM(title[0].innerHTML.ucAll())) && title[0].remove();

		}

		if(I.isDesktop){ //desktop

			if(U.access(1)){

				self._desktopUserMenu(df);

			}else{

				document.getElementById('headerSignup').show();
				document.getElementById('headerSignin').show();
				self._signinInit(document.getElementById('headerTop'));
				document.getElementById('contentBody').className = 'mainpage-content';
				document.getElementById('interfaceOuter').className = 'mainpage';

			}
	
		}else{ //mobile

			if(U.access(1)){

				self.backButton(true);
				document.getElementById('panelBottom').fill(I.template('panel bottom compose only'));
				self.composeButton(true);

			}else{

				document.getElementById('panelTop').fill(self._panelTop('panel top'));
				self.backButton(true);

			}

		}

		self._deploy(df);
		DOM.loader();
		self._initCommonLinks();

	};

	//ERROR PAGE

	self.error = function(df){

		var elem = I.container.getElementById('error');
		elem && elem.remove();
		I.container.insertBefore(df, I.container.firstChild);
		self._initCommonLinks();

	};

	//SETTINGS

	self.settings = function(){

		if(!U.granted(1) || !self._interface()) return;

		var df = I.template('settings');
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[74].ucFirst());

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);
			self.title(l[74], df);

		}else{ //mobile

			self.backButton(true);
			document.getElementById('panelBottom').fill(I.template('panel bottom settings'));
			self.composeButton(true);
			self.titleM(l[74]);

		}

		self.settingsInit(df);
		DOM.loader();
		self._deploy(df);
		self._deployRedactor();

	};

	//INBOX

	self.inbox = function(){

		if(!U.granted(1) || !self._interface()) return;
		var df = I.template('inbox');

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);

		}else{ //mobile

			document.getElementById('panelBottom').fill(I.template('panel bottom inbox'));
			self.composeButton(true);

		}

		self._deploy(df, null, false);
		app && DOM.loader('');
		E.domInit();
		I.waitersDone();

	};

	//MESSAGE

	self.message = function(){

		if(!U.granted(1) || !self._interface()) return;

		var df = I.template('view message');

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);

		}else{ //mobile

			document.getElementById('panelBottom').fill(I.template('panel bottom message'));
			self.composeButton(true);
			document.getElementById('topInfoBlock').hide();
			document.getElementById('messageTopInfo').hide();

		}

		app && DOM.loader('');
		self._deploy(df);
		self.backButton(true);
		E.domReadInit(navState.page[1]);

	};

	//STORAGE

	self.filestorage = function(){

		if(!U.granted(1) || !self._interface()) return;

		var df = I.template('filestorage');
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[331].ucFirst());

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);

		}else{ //mobile

			self.backButton(true);
			document.getElementById('panelBottom').fill(I.template('panel bottom filestorage'));
			self.titleM(l[331].ucFirst());

		}

		app && DOM.loader('');

		FS.domInit(df).then(function(result){

			if(!result) return;
			navState.page[0] === 'storage' && self._deploy(df);

		}).catch(function(ex){

			I.e('cDOM.message', ex);

		});

	};

	//COMPOSE

	self.compose = function(){

		if(!U.granted(1) || !self._interface()) return;

		var df = I.template('compose');

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);

		}else{ //mobile

			self.backButton(true);
			document.getElementById('panelBottom').fill(I.template('panel bottom compose'));
			document.getElementById('mainBlock').appendChild(I.template('tools bottom compose'));
			document.getElementById('topPrefix').innerHTML = l[524] + ': ';

		}

		DOM.loader('');
		self._deploy(df, null, false);
		return W.init().then(I.waitersDone);

	};

	//CONTACTS

	self.contacts = function(){

		if(!U.granted(1) || !self._interface()) return;
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[124].ucFirst());
		var df = I.template('contacts');

		if(I.isDesktop){ //desktop

			self._desktopUserMenu(df);
			self.title(l[124], df);

		}else{ //mobile

			self.titleM(l[124]);
			document.getElementById('panelBottom').fill(I.template('panel bottom contacts'));
			document.getElementById('mainBlock').insertBefore(I.template('alphabet'), document.getElementById('contentBody'));
			self.composeButton(true);
			self.backButton(true);

		}

		app && DOM.loader('');

		C.domInit(df).then(function(){

			self._deploy(df);

		});

	};

	//OFFLINE

	self.offline = function(online){

		online = online || false;
		online || D.h();		
		var elem = I.container.getElementById('offlineBlock');

		if(online){

			if(I.offline){ //swith to online

				app && window.plugins.spinnerDialog.hide();
				I.clearReconnectTimeout();
				elem && elem.remove();

			}

			I.offline = false;
			return;

		}else{

			if(!I.offline){ //swith to offline

				app && window.plugins.spinnerDialog.hide();

			}

		}

		if(I.reconnectTimeout) return;
		I.offline = true;
		DOM.loader();

		if(!elem){

			var df = I.template('offline');
			I.container.insertBefore(df, I.container.firstChild);

		}

		var refreshButton = I.container.getElementById('retryConnection');

		var _refresh = function(){

			I.reconnectAfter--;
			if(app && app.paused) return;

			if(I.reconnectAfter <= 0){

				refreshButton.innerHTML = l[525].ucFirst() + '...';
				I.clearReconnectTimeout();
				app && window.plugins.spinnerDialog.show('', '', true);
				return N.startQueue(true);

			}

			refreshButton.innerHTML = l[249].ucFirst() + ' (' + I.reconnectAfter + ')';
			I.reconnectTimeout = setTimeout(_refresh, 1000);

		};

		refreshButton.onclick = function(){

			if(I.reconnectAfter === I.reconnectInterval) return;
			I.reconnectAfter = 0;
			_refresh();

		};

		_refresh();

	};

	//SIGNUP

	self.signup = function(){

		if(U.access(1)){

			I.changePage('inbox/0');
			return;

		}

		if(!self._interface()) return;
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[194].ucFirst());
		var df = I.template('signup');

		if(I.isDesktop){ //desktop

			document.getElementById('headerSignup').hide();
			document.getElementById('headerSignin').show();
			self._signinInit(document.getElementById('headerTop'));
			document.getElementById('interfaceOuter').className = 'mainpage';
			document.getElementById('contentBody').className = 'mainpage-content';
			self.title(l[194]);

		}else{ //mobile

			document.getElementById('panelTop').fill(self._panelTop('panel top'));
			self.backButton(true);
			self.titleM(l[194]);

		}

		self._signupInit(df);
		self._deploy(df);
		self._initCommonLinks();

	};

	//SIGNIN

	self.signin = function(){

		if(U.access(1)){

			I.changePage('inbox/0');
			return;

		}else if(!I.isDesktop){

			I.changePage('/');
			return;

		}

		if(!self._interface()) return;
		I.pageTitle(config.domain.ucFirst() + ' - ' + l[13].ucFirst());
		var df = I.template('signin');
		document.getElementById('headerSignin').hide();
		document.getElementById('headerSignup').hide();
		document.getElementById('interfaceOuter').classList.add('authorization-page');
		self._signinInit(df, true);
		self._deploy(df);
		self._initCommonLinks();

	};

	self._desktopUserMenu = function(df){

		df = df || document;
		var elem = df.getElementById('userMenu');
		elem.appendChild(self._userMenu(I.template('user menu')));
		self.aliasView(df);

	};

	self._signinInit = function(df, focus){

		var login = df.getElementById('login') || df.getElementById('loginInput'),
			loginBlock = df.getElementById('loginBlock'),
			password = df.getElementById('password') || df.getElementById('passwordInput'),
			passwordBlock = df.getElementById('passwordBlock'),
			passwordError = df.getElementById('passwordError'),
			submit = df.getElementById('btnSubmit'),
			captchaBlock = df.getElementById('captchaBlock'),
			buttonsBlock = df.getElementById('buttonsBlock'),
			captcha;

		var _ready = function(focus){

			if(

				!checkEmailLogin(login.value.trim().toLowerCase()) ||
				!password.value ||
				!captcha.resolved

			){

				submit.disabled = true;

			}else{

				submit.disabled = false;
				focus && submit.focus();

			}

		};

		var _submit = function(){

			submit.click();

		};

		var _error = function(errText){

			app && window.plugins.spinnerDialog.hide();
			login.value = '';
			password.value = '';
			passwordBlock.error();
			loginBlock.error();
			passwordError.innerHTML = errText;
			login.focus();
			submit.disabled = true;
			enableInputs();
			submit.noloading();

		};

		login.value = addrIsInternal(U.login()) ? U.login() : '';
		password.value = '';

		if(!I.isDesktop || navState.page[0] === 'signin'){

			if(!captchaBlock) return;

			captcha = new Captcha(captchaBlock, I.template('captcha'), 'l', function(){

				buttonsBlock && buttonsBlock.classList.remove('load');

			}, true),

			captcha.new().then(function(){

				_ready(true);

			});

		}else{

			if(U.access(1)) return;
			captcha = {resolved: 1};

		}

		login.oninput = function(){ //login

			loginBlock && loginBlock.noerror();
			_ready();

		};

		login.onblur = function(){

			if(!this.value) this.value = U.login() || '';
			login.value = login.value.trim().toLowerCase();

		};

		login.onfocus = function(){

			loginBlock && loginBlock.noerror();
			this.value = '';

		};

		password.oninput = function(){ //password

			passwordBlock && passwordBlock.noerror();
			_ready();

		};

		password.onfocus = function(){

			passwordBlock && passwordBlock.noerror();
			passwordError && (passwordError.innerHTML = '');

		};

		login.catchEnter(_submit);
		password.catchEnter(_submit);

		submit.onclick = function(e){ //submit

			e.preventDefault();
			if(this.disabled) return;

			if(app){

				I.clickSound();
				window.plugins.spinnerDialog.show('', '', true);

			}else{

				submit.loading();
				submit.disabled = true;
				disableInputs();

			}


			U.netLogin(login.value, password.value, {captcha: captcha}).then(function(result){

				if(!result) return _error(l[90].ucFirst());
				self._postLogin();

			}).catch(function(e){

				if(I.isDesktop && navState.page[0] !== 'signin') return I.changePage('signin');

				switch(parseInt(e.message)){

				case 344111:

					captcha.new(l[127]).then(_ready);
					break;

				default:

					captcha.new().then(function(){

						_ready(true);

					});

					_error(l[e.message === '-1' ? 557 : 405].ucFirst());
					break;

				}

			});

			login.blur();
			password.blur();

		};

		setTimeout(function(){ //disabling auto-complete

			password.setAttribute('type', 'password');
			focus && !app && (login.value ? password : login).focus();
			_ready();

		}, 0);

	};

	self._postLogin = function(){

		app && window.plugins.spinnerDialog.hide();

		return U.setDeviceVars({passBlocked: 0, passTries: 3, passCode: '', pcm: 0}).then(function(){

			I.changePage('inbox/0', {effect: 'flipup'});
			app && later(function(){ window.plugins.toast.showShortTop(l[541].ucFirst() + ' ' + U.email()); });

		});

	};

	self._signupInit = function(df){

		var login = df.getElementById('inputValue'),
			loginBlock = df.getElementById('loginBlock'),
			password = df.getElementById('password'),
			passwordBlock = df.getElementById('passwordBlock'),
			nickname = df.getElementById('nickname'),
			nicknameBlock = df.getElementById('nicknameBlock'),
			passwordConfirmBlock = df.getElementById('passwordConfirmBlock'),
			submit = df.getElementById('btnSubmit'),
			passwordObject, nickObject, loginObject, passwordConfirmObject,
			rulesAgree = df.getElementById('rulesAgree'),
			rulesAgreeBlock = df.getElementById('rulesAgreeBlock'),
			captcha = new Captcha(df.getElementById('captchaBlock'), I.template('captcha'), 'r');

		var _submit = function(){

			submit.click();

		};

		var _ready = function(){

			if(

				!nickObject.ok() ||
				!loginObject.ok() ||
				!passwordObject.ok() ||
				!passwordConfirmObject.ok() ||
				!rulesAgree.checked ||
				!captcha.resolved

			){

				submit.disabled = true;
				return false;

			}

			submit.disabled = false;
			return true;

		};

		var _reset = function(){

			loginObject = new LoginInput(loginBlock, _ready, _submit);
			nickObject = new NickInput(nicknameBlock, _ready, _submit);
			passwordConfirmObject = new PasswordConfirmInput(passwordConfirmBlock, password, _ready, _submit);
			passwordObject = new PasswordInput(passwordBlock, _ready, _submit, passwordConfirmObject);
			nickname.focus();
			captcha.new().then(_ready);

		};

		_reset();

		if(I.isDesktop){

			rulesAgree.onclick = function(){

				_ready();

			};

		}else{

			rulesAgreeBlock.onclick = function(){ //agree with rules

				rulesAgree.checked = !rulesAgree.checked;
				_ready();

			};

			rulesAgree.onclick = function(e){

				e.preventDefault();

			};

		}

		submit.onclick = function(e){ //submit

			e.preventDefault();
			if(this.disabled) return;
			I.clickSound();
			D.m([l[47].ucFirst(), l[38].ucFirst(), l[37]]);
			submit.disabled = true;
			submit.loading();
			disableInputs();
			
			setTimeout(function(){

				U.netSignup(U.id, '', login.value, nickname.value, password.value, captcha).then(function(result){

					if(result === 'cancelled') return;
					self._postLogin();

				}).catch(function(e){

					var error = l[6];

					switch(parseInt(e.message)){

					case 100200:

						return I.changePage('signin');

					case 100300:

						error = l[43];
						break;

					case 100400:

						error = l[151];
						break;

					}

					enableInputs();
					submit.noloading();
					D.h();
					captcha.new().then(_ready);

					error && D.i([l[47].ucFirst(), error.ucFirst()], [l[0].ucFirst()], function(){

						D.h();
						captcha.focusInput();

					});

				});

			}, 100);

		};

	};

	self._initGuestRead = function(df){

		var messagePassword = df.getElementById('messagePassword'),
			messagePasswordBlock = df.getElementById('messagePasswordBlock'),
			messagePasswordHint = df.getElementById('messagePasswordHint'),
			description = df.getElementById('description'),
			extendedInputs = df.getElementById('extendedInputs'),
			login = df.getElementById('inputValue'),
			loginBlock = df.getElementById('loginBlock'),
			password = df.getElementById('password'),
			passwordBlock = df.getElementById('passwordBlock'),
			nicknameBlock = df.getElementById('nicknameBlock'),
			nickname = df.getElementById('nickname'),
			passwordConfirmBlock = df.getElementById('passwordConfirmBlock'),
			rulesAgree = df.getElementById('rulesAgree'),
			submit = df.getElementById('btnSubmit'),
			hint = df.getElementById('hint'),
			hintBlock = df.getElementById('hintBlock'),
			passwordObject, nickObject, loginObject, passwordConfirmObject, decodedLogin, userType = 1;

		var _submit = function(){

			if(submit.disabled) return;
			submit.click();

		};

		var _ready = function(){

			if(

				!messagePassword.value ||
				(login.value && !(loginObject.ok() && nickObject.ok() && passwordObject.ok() && passwordConfirmObject.ok() && rulesAgree.checked))

			){

				submit.disabled = true;
				return;

			}

			submit.disabled = false;

		};

		var _reset = function(){

			loginBlock.hide();
			login.value = '';
			extendedInputs.hide();

			login.oninput = function(){

				this.value ? extendedInputs.show() : extendedInputs.hide();

			};

			loginObject = new LoginInput(loginBlock, _ready, _submit);
			nickObject = new NickInput(nicknameBlock, _ready, _submit);
			passwordConfirmObject = new PasswordConfirmInput(passwordConfirmBlock, password, _ready, _submit);
			passwordObject = new PasswordInput(passwordBlock, _ready, _submit, passwordConfirmObject);

		};

		_reset();

		messagePassword.oninput = function(){

			userType === 2 && this.value && loginBlock.show();
			_ready();

		};

		messagePassword.catchEnter(_submit);

		messagePassword.addEventListener('focus', function(){

			messagePasswordHint.innerHTML = '';
			messagePasswordBlock.noerror();

		});

		rulesAgree && rulesAgree.addEventListener('click', function(){ //agree with rules

			_ready();

		});

		submit.addEventListener('click', function(){

			if(!decodedLogin) return;
			disableInputs();
			this.disabled = true;
			this.loading();

			U.netLogin(decodedLogin, messagePassword.value).then(function(){

				I.container.customClear();
				if(!login || !login.value) return I.changePage('inbox/0');
				D.m([l[339].ucFirst(), l[37].ucFirst()]);

				U.changeCredentials(messagePassword.value, password.value, {

					nick: nickname.value,
					login: login.value,
					alias: [login.value, u2a(nickname.value), F.folders[0].id]

				}).then(function(){

					D.i([l[100].ucFirst(), l[340].ucFirst()], [l[0].ucFirst()], function(){

						I.changePage('inbox/0');

					});

				});

			}).catch(function(){

				messagePassword.value = '';
				enableInputs();
				submit.disabled = false;
				submit.noloading();
				messagePasswordBlock.error();
				messagePasswordHint.innerHTML = l[327];

			});

		});

		return A.emailLinkDecode(navState.page[1]).then(function(response){

			if(response === 'cancelled') return false;
			if(response === -1) return response;
			decodedLogin = response.address;
			if(U.isMe(decodedLogin)) return true;
			userType = response.type;
			if(userType !== 2){

				messagePassword.setAttribute('placeholder', l[342].ucFirst());
				description.innerHTML = l[465].ucFirst();

			}else if(response.hint){

				hint.innerHTML = clearTags(response.hint);
				hintBlock.show();
				
			}

			messagePasswordBlock.show();
			submit.show();
			return false;

		});

	};

	self.title = function(value, container){

		container = container || document;
		value = value || '';
		var elem = container.getElementById('panelTopTitle'),
			btnBack = container.getElementById('btnBack');
		if(!elem) return false;
		elem.innerHTML = value || '&nbsp;';

		btnBack && (btnBack.onclick = function(){

			I.pageBackward();

		});

		return true;

	};

	self.titleM = function(value){

		value = value || '';
		var elem = document.getElementById('panelTopTitle');
		if(!elem) return false;
		elem.innerHTML = value.ucFirst() || '&nbsp;';
		return true;

	};

	self._reset = function(){

		self.container.customClear();

	};

	self._panelMain = function(df){

		df.getElementById('headerLogo').onclick = function(){

			I.changePage('/');

		};

		df.getElementById('newCompose').onclick = function(){

			if(navState.page[0] === 'compose') return;
			I.pageBackward('compose', self.inSelectionMode() ? {} : {noSubs : true});

		};

		F.domFill(df.getElementById('folders'));
		FS.domStats(df.getElementById('files'));
		C.domCount(df.getElementById('contactsTotal'));

		df.getElementById('folderAddButton').onclick = function(){

			this.hide();
			document.getElementById('folderAddBlock').classList.add('block');
			document.getElementById('newFolderName').focus();

		};

		df.getElementById('btnNewFolderCancel').onclick = function(){

			document.getElementById('folderAddBlock').classList.remove('block');
			document.getElementById('newFolderName').value = '';
			document.getElementById('folderAddButton').show();

		};

		df.getElementById('btnNewFolderSubmit').onclick = function(){

			var input = document.getElementById('newFolderName');

			input.value = clearTags(input.value.trim());

			if(!input.value) return input.focus();
			var folder = F.add(input.value);
			folder.domAdd(document.getElementById('folders'));
			U.netSave(['settings']); //silent save
			E.domBulkTools();
			document.getElementById('btnNewFolderCancel').click();
			I.changePage('inbox/' + (F.folders.length - 1));

		};

		df.getElementById('newFolderName').onkeydown = function(e){

			if(e.keyCode === 13){

				document.getElementById('btnNewFolderSubmit').click();

			}else if(e.keyCode === 27){

				document.getElementById('btnNewFolderCancel').click();

			}

		};

		return df;

	};

	self.userMembership = function(elem){

		document.getElementById('orderIframe') && document.getElementById('orderIframe').contentWindow.postMessage({ user: {type: U.type(), paid_to: U.paidTo(), login: U.login(), email: U.email()} }, '*');
		elem = elem || document.getElementById('userMembership');
		if(!elem) return;

		switch(U.type()){

		case 1:

			elem.innerHTML = l[172].ucFirst();
			break;

		case 2:

			elem.innerHTML = l[545].ucFirst();
			break;

		case 3:

			elem.innerHTML = l[173].ucFirst();
			break;

		case 4:

			elem.innerHTML = l[174].ucFirst();
			break;

		case 5:
			elem.innerHTML = l[177].ucFirst();
			break;

		}

		U.type() > 2 && (elem.innerHTML = elem.innerHTML + ' [' + (U.paidTo() ? I.dateFormat(U.paidTo(), 8) : l[45]) + ']');

	};

	self._userMenu = function(df){

		if(U.type() === 2){ //user should choose any alias for future logins

			D.i([l[112].ucFirst(), l[409]], [l[102].ucFirst()]);
			df.getElementById('userEmail').appendChild(('<a class="red" id="getAlias">' + l[408] + '</a>').toDOM());

			df.getElementById('getAlias').onclick = function(e){

				e.stopPropagation();
				self.addAlias();

			};

		}

		df.getElementById('userMenuPopupBlock').onclick = function(){

			new Popup(I.template('user menu popup'), document.getElementById('userMenuPopupContainer'), function(popupNodes){

				self.userMembership(popupNodes.getElementById('userMembership'));
				self._keyId(popupNodes.getElementById('userKey'));
				self._logout(popupNodes.getElementById('userMenuLogout'));
				self.diskUsage(popupNodes.getElementById('userMenuDiskInfo'));

				popupNodes.getElementById('plans').onclick = function(){

					I.changePage('plans');

				};

				popupNodes.getElementById('settings').onclick = function(){

					I.changePage('settings');

				};

				return popupNodes;

			}.bind(this));

		};

		var _aliasesMenu = function(){ //user aliases menu

			new Popup(I.template('user aliases popup'), document.getElementById('userAliasesPopupContainer'), function(popupNodes, _close){

				var itemsContainer = popupNodes.getElementById('userAliasesList');

				U.aliases.forEach(function(data){

					var node = I.template('user aliases popup item').firstChild;
					node.setAttribute('data-alias', data.alias.toLowerCase());
					var elem = node.getElementById('title');
					elem.removeAttribute('id');
					elem.insertBefore(document.createTextNode(data.nick), elem.firstChild);
					elem = node.getElementById('subTitle');
					elem.removeAttribute('id');
					elem.innerHTML = ' &lt;' + addrReal(data.alias) + '&gt;';
					elem = node.getElementById('avatarImage');
					elem.removeAttribute('id');
					var src = AV.uri(data.alias); //avatar image

					if(src){

						elem.setAttribute('src', src);
						elem.show();

					}else elem.remove();

					itemsContainer.appendChild(node);

				});

				popupNodes.getElementById('userAddAlias').onclick = function(e){

					e.stopPropagation();
					_close();
					self.addAlias();

				};

				return popupNodes;

			}.bind(this), function(clickedElem){

				U.switchAlias(clickedElem.getAttribute('data-alias')).then(function(){

					navState.page[0] === 'settings' && self.settingsInit();

				});

			});

		};

		df.getElementById('userEmail').onclick = _aliasesMenu;
		df.getElementById('userName').onclick = _aliasesMenu;
		self._logout(df.getElementById('userLogout'));
		return df;

	};

	self.adaptiveHeader = function(){

		if(!I.isDesktop || !U.access(1)) return;

		var panelMain = document.getElementById('panelMain'),
			mainContent = document.getElementById('contentBody');
		if(!panelMain || !mainContent) return;
		var top = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;

		if(panelMain.clientHeight <= window.innerHeight){

			panelMain.className = 'header header-fixed-top';

		}else{

			if(top + window.innerHeight > panelMain.clientHeight && panelMain.clientHeight < mainContent.clientHeight){

				if(panelMain.clientHeight > window.innerHeight){

					panelMain.className = 'header header-fixed-bottom';

				}else if(top > 0) panelMain.className = 'header header-fixed-top';

			}else panelMain.className = 'header';

		}

	};

	self.fixTopPanel = function(){

		var topPanel = document.getElementById('topPanel');
		if(!topPanel) return;
		if(document.getElementById('headblock')) return;
		var elem = document.getElementById('contentBody');
		elem.insertBefore('<div id="headblock"></div>'.toDOM(), elem.firstChild);
		document.getElementById('headblock').className = 'height-' + topPanel.outerHeight();

	};

	self.addAlias = function(){

		if(U.aliases.length >= options['u' + U.type()].x) return I.upgradeDialog(l[361] + ': ' + options['u' + U.type()].x);

		D.t(I.isDesktop ? ([l[153].ucFirst(), l[154].ucFirst() + ':']) : ([l[153].ucFirst(), l[176].ucFirst(), l[154].ucFirst() + ':']), [l[153].ucFirst(), l[164].ucFirst()], function(r){

			D.h();
			if(!r) return;

			var alias = clearTags(input.value.trim().toLowerCase());

			A.aliasNew([alias, u2a(alias.split('@', 1)[0]), F.folders[0].id]).then(function(response){

				if(response === 'cancelled') return;
				var wasTemporary = U.type() === 2;

				U.setCredentials({

					login: alias,
					type: response.type,
					aliases: response.aliases

				}).then(function(){

					self.aliasView();
					I.isDesktop || I.topMenu.addItem(U.aliasByAddress(alias));

					D.i([l[152].ucFirst(), l[358].ucFirst() + ' \'' + alias + '\' ' + l[359] + ' \'' + alias + '@' + config.domain + '\' ' + l[360].ucFirst()], [l[0].ucFirst()], function(){

						if(!wasTemporary) return D.h();

						D.c([l[112].ucFirst(), '<span class="red">' + l[336].ucFirst() + '!</span>'], [l[402].ucFirst(), l[102].ucFirst()], function(r){

							D.h();
							if(!r) return;
							I.changePage('settings');

						});

					});

				});

			}).catch(function(e){

				parseInt(e.message) === 595959 ? I.upgradeDialog(l[361] + ': ' + options['u' + U.type()].x) : D.i([l[153].ucFirst(), l[90].ucFirst()], [l[0].ucFirst()]);

			});

		});

		var dialog = document.getElementById('dialog'),
			inputBlock = dialog.getElementById('popupInputBlock'),
			input = inputBlock.getElementById('inputValue'),
			submit = dialog.getElementById('btnSubmit');

		submit.disabled = true;

		var _ready = function(result){

			if(result) return submit.disabled = false;
			submit.disabled = true;

		};

		input.setAttribute('placeholder', '2 ' + l[302]);
		loginObject = new LoginInput(inputBlock, _ready);

	};

	self.diskUsage = function(container){

		container || (container = document.getElementById('userMenuDiskInfo'));
		if(!container) return;

		var du = U.diskUsage(),
			max = options['u' + U.class()]['d'],
			caption = container.getElementById('userDiskUsage'),
			bar = container.getElementById('userDiskUsageBar');

		if(!caption || !bar) return;

		caption.innerHTML = (du ? bytesToSize(du) : 0) + ' ' + l[162] + ' ' + bytesToSize(max);
		var per = Math.round(((du / max)) * 100);
		per > 100 && (per = 100);

		if(I.isDesktop){

			bar.className = 'message-menu-user-menu-info-usage-graph';
			bar.classList.add('message-menu-user-menu-info-usage-percents');

		}else{

			bar.className = 'percentage';

		}

		bar.classList.add('progress-width' + per);

	};

	self._panelLeftInitM = function(df){

		F.domFillM(df.getElementById('folders'));
		var newFolderBlock = df.getElementById('newFolderBlock'),
			newFolderInput = df.getElementById('newFolderInput'),
			folderNewButton = df.getElementById('folderNewButton'),
			folderNewCancel = df.getElementById('folderNewCancel'),
			folderAddButton = df.getElementById('folderAddButton');

		var _expand = function(){

			newFolderBlock.classList.add('opened');
			newFolderInput.focus();

		};

		var _collapse = function(){

			newFolderBlock.classList.remove('opened');
			newFolderInput.value = '';

		};

		folderNewButton.onclick = function(e){

			e.preventDefault();
			e.stopPropagation();
			_expand();

		};

		newFolderInput.onblur = function(e){

			e.preventDefault();
			e.stopPropagation();
			this.value ? folderAddButton.click() : folderNewCancel.click();

		};

		folderNewCancel.onclick = function(e){

			e.preventDefault();
			e.stopPropagation();
			newFolderInput.value = '';
			_collapse();

		};

		folderAddButton.onclick = function(e){

			e.preventDefault();
			e.stopPropagation();
			newFolderInput.value = newFolderInput.value.trim();
			if(!newFolderInput.value) return;
			var folder = F.add(newFolderInput.value);
			folder.domAddM(document.getElementById('foldersCustom'));
			_collapse();
			E.domBulkTools();
			var elem = document.getElementById('menuLeft');
			elem.scrollTop = elem.scrollHeight;
			U.netSave(['settings']); //silent save

		};

	};

	self._panelRightInitM = function(df){

		self.userMembership(df.getElementById('userMembership'));
		self.diskUsage(df.getElementById('userMenuDiskInfo'));
		self._keyId(df.getElementById('userKey'));
		C.domCount(df.getElementById('contactsTotal'));
		FS.domStats(df.getElementById('files'));
		self._logout(df.getElementById('userLogout'));

		new Dropdown(df.getElementById('informationLink'), df.getElementById('infoList'), function(){

			var df = I.template('dropdown info');
			self._initCommonLinks(df);
			return df;

		}.bind(this));

		df.getElementById('linkContacts').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();
			I.changePage('contacts');

		};

		df.getElementById('linkFiles').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();
			I.changePage('storage');

		};

		df.getElementById('linkAliases').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();

			I.panelRight.close().then(function(){

				I.topMenu.open();

			});

		};

		df.getElementById('linkSettings').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();
			I.changePage('settings');

		};

		df.getElementById('membership').onclick = function(e){

			if(app) return;
			e.stopPropagation();
			e.preventDefault();
			I.changePage('plans');

		};

		df.getElementById('contactSupport').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();

			I.panelRight.close().then(function(){

				fireEvent(document.getElementById(secureFeedbackButtonId), 'showFeedback');

			});

		};

	};

	self._keyId = function(node){

		if(!node || !U.keyring.keys) return;
		var id = U.keyring.keys.SIGN.id.toUpperCase();
		node.innerHTML = l[369].ucFirst() + ': ' + id.saparate4();

	};

	self._logout = function(node){

		if(!node) return;

		node.onclick = function(e){

			e.preventDefault();
			e.stopPropagation();
			U.logout('', true);

		};

	};

	self._deployInterface = function(df){

		self.container.appendChild(df);
		self.container.classList.remove('hide');

		if(!I.isDesktop){

			var panelBottom = self.container.getElementById('panelBottom');

			I.dimensions = {

				totalHeight: self.container.offsetHeight,
				topPanel: self.container.getElementById('panelTop').offsetHeight,
				bottomPanel: panelBottom ? panelBottom.offsetHeight : 0

			};

		}

	};

	self._deploy = function(df, focusTo, releaseWaiters){

		var elem = self.container.getElementById('contentBody');
		if(!elem) return;
		typeof releaseWaiters === 'undefined' && (releaseWaiters = true);

		for(var i = elem.childNodes.length - 1; i >= 0; i--){

			if(elem.childNodes[i].id === 'loader') continue;
			elem.childNodes[i].remove();

		}

		if(!df) return;
		elem && elem.appendChild(df);
		I.deployed = true;
		self.adaptiveHeader();
		self.fixTopPanel();
		releaseWaiters && I.waitersDone();
		focusTo && (focusTo = document.getElementById(focusTo));
		focusTo && focusTo.focus();
		F && F.domActive(navState.page[1]);

	};

	self.inSelectionMode = function(){

		return (

			['storage', 'contacts'].indexOf(navState.page[0]) >= 0 &&
			history.state.pos > 0 &&
			myHistory.length > history.state.pos &&
			myHistory[history.state.pos - 1].page[0] === 'compose'

		);

	};

	self.composeButton = function(show){

		var elem = document.getElementById('newCompose');
		if(!elem) return;
		if(!show && !I.isDesktop) return elem.hide();

		elem.onclick = function(e){

			e.preventDefault();
			I.clickSound();
			I.pageBackward('compose', self.inSelectionMode() ? {} : {noSubs : true});
			return;

		};

		elem.show();

	};

	self.cleaning = function(){

		var elem;

		if(I.isDesktop){

			self.titleM();

		}else{

			elem = document.getElementById('topInfoBlock');
			elem && elem.show();
			elem = document.getElementById('messageTopInfo');
			elem && elem.hide();

		}

		document.activeElement && document.activeElement.blur();
		elem = document.getElementById('alphabet');
		elem && elem.remove();
		I.alphabet = null;
		I.topPanel = null;
		I.headOffset = null;
		if(typeof tinyMCE !== 'undefined') elem = tinyMCE.activeEditor;

		if(elem){

			//iOS have a bug that stores the focus in tiny iframe after page change
			document.getElementById('newRecipient') && document.getElementById('newRecipient').focus();
			elem.remove();

		}

		self._deploy();

	};

	self._panelTop = function(id){

		var df = I.template(id);
		var elem = df.getElementById('logo');

		elem && (elem.onclick = function(e){

			e.preventDefault();
			I.changePage('/');

		});

		elem = df.getElementById('selectLanguage');
		elem && (new Dropdown(elem, df.getElementById('languagesDropdown'), function(){

			return I.template('dropdown index languages');

		}.bind(this), function(clickedElem){

			var icon = document.getElementById('languageIcon'),
				id = clickedElem.getAttribute('data-id');

			icon.className = 'icon icon-flag-' + id;

			switch(id){

			case 'en':

				break;

			}

		}));

		return df;

	};

	self.chromeUploadAlert = function(){

		return new Promise(function(res){

			if(!client.iosChrome()) return res();

			D.i([l[345].ucFirst(), l[404].ucFirst()], [l[102].ucFirst()], function(){

				D.h();
				res();

			});

		});

	};

	self.backButton = function(show, lookFor){

		var btnBack = document.getElementById('btnBack'),
			btnMenuLeft = document.getElementById('btnMenuLeft');

		if(show){

			btnMenuLeft && btnMenuLeft.hide();

			if(btnBack){

				btnBack.onclick = function(e){

					I.clickSound();
					e.preventDefault();
					self.inSelectionMode() ? I.pageBackward('compose') : I.pageBackward(lookFor);

				};

				btnBack.show();

			}

		}else{

			btnMenuLeft && btnMenuLeft.show();
			btnBack.hide();

		}


	};

	self.loader = function(message, progress){

		if(app && app.locked) return;

		if(typeof message !== 'undefined' || progress){

			L || (L = new Loader(document.getElementById('contentBody') || document.getElementById('content-holder'), I.template('loader')));
			if(!message && !progress) return L.progress(-1);
			if(message) L.text(message);

			if(typeof progress === 'undefined'){

				L.emulate(common.emptyProgressDuration, 2);

			}else L.progress(progress);

		}else{

			if(bootLoader){

				bootLoader.remove();
				bootLoader = null;

			}

			if(!L) return;
			L.remove();
			L = null;

		}
	
	};

	self.settingsInit = function(df){

		df = df || document;

		var nickname = df.getElementById('nickname'),
			nicknameBlock = df.getElementById('nicknameBlock'),
			nicknameIcon = df.getElementById('nicknameIcon'),
			password = df.getElementById('password'),
			passwordBlock = df.getElementById('passwordBlock'),
			passwordConfirm = df.getElementById('passwordConfirm'),
			passwordConfirmBlock = df.getElementById('passwordConfirmBlock'),
			passwordCurrent = df.getElementById('passwordCurrent'),
			passwordCurrentBlock = df.getElementById('passwordCurrentBlock'),
			avatarImage = df.getElementById('avatarImage'),
			avatarChoose = df.getElementById('avatarChoose'),
			avatarDelete = df.getElementById('avatarDelete'),
			addRecipients = df.getElementById('addRecipients'),
			twoFactorAuth = df.getElementById('twoFactorAuth'),
			userAvatar = df.getElementById('userAvatar') || document.getElementById('userAvatar'),
			btnSave = document.getElementById('btnSave') || df.getElementById('btnSubmit'),
			passCodeBlock = df.getElementById('passCodeBlock'),
			passCode = df.getElementById('passCode'),
			passCodeChangeBlock = df.getElementById('passCodeChangeBlock'),
			passCodeMode = df.getElementById('passCodeMode'),
			defaultPassCodeMode = df.getElementById('defaultPassCodeMode'),
			passCodeModeList = df.getElementById('passCodeModeList'),
			touchIdBlock = df.getElementById('touchIdBlock'),
			touchId = df.getElementById('touchId'),
			touchIdTitle = df.getElementById('touchIdTitle'),
			passwordObject, nickObject, passwordConfirmObject,
			newCurrentFolderId = U.defaultFolder();

		var _submit = function(){

			if(btnSave.disabled || btnSave.classList.contains('disabled')) return;
			I.isDesktop ? btnSave.disabled = true : btnSave.classList.add('disabled');
			D.m([l[339].ucFirst(), l[37].ucFirst()]);

			U.changeCredentials(passwordCurrent.value, password.value, {

				nick: nickname.value,
				folder: newCurrentFolderId,
				addRecipients: addRecipients.checked,
				signature: typeof tinymce === 'object' && tinymce.activeEditor ? (clearTags(tinymce.activeEditor.getContent()) ? styleMessage(tinymce.activeEditor.getContent()) : '') : U.sig(),

			}).then(function(){

				app ? window.plugins.toast.showShortTop(l[340].ucFirst(), function(){

					I.pageBackward();

				}) : D.i([l[100].ucFirst(), l[340].ucFirst()], [l[0].ucFirst()], function(){

					I.pageBackward();

				});

			}).catch(function(ex){

				D.i([l[50].ucFirst(), ex.message.ucFirst()], [l[0].ucFirst()]);
				_reset();
							
			});

		};

		var _ready = function(){

			var nicknameValue = safeBracket(nickname.value.trim()),
				changed = false, error = false;

			nicknameValue !== U.currentNick() && (changed = true);
			newCurrentFolderId !== U.defaultFolder() && (changed = true);
			nickObject.ok() || (error = true);
			((addRecipients.checked !== U.rc()) || password.value) && (changed = true);
			password.value && !(passwordObject.ok() && passwordConfirmObject.ok() && passwordCurrent.value) && (error = true);
			error ? btnSave.classList.add('error') : btnSave.classList.remove('error');

			if(changed && !error){

				btnSave.disabled = false;
				btnSave.classList.remove('disabled');

			}else{

				btnSave.disabled = true;
				btnSave.classList.add('disabled');

			}

		};

		var _reset = function(){

			I.isDesktop ? btnSave.disabled = true : btnSave.classList.add('disabled');
			nickname.value = U.currentNick();

			password.addEventListener('input', function(){ //new password

				if(!this.value){

					passwordConfirmBlock.hide();
					passwordConfirm.value = '';
					passwordCurrentBlock.hide();
					passwordCurrent.value = '';

				}else{

					passwordConfirmBlock.show();
					passwordCurrentBlock.show();

				}

			});

			passwordCurrent.oninput = function(){ //current password

				_ready();

			};

			nickname.oninput = function(){

				safeBracket(nickname.value.trim()) === U.currentNick() && nicknameIcon.hide();

			};

			passwordCurrent.onkeyup = function(e){

				if(e.keyCode === 13) _submit();

			};

			nickObject || (nickObject = new NickInput(nicknameBlock, _ready, _submit));
			passwordConfirmObject || (passwordConfirmObject = new PasswordConfirmInput(passwordConfirmBlock, password, _ready, _submit));
			passwordObject || (passwordObject = new PasswordInput(passwordBlock, _ready, _submit, passwordConfirmObject));
			passwordCurrent.value = '';
			addRecipients.checked = U.rc();
			twoFactorAuth.checked = U.tfa();

		};

		_reset();

		var _showAvatar = function(show){ //avatar image

			if(show){

				I.isDesktop ? avatarImage.vis() : avatarImage.show();
				avatarDelete.show();

			}else{

				I.isDesktop ? avatarImage.invis() : avatarImage.hide();
				avatarDelete.hide();

			}

		};

		var _cropper = function(file){

			I.addStyle('croppie', I.styles['croppie']).then(function(){

				D.r([], [l[165].ucFirst(), l[164].ucFirst()], function(r){

					if(!r){

						D.h();
						cropper.destroy();
						I.removeStyle('croppie');
						return;

					}

					cropper.result({

						type: 'canvas',
						size: {width: 150, height: 150},
						format: 'jpeg',
						quality: 0.5

					}).then(function(base64){

						D.h();
						cropper.destroy();
						I.removeStyle('croppie');
						AV.set({big: base64.replace(/^.*,/, '')});
						AV.deploy({items: [avatarImage, userAvatar]});
						_showAvatar(true);
						U.netSave(['avatar']); //silent save

					});

				});

				var cropper = new Croppie(document.getElementById('cropperImage'), {

					viewport: { width: 220, height: 220 },
					boundary: { width: 220, height: 220 },
					enableOrientation: true

				});

				cropper.bind({

					url: (app ? file : URL.createObjectURL(file))

				});

				rotateUp.addEventListener('click', function(){

					cropper.rotate(90);

				});

				rotateDown.addEventListener('click', function(){

					cropper.rotate(90);

				});

			});

		};

		if(!app){

			I.fileInput();

			I.chooseFile.onchange = function(e){

				if(!e.target.files.length) return;
				_cropper(e.target.files[0]);

			};

		}

		avatarChoose.onclick = function(){

			if(app){

				(new FileSelect()).chooseImage(true).then(function(src){

					_cropper(URL.createObjectURL(new Blob([a2b(src)], {type: 'image/jpeg'})));

				});

			}else{

				I.chooseFile.value = '';
				I.chooseFile.click();

			}

		};

		avatarDelete.onclick = function(){

			_showAvatar(false);
			AV.set();
			AV.deploy({items: [avatarImage, userAvatar]});
			U.netSave(['avatar']); //silent save

		};

		if(AV.uri()){

			AV.deploy({items: [avatarImage]});
			_showAvatar(true);

		}else _showAvatar();

		if(I.isDesktop){

			var select = df.getElementById('folderSelect');
			F.domSelectItems(select, [1, 2, 4]);  //default folder
			select.value = newCurrentFolderId;

			select.onchange = function(){

				newCurrentFolderId = select.value;
				_ready();

			};

			new Chosen(select);

		}else{
			/*
			new Dropdown(df.getElementById('selectLanguage'), df.getElementById('languagesDropdown'), function(){ //select language

				return I.template('dropdown settings languages');

			}.bind(this), function(clickedElem){

				var icon = document.getElementById('languageIcon'),
						title = document.getElementById('languageTitle'),
						id = clickedElem.getAttribute('data-id');

				icon.className = 'icon icon-flag-' + id;
				title.innerHTML = clickedElem.querySelector('.lang').innerHTML;

			});
*/

			df.getElementById('defaultFolder').innerHTML = F.byId(newCurrentFolderId).title.ucFirst();

			new Dropdown(df.getElementById('folderLink'), df.getElementById('foldersList'), function(){ //default folder

				var dropdown = ''.toDOM();
				F.domDropdownItems(dropdown, [1, 2, 4, F.byId(newCurrentFolderId, true)]);
				return dropdown;

			}.bind(this), function(clickedElem){

				newCurrentFolderId = clickedElem.getAttribute('data-folder');
				document.getElementById('defaultFolder').innerHTML = F.byId(newCurrentFolderId).title.ucFirst();
				_ready();

			});

			if(app){

				new Dropdown(passCodeMode, passCodeModeList, function(){ //passCode

					var dropdown = ''.toDOM(), df, elem;

					for(var i = 0; i < 8; i++){

						df = I.template('dropdown value');
						elem = df.getElementById('title');
						elem.innerHTML = l[483 + i];
						elem.removeAttribute('id');
						df.firstChild.setAttribute('data-mode', i);
						dropdown.appendChild(df);

					}

					return dropdown;

				}.bind(this), function(clickedElem){

					var pcm = parseInt(clickedElem.getAttribute('data-mode'));
					if(pcm === U.pcm()) return;
					_TouchID(U.pcm());
					defaultPassCodeMode.setAttribute('data-mode', pcm);

					if(pcm && !U.passCode()){

						(new Passcode(self.container)).change(U.passCode()).then(function(result){

							return U.setDeviceVars({pcm: result ? pcm : 0});

						}).then(function(){

							I.changePage('settings', {effect: 'flip'});

						});

					}else{

						U.setDeviceVars({pcm: pcm, passCode: (pcm ? passCode : '')});
						self.settings();

					}

				});

				var _TouchID = function(turnOn){

					if(!app || !I.touchIdEnabled) return touchIdBlock.hide();
					turnOn = turnOn || false;
					turnOn ? touchIdBlock.show() : touchIdBlock.hide();
					touchId.checked = U.touchId();
					touchIdTitle.innerHTML = l[touchId.checked ? 537 : 538].ucFirst();

				};

				_TouchID(U.pcm());

				if(!U.pcm()){

					passCodeChangeBlock.hide();
					touchIdBlock.hide();

				}

				defaultPassCodeMode.innerHTML = l[483 + U.pcm()];
				passCode.innerHTML = U.passCode() ? l[491] : l[499];

				passCode.onclick = function(e){ //change device passcode

					e.preventDefault();
					e.stopPropagation();

					(new Passcode(self.container)).change(U.passCode()).then(function(){

						I.changePage('settings', {effect: 'flip'});

					});

				};

				touchId.onchange = function(){ //touchId

					U.setDeviceVars({touchId: this.checked});
					_TouchID(U.pcm());

				};

			}else passCodeBlock && passCodeBlock.remove();

			DOM.loader();

		}

		addRecipients.onchange = function(){ //add recipients of sent message to contacts

			_ready();

		};

		twoFactorAuth.onclick = function(){ //2-factor auth

			if(this.checked){

				self._googleAuthCodeSet().then(function(result){

					if(!result){

						twoFactorAuth.checked = false;
						return;

					}

					U.setDeviceVars({twoFactorAuth: true});

				});

			}else{

				D.m([l[39].ucFirst(), l[339].ucFirst()]);

				A.new2xFactor({disable: 1}).then(function(){

					D.h();
					U.setDeviceVars({twoFactorAuth: false});

				});

			}

		};

		btnSave.onclick = function(){

			_submit();

		};

	};

	self._deployRedactor = function(){

		if(!I.isDesktop || tinyMCE.activeEditor) return;

		tinymce.init({

			selector: 'textarea.tiny',
			menubar : false,
			statusbar : false,
			toolbar: 'undo redo | bullist numlist table | alignleft alignright aligncenter alignjustify | indent outdent forecolor backcolor charmap | styleselect fontselect fontsizeselect',
			plugins: 'legacyoutput autolink paste table lists charmap textcolor',
			paste_data_images: true,
			browser_spellcheck: true,

			setup: function(editor){
	
				editor.on('init', function(){

					editor.setContent(U.sig());

				});

				editor.on('keydown', function(e){

					if(e.ctrlKey && e.keyCode === 13) tinymce.dom.Event.cancel(e);

				});

				editor.on('keyup', function(){

					var btnSave = document.getElementById('btnSubmit');
					if(btnSave.classList.contains('error')) return;

					if(U.sig() !== this.getContent()){

						btnSave.disabled = false;
						btnSave.classList.remove('disabled');

					}

				});

			},

		});

	};

	self._initCommonLinks = function(container){

		container = container || document.body;
		var elems = container.getElementsByTagName('a'), attr;

		for(var i = elems.length - 1; i >= 0; i--){

			if(navState.anchor && (attr = elems[i].getAttribute('name')) === navState.anchor) (I.isDesktop ? document.body : document.getElementById('contentBody')).scrollTop = elems[i].getBoundingClientRect().top - (I.isDesktop ? 140 : (app ? 80 : 60));
			attr = elems[i].getAttribute('href');
			if(!attr || attr.match(/[^a-z0-9]/)) continue;

			switch(attr){

			case 'contact':

				elems[i].onclick = function(e){

					e.stopPropagation();
					e.preventDefault();
					fireEvent(document.getElementById(secureFeedbackButtonId), 'showFeedback');

				};

				break;

			case 'root':

				elems[i].onclick = function(e){

					e.preventDefault();
					I.changePage('');

				};

				break;

			default:

				elems[i].setAttribute('data-link', attr);

				elems[i].onclick = function(e){

					e.preventDefault();
					I.changePage(this.getAttribute('data-link'));

				};

				break;

			}

			elems[i].removeAttribute('href');

		}
	
	};

	self.googleAuthCode = function(){

		return new Promise(function(res){

			D.t(([l[555].ucFirst(), l[556].ucFirst() + ':']), [l[190].ucFirst(), l[164].ucFirst()], function(r){

				D.h();
				return res(r ? input.value : false);

			});

			var dialog = document.getElementById('dialog'),
				input = dialog.getElementById('inputValue'),
				btnSubmit = dialog.getElementById('btnSubmit');

			input.oninput = function(){

				btnSubmit.disabled = !(this.value.length === 6 && isInteger(this.value));

			};

			input.catchEnter(function(){

				if(btnSubmit.disabled) return;
				btnSubmit.click();

			});

		});

	};

	self._googleAuthCodeSet = function(){

		return new Promise(function(res){

			D.a(function(result){

				D.h();
				if(!result) return res(false);

			});

			var twoFactorImage = document.getElementById('twoFactorImage'),
				twoFactorCode = document.getElementById('twoFactorCode'),
				btnSubmit = dialog.getElementById('btnSubmit'),
				twoFactorCheckCode = dialog.getElementById('twoFactorCheckCode'),
				popupLoading = dialog.getElementById('popupLoading'),
				errorHint = dialog.getElementById('errorHint');

			I.isDesktop && twoFactorCheckCode.focus();

			var _check = function(secret, check){

				A.new2xFactor({secret: secret, check: check}).then(function(result){

					if(result.correct){

						D.h();
						D.ac();
						twoFactorCode = document.getElementById('twoFactorCode'),
						twoFactorCode.innerHTML = secret.saparate4(' ');

						new LongTouch(twoFactorCode, function(){

							I.copyTextToClipboard(twoFactorCode.innerHTML, l[565]);

						});

						res(true);

					}else{

						I.isDesktop ? twoFactorCheckCode.classList.add('invalid') : errorHint.innerHTML = l[326];
						btnSubmit.disabled = true;
						twoFactorCheckCode.value = '';
						twoFactorCheckCode.focus();

					}

				});

			};

			new LongTouch(twoFactorCode, function(){

				I.copyTextToClipboard(twoFactorCode.innerHTML, l[565]);

			});

			A.new2xFactor({email: U.email()}).then(function(result){

				twoFactorCode.innerHTML = result.secret.saparate4(' ');
				twoFactorImage.src = URL.createObjectURL(new Blob([a2b(result.qr)], {type: 'image/png'}));
				popupLoading.classList.remove('loading');

				twoFactorCheckCode.oninput = function(){

					btnSubmit.disabled = !(this.value.length === 6 && isInteger(this.value));
					errorHint && (errorHint.innerHTML = '');

				};

				btnSubmit.onclick = function(){

					_check(result.secret, parseInt(twoFactorCheckCode.value));

				};

				twoFactorCheckCode.catchEnter(function(){

					if(btnSubmit.disabled) return;
					btnSubmit.click();

				});

			}).catch(function(){

				D.i([l[50].ucFirst(), l[6].ucFirst()], [l[0].ucFirst()]);

			});

		});

	};

	self.appSetUnread = function(count){

		if(I.isDesktop) return;
		app && P.setBadgeNumber(count);
		var elem = document.getElementById('newMessagesLabel');
		if(!elem) return;
		count ? elem.show() : elem.hide();
		elem.innerHTML = count;

	};

}