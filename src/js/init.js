'use strict';

function init(){

	cspCheck();
	var pos = window.location.pathname.indexOf('/www/');
	config.appPath = pos >= 0 ? window.location.pathname.substr(0, pos + 5) : '/';

	N = new Network();
	A = new Api(config.api_url);
	AF = new AnimationFactory();
	Z = new cFileExtensions();
	D = new Dialogs();
	DOM = new cDOM();
	I = new cInterface();
	U = new cUser();
	E = new cEmails();
	FS = new cFiles();
	W = new cCompose();
	AV = new cAvatars();

	Promise.all([

		I.loadFile('/html/templates.html'),
		U.langChange('en')

	]).then(function(results){

		I.initTemplates(results[0]); //initialize templates
		app && I.appInit();
		return I.restore(); //restore interface

	}).then(function(){

		return I.environment();

	}).then(function(){

		return checkBrowser();

	}).then(function(){

		return U.init();

	}).then(function(){

		config.initialized = true;
		var uri = app && app.deepLink ? app.deepLink : window.location.pathname;
		app && (app.deepLink = '');
		prepareUTM();

		if(app && U.access(1) && [config.appPath, config.appPath + 'index.html'].indexOf(uri) >= 0){

			later(function(){

				window.plugins.toast.showShortTop(l[541].ucFirst() + ' ' + U.email());

			});

			I.changePage('inbox/0', {effect: 'flipup'});

		}else I.changePage(uri, {effect: 'fade'});

	}).catch(function(e){

		I.e('Initialization', e);

	});

	window.onresize = function(){I.onWindowResize();};

	window.onscroll = function(){

		DOM.adaptiveHeader();

	};

	window.onbeforeunload = function(){

		if(FS.unfinished()) return l[414]; //check current actions

	};

}

function checkBrowser(){

	return new Promise(function(res, rej){

		if(

			!history.pushState ||
			typeof CryptoKey !== 'function' ||
			typeof crypto.getRandomValues !== 'function'

		) return rej(new Error(l[415]));

		res(); //compatible browser

	});

}

function cspCheck(){

	var injection = document.createElement('script');
	injection.innerHTML = 'common.contentSecurityPolicy = false';

	try{

		DEBUG_WARN('The error above is a good news - your browser is XSS protected by CSP!');
		document.head.appendChild(injection);
		document.head.removeChild(injection);
	
	}finally{

		console.log('Content-Security-Policy: ' + (common.contentSecurityPolicy ? 'enabled' : 'disabled'));

	}

}