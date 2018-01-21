'use strict';

var MessageBody = function(container, html, cb, params){

	params = params || {};
	var HTMLparts, body, i;
	this._cb = cb;
	this._initialized = false;
	this._container = container;
	this._innerContainer = container.firstChild;
	this._container.style.height = '1px';
	this._container.style.width = '100%';
	this._scale = 1;
	if(!html) return this._cb();
	HTMLparts = getHTMLParts(html);

	for(i in params.search){ //mark found elements

		HTMLparts.body = HTMLparts.body.replace(new RegExp('>[^<]*(' + params.search[i] + ')', 'img'), function(match, contents){

			return match.replace(contents, '<span style="color:red;border-bottom:thin dotted red">' + contents + '</span>');

		});

	}

	I.isDesktop || (HTMLparts.body = phonesToLinks(HTMLparts.body));
	HTMLparts.body = URLsToLinks(HTMLparts.body);
	HTMLparts.body = emailsToLinks(HTMLparts.body);
	params.editable && (HTMLparts.bodyAttrs['contenteditable'] = 'true');
	HTMLparts.body.match(/\sstyle=/i) || HTMLparts.body.match(/<style[^>]*>/i) || HTMLparts.header.match(/<style[^>]*>/i) || (HTMLparts.body = styleMessage(HTMLparts.body)); //not styled letter
	body = HTMLparts.body;
	HTMLparts.body = '';
	var iframeParams = {id: 'bodyIframe', src: client.msie() ? 'about:blank' : URL.createObjectURL(new Blob([implodeHTMLParts(HTMLparts, '<meta name="viewport" content="width=device-width, initial-scale=2, maximum-scale=3, user-scalable=yes" />', '')], {type: 'text/html'}))};
	common.contentSecurityPolicy || (iframeParams['sandbox'] = 'allow-same-origin');

	createElement('iframe', iframeParams, this._innerContainer, function(iframe){

		if(iframe.allLoaded) return false;
		this._iframe = iframe;
		this._iWindow = this._iframe.contentWindow;
		this._iDoc = this._iWindow.document;
		this._iHTML = this._iWindow.document.documentElement;

		if(client.msie() && !iframe.headLoaded){

			this._iframe.headLoaded = true;
			var myiframedoc = this._iWindow.document.open('text/html', 'replace');
			myiframedoc.write(implodeHTMLParts(HTMLparts, '', ''));
			myiframedoc.close();
			return false;

		}

		iframe.allLoaded = true;
		this._iDoc.body.style.margin = '0';
		this._iDoc.body.style.padding = '0';
		this._iDoc.body.style['-webkit-text-size-adjust'] = 'none';
		this._iDoc.body.style['overflow'] = 'hidden';
		this._iDoc.body.innerHTML = body;
		this._iWindow.onresize = this._onIframeResize.bind(this);
		this._swipes();
		this._gestures();
		this._catchImagesHeight();
		this._assignLinkClick(this._iDoc.body.getElementsByTagName('A'));
		this._assignLinkClick(this._iDoc.body.getElementsByTagName('AREA'));
		this._iWindow.dispatchEvent(new CustomEvent('resize', {detail: true}));

	}.bind(this));

};

MessageBody.prototype._onIframeResize = function(e){
	
	if(this._containerOriginalWidth === this._container.offsetWidth) return;
	this._zoomCoeff = 1;
	this._rotation = !e.detail;
	this._containerOriginalWidth = this._container.offsetWidth;
	//this._container.style.width = this._containerOriginalWidth + 'px';
	this._container.style.height = '1px';
	this._innerContainer.style.height = '1px';
	this._innerContainer.style.width = '100%';
	this._iframeOriginalWidth || (this._iframeOriginalWidth = this._containerOriginalWidth);
	this._innerContainer.style['-webkit-transform'] = null;
	this._innerContainer.style.transformOrigin = null;

	setTimeout(function(){

		this._initialized = true;

		if(!this._fitToPage()){

			this._innerContainer.style.width = I.isDesktop ? '100%' : (600 / this._containerOriginalWidth) * 100 + '%';
			this._fitToPage(true);

		}

	}.bind(this), 100);

};

MessageBody.prototype._fitToPage = function(resize){

	resize = resize || false;
	var maxWidth = 0, body = this._iDoc.body, res = true;

	for(var i = body.childNodes.length - 1; i >= 0 ; i--){

		if(!body.childNodes[i].tagName) continue;
		maxWidth = Math.max(maxWidth, body.childNodes[i].clientWidth);

	}

	if(maxWidth > this._containerOriginalWidth){

		res = false;

		if(resize){

			this._zoomCoeff = this._containerOriginalWidth / maxWidth;
			this._iWindow.onresize = null;
			this._innerContainer.style['-webkit-transform'] = 'scale(' + Math.floor((this._zoomCoeff) * 100) / 100 + ')';
			this._innerContainer.style.transformOrigin = '0 0';

		}

	}

	(res || resize) && this._setHeight();
	return res;

};

MessageBody.prototype._setHeight = function(){

	if(!this._initialized || !this._iWindow) return;

	setTimeout(function(){

		var maxHeight = Math.max(this._iDoc.body.scrollHeight, this._iDoc.body.offsetHeight, this._iDoc.body.clientHeight, this._iHTML.clientHeight, this._iHTML.scrollHeight, this._iHTML.offsetHeight);
		this._innerContainer.style.height = maxHeight + 'px';
		this._innerContainer.style.width = ((Math.floor(this._containerOriginalWidth / (Math.floor((this._zoomCoeff) * 100) / 100)) / this._containerOriginalWidth) * 100) + '%';
		this._iWindow.onresize = this._onIframeResize.bind(this);
		this._cb(Math.floor(maxHeight * this._zoomCoeff), this._rotation);

	}.bind(this), 50);

};

MessageBody.prototype._catchImagesHeight = function(){

	var elements = this._iDoc.body.getElementsByTagName('IMG');

	for(var i in elements) if(elements[i].tagName){

		elements[i].onload = function(){

			this._setHeight();

		}.bind(this);

		elements[i].onerror = function(e){

			e.target.parentElement.removeChild(e.target);
			this._setHeight();

		}.bind(this);

	}

};

MessageBody.prototype.combineHTML = function(params){

	params = params || {};
	var head = this._iDoc.head.cloneNode(true);

	for(var i = head.childNodes.length - 1; i >= 0 ; i--){

		if(!head.childNodes[i].tagName) continue;
		head.childNodes[i].getAttribute('data-temp') && head.childNodes[i].parentElement.removeChild(head.childNodes[i]);

	}

	var body = this._iDoc.body.cloneNode(true);	
	body.removeAttribute('contenteditable');
	params.addToBody && body.insertAdjacentHTML('afterbegin', params.addToBody);
	return params.bodyInner ? body.innerHTML : '<!DOCTYPE HTML><html>' + head.outerHTML + body.outerHTML + '</html>';

};

MessageBody.prototype._swipes = function(){

	this._iDoc.addEventListener('touchstart', function(e){

		I.closeAllAnimated();
		var event = document.createEvent('Event');
		event.initEvent('touchstart', true, true);
		event.changedTouches = e.changedTouches;
		document.getElementById('mainBlock').dispatchEvent(event);

	}.bind(this));

	this._iDoc.addEventListener('touchmove', function(e){

		var event = document.createEvent('Event');
		event.initEvent('touchmove', true, true);
		event.changedTouches = e.changedTouches;
		document.getElementById('mainBlock').dispatchEvent(event);

	}.bind(this));

	this._iDoc.addEventListener('touchend', function(){

		var event = document.createEvent('Event');
		event.initEvent('touchend', true, true);
		document.getElementById('mainBlock').dispatchEvent(event);

	}.bind(this));

};

MessageBody.prototype._assignLinkClick = function(elements){

	for(var i in elements){

		elements[i].tagName && (elements[i].onclick = function(e){

			e.preventDefault();
			e.stopPropagation();
			if(!this.href) return false;
			if(this.href.match(/^\s*mailto:\s*/i)) return W.new([this.href.replace(/^\s*mailto:\s*/i, '')]);

			if(app){

				if(this.href.indexOf('http://') < 0 && this.href.indexOf('https://') < 0) return cordova.InAppBrowser.open(this.href, '_system');
				I.inAppBrowser = cordova.InAppBrowser.open(this.href, '_blank', 'location=yes,closebuttoncaption=Close,enableViewportScale=yes,allowInlineMediaPlayback=yes,transitionstyle=fliphorizontal,clearcache=yes,clearsessioncache=yes');
				I.inAppBrowser.addEventListener('exit', function(){ I.inAppBrowser = null; });

			}else window.open(this.href, '_blank');

		});

	}

};

MessageBody.prototype._gestures = function(){

	//waiting for iframe viewport independant scaling, currently not implemented in webkit :(

	/*
	this._iDoc.body.addEventListener('gesturestart', function(e){

		this._gestureInProgress = true;
		this._gestureClientX = e.clientX;
		this._gestureClientY = e.clientY;
		DEBUG_ERR('gesturestart ', e.clientX, e.screenX);
		e.preventDefault();

	}.bind(this));

	this._iDoc.body.addEventListener('gesturechange', function(e){

		e.preventDefault();
		//this._scale = e.scale;

		var coeff = Math.abs(1 - e.scale) / 100;
		var scaleIframe = coeff * 100;
		this._currentScale = e.scale > 1 ? this._currentScale + coeff : this._currentScale - coeff;
		this._currentScale < 1 && (this._currentScale = 1);
		this._currentScale > 2 && (this._currentScale = 2);
		this._currentScaleIframe = e.scale > 1 ? this._currentScaleIframe + scaleIframe : this._currentScaleIframe - scaleIframe;
		this._currentScaleIframe < 1 && (this._currentScaleIframe = 1);
		this._currentScaleIframe > 4 && (this._currentScaleIframe = 4);
		this._iDoc.body.style['-webkit-transform'] = 'scale(' + this._currentScale + ')';
		this._iDoc.body.style.transformOrigin = '0 0';
		this._iframe.style.width = this._iframeOriginalWidth * (this._currentScaleIframe) + 'px';
		
	}.bind(this));

	this._iDoc.body.addEventListener('gestureend', function(e){

		this._gestureInProgress = false;
		this._currentScale = this._currentScale * this._scale;
		e.preventDefault();

	});
	*/

};