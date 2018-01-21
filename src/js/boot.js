'use strict';

var secureFeedbackButtonId = 'secureFeedback',

	config = {

		version: '1.7.2',
		domain: 'safe.ad',
		api_url: 'https://api.safe.ad/',
		files_url: 'https://files.safe.ad/',
						debug: false,
		heartbeatTimeout: 30,
		erid: 'v1%2B8DuDfns0AIopkTXWN3kc%2Fj6jrw7pB4rXk%2BPxinlw81rgWUFv12E0TGhZktjmp',

	},

	bootLoader = function(){

		var applicationCacheEnabled = document.documentElement.getAttribute('manifest') && typeof applicationCache === 'object';

		try{

		// Safari private browsing detection hack

			localStorage.privateBrowsing = '';
			
		}catch(e){

		// Safari private browsing fallback

			applicationCacheEnabled = false;

		}

		window.addEventListener('DOMContentLoaded', function(){

			bootLoader.initialize(document.getElementById('loader'), {

				notEmbedded: 2,

				embedScripts: [

					'/js/safe.min.js',
					'/js/tinymce/tinymce.min.js',

				]

			});

		});

		var initComplete = false,
			loadComplete = false,
			cacheComplete = false,
			embedComplete = false,
			loaded = 0,
			notEmbedded = 0,
			total = 0,
			element,
			progressText,
			progressBar,
			fallbackTimer,
			embedScripts;

		function onLoad(){

			loadComplete = true;
			if(!applicationCacheEnabled || cacheComplete) embedStuff();
			renderProgress();

		}

		function embedStuff(){

			if(embedComplete) return;

			var onElementError = function(e){

				alert('Loading resource failed:\n' + (e.target.getAttribute('src') || e.target.getAttribute('href')));

			};

			var install = function(){

				text('installing libraries');

				if(embedScripts.length){

					createElement('script', {type: 'text/javascript', 'src': embedScripts.shift()}, 'head', function(){

						renderProgress(++loaded);
						install();

					}, onElementError);

				}else{

					embedComplete = true;
					loaded = total;
					renderProgress();
					text('initializing session');
					/* global  init */
					init();

				}

			};

			install();
      
		}

		// Firefox private browsing fallback

		function onFallbackTimeout(){

			applicationCacheEnabled = false;
			total = embedScripts.length;
			loadComplete && embedStuff();
			renderProgress();

		}

		function onChecking(){

			clearTimeout(fallbackTimer);
			loaded = 0;
			total = 1 + notEmbedded + (!embedComplete ? embedScripts.length : 0) * 2;
			renderProgress();

		}

		function onDownloading(){

			cacheComplete = false;
			progress();

		}

		function onProgress(){

			loaded++;
			renderProgress();

		}

		function renderProgress(){

			var percentage = 100;
			if(!total) return;
			percentage = Math.min(100, Math.round((loaded / total) * 100));
			progress(percentage);

		}

		function onCached(){

			cacheComplete = true;
			checkStatus() && loadComplete && embedStuff();

		}

		function onNoupdate(){

			clearTimeout(fallbackTimer);
			total -= notEmbedded;
			loaded++;
			checkStatus() && loadComplete && embedStuff();
			renderProgress();

		}

		function onError(){

			alert('Loading application cache failed');

		}

		function checkStatus(){

			if(applicationCache.status !== applicationCache.UPDATEREADY) return true;

			try{

				applicationCache.swapCache();
				location.reload();
				return true;

			}catch(e){

				console.warn(e);
				return false;

			}

		}

		function initialize(el, options){

			if(initComplete) throw new Error('Double initialization attempt');
			if(!(el instanceof Element)) throw new ReferenceError('DOM element required');

			options = options || {};
			element = el,
			progressText = document.getElementById('loaderMessage');
			progressBar = document.getElementById('bootProgress');
			text('loading libraries');
			embedScripts = options.embedScripts || [],
			notEmbedded  = options.notEmbedded;
			window.addEventListener('load', onLoad);

			if(applicationCacheEnabled){

				applicationCache.addEventListener('checking', onChecking);
				applicationCache.addEventListener('downloading', onDownloading);
				applicationCache.addEventListener('progress', onProgress);
				applicationCache.addEventListener('cached', onCached);
				applicationCache.addEventListener('updateready', onCached);
				applicationCache.addEventListener('noupdate', onNoupdate);
				applicationCache.addEventListener('error', onError);

				// Firefox private browsing detection hack

				fallbackTimer = setTimeout(onFallbackTimeout, 100);

			}

			initComplete = true;

		}

		function text(val){

			if(progressText.innerHTML === val) return;
			progressText.innerHTML = val;

		}

		function progress(val){

			progressBar.className = val ? 'progress progress-width' + val : 'progress progress-width0';

		}

		function remove(){

			var elem = document.getElementById('loader');
			elem && elem.remove();

		}

		return{

			initialize: initialize,
			element: element,
			remove: remove,
			text: text,
			progress: progress,

		};

	},

	client = {

		userAgent: window.navigator.userAgent.toLowerCase(),
		tele: ['googletv', 'viera', 'smarttv', 'internet.tv', 'netcast', 'nettv', 'appletv', 'boxee', 'kylo', 'roku', 'dlnadoc', 'roku', 'pov_tv', 'hbbtv', 'ce-html'],
		macos: function(){ return this.matchUA('mac'); },
		ios: function(){ return this.iphone() || this.ipod() || this.ipad(); },
		iphone: function(){ return !this.windows() && this.matchUA('iphone'); },
		ipod: function(){ return this.matchUA('ipod'); },
		ipad: function(){ return this.matchUA('ipad'); },
		android: function(){ return !this.windows() && this.matchUA('android'); },
		androidPhone: function(){ return this.android() && this.matchUA('mobile'); },
		androidTablet: function(){ return this.android() && !this.matchUA('mobile'); },
		blackberry: function(){ return this.matchUA('blackberry') || this.matchUA('bb10') || this.matchUA('rim'); },
		blackberryPhone: function(){ return this.blackberry() && !this.matchUA('tablet'); },
		blackberryTablet: function(){ return this.blackberry() && this.matchUA('tablet'); },
		windows: function(){ return this.matchUA('windows'); },
		windowsPhone: function(){ return this.windows() && this.matchUA('phone'); },
		windowsTablet: function(){ return this.windows() && (this.matchUA('touch') && !this.windowsPhone()); },
		fxos: function(){ return (this.matchUA('(mobile') || this.matchUA('(tablet')) && this.matchUA(' rv:'); },
		fxosPhone: function(){ return this.fxos() && this.matchUA('mobile'); },
		fxosTablet: function(){ return this.fxos() && this.matchUA('tablet'); },
		meego: function(){ return this.matchUA('meego'); },
		cordova: function(){ return window.cordova && location.protocol === 'file:'; },
		nodeWebkit: function(){ return typeof window.process === 'object'; },
		mobile: function(){ return(this.androidPhone() || this.iphone() || this.ipod() || this.windowsPhone() || this.blackberryPhone() || this.fxosPhone() || this.meego()); },
		tablet: function(){ return(this.ipad() || this.androidTablet() || this.blackberryTablet() || this.windowsTablet() || this.fxosTablet()); },
		desktop: function(){ return !this.tablet() && !this.mobile(); },
		isTele: function(){ var i = 0; while (i < this.tele.length){ if(this.matchUA(this.tele[i])){ return true; } i++; } return false; },
		msie: function(){ return this.matchUA('trident') || this.matchUA('msie'); },
		iosChrome: function(){ return this.ios() && this.matchUA('crios'); },
		matchUA: function(val){ return this.userAgent.indexOf(val) !== -1;  }

	};

(function(){

	var landURIs = ['/ico', '/mail'],

		appLauncher = {

			launch: function(){

				//			for(var i in landURIs) window.location.replace
				window.location.replace('safe://');
				this.timer = setTimeout(this.openWebApp, 1000);

			},

			openWeb: function(){

				if(confirm('Do you wish to install application?')) window.location.replace('https://itunes.apple.com/ru/app/safe-secure-email-encrypted-file-storage/id1174360802?l=en&mt=8');

			}

		};

	bootLoader = new bootLoader();
	(landURIs.indexOf(window.location.pathname.replace(/\/?$/, '')) < 0) && !config.debug && client.ios() && appLauncher.launch();

})();

function createElement(el, attrs, target, onLoad, onError){

	el = document.createElement(el);
	if(attrs) for(var a in attrs) el.setAttribute(a, '' + attrs[a]);
	onLoad && (el.onload = function(){ onLoad(el);	});
	onError && (el.onerror = function(){ onError(el); });

	if(target){

		if(typeof target === 'string') target = document[target] || document.getElementsByTagName(target)[0];
		target && target.appendChild(el);

	}

	return el;

}

function DEBUG(){

	config.debug && console.log.apply(console, arguments);

}

function DEBUG_ERR(){

	config.debug && console.error.apply(console, arguments);

}

function DEBUG_WARN(){

	console.warn.apply(console, arguments);

}
