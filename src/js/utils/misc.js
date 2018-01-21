'use strict';

window.animationFrame = (function(){

	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

})();

function randomColor(shift){

	return (Math.floor(Math.random() * (256 - shift)) + shift).toString(16) + (Math.floor(Math.random() * (256 - shift)) + shift).toString(16) + (Math.floor(Math.random() * (256 - shift)) + shift).toString(16);

}

function disableInputs(container){

	container = container || document;
	var nodes = container.getElementsByTagName('INPUT');
	for(var i = 0; i < nodes.length - 1; i++) nodes[i].tagName && (nodes[i].disabled = true);

}

function enableInputs(container){

	container = container || document;
	var nodes = container.getElementsByTagName('INPUT');
	for(var i = 0; i < nodes.length - 1; i++) nodes[i].tagName && (nodes[i].disabled = false);

}

function e2s(aesPacket){

	return b2a(msgpack.pack([aesPacket.v, aesPacket.iv, aesPacket.data, aesPacket.tag]));

}

function s2e(strPacket){

	var packet = msgpack.unpack(a2b(strPacket));
	return {v: packet[0], iv: packet[1], data: packet[2], tag: packet[3]};

}

function addrInternal(address){

	address = address.trim().toLowerCase();
	var pos = address.indexOf('@' + config.domain);
	return pos > 0 && address.length - config.domain.length - 1 === pos ? address.substring(0, pos) : address;

}

function addrReal(address){

	if(!address) return '';
	return address.indexOf('@') >= 0 ? address : address + '@' + config.domain;

}

function addrIsInternal(v){

	if(!v) return false;
	return v.indexOf('@') < 0;

}

function objectIsEmpty(obj){

	for(var i in obj) if(obj.hasOwnProperty(i)) return false;
	return true;

}

function objectFirstKey(obj){

	for(var i in obj) if(obj.hasOwnProperty(i)) return i;
	return null;

}

function clearTags(text){

	if(!text) return '';
	return text.replace(/<[^>]*(>|$)/g, ' ').replace(/&\S{2,5};/mg, '').replace(/\s+\n\s+/mg, '\n').trim();

}

function clearTagsContent(html, tagsToCut){

	var i, regex;

	for(i in tagsToCut){

		regex = new RegExp('\\<' + tagsToCut[i] + '[^\\>]*\\>[\\s\\S]*?\\<\\s*\\/' + tagsToCut[i] + '\\>', 'gi');
		html = html.replace(regex, '');

	}

	return html;

}

function s2uuid(v){

	return v.substr(0, 8) + '-' + v.substr(8, 4) + '-' + v.substr(12, 4) + '-' + v.substr(16, 4) + '-' + v.substr(20, 12);

}

function checkEmail(val){

	var filter = /^([a-z0-9]([a-z0-9_.\-+'=])*)?[a-z0-9]@[a-z0-9][a-z0-9\-.]*[a-z0-9]\.[a-z]{2,7}$/;
	return filter.test(val);

}

function strIsFloat(val){

	var filter = /^\d[\d.,]*$/;
	return filter.test(val);

}

function checkEmailLogin(val){

	var filter = /^[a-z0-9][a-z0-9_.\-+']*[a-z0-9]$/;
	return filter.test(val);

}

function safeBracket(text){

	if(!text) return '';
	return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

}

function arrayIndex(arr, lo, hi, value){

	if(arr.length === 0) return [1, 0];
	var i = lo + Math.floor((hi - lo) / 2), test_value = arr[i];

	if(test_value > value){

		hi = i - 1;
		return hi >= lo ? arrayIndex(arr, lo, hi, value) : [1, lo];

	}else if(test_value < value){

		lo = i + 1;
		return hi >= lo ? arrayIndex(arr, lo, hi, value) : [1, lo];

	}else return [0, i];

}

function arrayIndexProperty(arr, lo, hi, value, prop){

	if(arr.length === 0) return [1, 0];
	var i = lo + Math.floor((hi - lo) / 2), test_value = arr[i][prop];

	if(test_value > value){

		hi = i - 1;
		return hi >= lo ? arrayIndexProperty(arr, lo, hi, value, prop) : [1, lo];

	}else if(test_value < value){

		lo = i + 1;
		return hi >= lo ? arrayIndexProperty(arr, lo, hi, value, prop) : [1, lo];

	}else return [0, i];

}

function arrayIndexPropertyInverse(arr, lo, hi, value, prop){

	if(arr.length === 0) return [1, 0];
	var i = lo + Math.floor((hi - lo) / 2), test_value = arr[i][prop];

	if(test_value < value){

		hi = i - 1;
		return hi >= lo ? arrayIndexPropertyInverse(arr, lo, hi, value, prop) : [1, lo];

	}else if(test_value > value){

		lo = i + 1;
		return hi >= lo ? arrayIndexPropertyInverse(arr, lo, hi, value, prop) : [1, lo];

	}else return [0, i];

}

function bytesToSize(bytes){

	var sizes = ['Bytes', 'Kb', 'Mb', 'Gb', 'Tb'];
	if(bytes === 0) return '0 Bytes';
	if(bytes === 1) return '1 Byte';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes * 10 / Math.pow(1024, i), 2) / 10 + ' ' + sizes[i];

}

function generateString(len, lower, upper, digits){

	len = len || 10;
	lower = lower || true;
	upper = upper || false;
	digits = digits || false;
	var res = '';
	var g = [];
	var l = ['a','b','c','d','e','f','g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
	var u = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];
	var d = ['1','2','3','4','5','6','7','8','9'];
	lower && (g = g.concat(l));
	upper && (g = g.concat(u));
	digits && (g = g.concat(d));
	for(var i = 0; i < len; i++) res += g[Math.floor(Math.random() * g.length)];
	return res;

}

function newUuid(){

	var res = b2x(crypto.getRandomValues(new Uint8Array(16)));
	return res.substr(0, 8) + '-' + res.substr(8, 4) + '-' + res.substr(12, 4) + '-' + res.substr(16, 4) + '-' + res.substr(20, 12);

}

window.saveAs || ( window.saveAs = (window.navigator.msSaveBlob ? function(b,n){ return window.navigator.msSaveBlob(b,n); } : false) || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs || (function(){

	window.URL || (window.URL = window.webkitURL);
	if(!window.URL) return false;
	return function(blob, name){

		var a, ce, url = URL.createObjectURL(blob);

		if('download' in document.createElement('a')){

			a = document.createElement('a');
			a.setAttribute('href', url);
			a.setAttribute('download', name);
			ce = document.createEvent('MouseEvent');
			ce.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(ce);

		}else{

			window.open(url, '_blank', '');

		}

	};

})());

function later(cb, p1){

	setTimeout(cb, 1000, p1);

}

function soon(cb, p1){

	setTimeout(cb, 20, p1);

}

function hasScrollBar(){

	var root = document.compatMode === 'BackCompat'? document.body : document.documentElement;
	return root.scrollHeight > root.clientHeight;

}

function clone(object){

	var res, i;

	if(object instanceof Date){

		res = new Date();
		res.setTime(object.getTime());

	}else if(typeof object === 'string' || typeof object === 'number'){

		res = object;

	}else if(object instanceof Array){

		res = [];
		for(i = 0; i < object.length; i++) res[i] = clone(object[i]);

	}else if(object instanceof Object){

		res = {};
		for(i in object) if(object.hasOwnProperty(i)) res[i] = clone(object[i]);

	}

	return res;

}

function lastObjectKey(object){

	var keys = Object.keys(object);
	return keys[keys.length - 1];

}

function isInteger(str){

	if(typeof str === 'number') return true;
	return typeof str === 'string' ? !str.match(/\D/) : false;

}

function preventDefault(e){

	e = e || window.event;
	e.preventDefault && e.preventDefault();
	e.returnValue = false;  

}
	
function disableScroll(){

	var elem = document.getElementById('mainBlock');
	elem && (elem.ontouchmove = preventDefault);
	
}
	
function enableScroll(){

	var elem = document.getElementById('mainBlock');
	elem && (elem.ontouchmove = null);

}

function fireEvent(element, event){

	var evt;

	if(document.createEventObject){

		evt = document.createEventObject();
		return element.fireEvent('on' + event, evt);

	}else{

		evt = document.createEvent('HTMLEvents');
		evt.initEvent(event, true, true);
		return !element.dispatchEvent(evt);

	}

}

function monthDiff(d1, d2){

	var months = (d2.getFullYear() - d1.getFullYear()) * 12;
	months -= d1.getMonth() + 1;
	months += d2.getMonth();
	return months <= 0 ? 0 : months;

}


function stringToAESKeys(val){

	return crypto.subtle.digest('SHA-384', u2b(val)).then(function(hash){

		hash = new Uint8Array(hash);

		return Promise.all([

			crypto.subtle.importKey('raw', hash.subarray(0, Ciphering.ENC.alg.length >> 3), Ciphering.ENC.alg, Ciphering.ENC.ext, Ciphering.ENC.use),
			crypto.subtle.importKey('raw', hash.subarray(Ciphering.ENC.alg.length >> 3), Ciphering.MAC.alg, Ciphering.MAC.ext, Ciphering.MAC.use),

		]);

	});

}

function readToArrayBuffer(source){

	return new Promise(function(res, rej){

		if(!(source instanceof Blob) && !(source instanceof File)) return rej();
		var reader = new FileReader();

		reader.onerror = function(){

			rej(l[449]);

		};

		reader.onabort = rej;

		reader.onload = function(){

			res(this.result);

		};

		reader.readAsArrayBuffer(source);

	});

}

function setHeight(container, elem){

	var height = elem.offsetHeight;

	if(height > 1){

		elem.style.height = '1px';

	}else{

		var clonedEl = elem.cloneNode(true);
		clonedEl.style.position = 'absolute';
		clonedEl.style.left = '-1000px';
		clonedEl.style.visibility = 'hidden';
		clonedEl.style.height = 'auto';
		container.appendChild(clonedEl);
		var newHeight = clonedEl.offsetHeight;
		clonedEl.parentNode.removeChild(clonedEl);
		elem.style.height = newHeight + 'px';

	}

}

function expireSoon(time){

	return Math.floor(time / 3600) < 168;

}

function expire24Hours(time){

	return Math.floor(time / 3600) < 24;

}

function timeDiff(time1, time2){

	var _getDays = function(month, year){

		if([0, 2, 4, 6, 7, 9, 11].indexOf(month) >= 0) return 31;
		if([3, 5, 8, 10].indexOf(month) >= 0) return 30;
		if(month === 1 && ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)) return 29;
		if(month === 1 && ((year % 4 !== 0) || (year % 100 === 0))) return 28;

	};

	var bDay = time1.getDate(),
		bMonth = time1.getMonth(),
		bYear = time1.getFullYear(),
		eDay = time2.getDate() + 1,
		eMonth = time2.getMonth(),
		eYear = time2.getFullYear(),
		eDays = _getDays(eMonth),
		bDays = _getDays(bMonth),
		firstMonthDiff = bDays - bDay + 1;

	if(eDay - bDay < 0){

		eMonth--;
		eDay += eDays;

	}

	var daysDiff = eDay - bDay;

	if(eMonth - bMonth < 0){

		eYear--;
		eMonth += 12;

	}

	var monthDiff = eMonth - bMonth,
		yearDiff = eYear - bYear;

	if(daysDiff === eDays){

		daysDiff = 0;
		monthDiff++;

		if(monthDiff === 12){

			monthDiff = 0;
			yearDiff++;

		}

	}

	firstMonthDiff !== bDays && --eDay === eDays && (daysDiff = firstMonthDiff);
	return { years: yearDiff, months: monthDiff, days: --daysDiff };

}

function timeDiffDaysHourMin(timeDiffInSeconds){
	
	var d, h, m, s;
	s = Math.floor(timeDiffInSeconds / 1000);
	m = Math.floor(s / 60);
	s = s % 60;
	h = Math.floor(m / 60);
	m = m % 60;
	d = Math.floor(h / 24);
	h = h % 24;
	return { d: d, h: h, m: m, s: s };

}

function generateColor(shift){

	return (Math.floor(Math.random() * (256 - shift)) + shift).toString(16) + (Math.floor(Math.random() * (256 - shift)) + shift).toString(16) + (Math.floor(Math.random() * (256 - shift)) + shift).toString(16);

}

function attributesFromString(input){

	var name, val, attrs = [], tmp, pos, i;
	tmp = input.trim().split(' ');

	for(i = 0; i < tmp.length; i++){

		pos = tmp[i].indexOf('=');
		
		if(pos <= 0){
			
			attrs[tmp[i]] = '';
			continue;

		}

		name = tmp[i].substr(0, pos);
		val = tmp[i].substr(pos + 1);

		if(
			(val[0] === '\'' && val[val.length - 1] === '\'') ||
			(val[0] === '"' && val[val.length - 1] === '"')
		) val = val.substr(1, val.length - 2);

		attrs[name.trim()] = val.trim();
		
	}

	return attrs;

}

function getHTMLParts(html){

	var res = {

		preHeader: '',
		header: '',
		body: '',
		bodyAttrs: [],
		headAttrs: [],

	};

	html = html.trim();

	if(!((html.match(/<html/i) || html.match(/<head/i) || html.match(/<body/i) || html.match(/src=/i)))){

		res.body = html;
		return res;

	}

	res.header = html.match(/<head([^>]*)>([\s\S]*?)(<(\/head|body)[^>]*>)/i) || '';

	if(res.header){

		res.preHeader = html.substr(0, res.header.index);
		res.header[1] && (res.headAttrs = attributesFromString(res.header[1]));
		html = html.substr(res.preHeader.length + res.header[0].length - (res.header[0].match(/<\/head>$/i) ? 0 : res.header[3].length));
		res.header = res.header[2].trim();

	}

	res.body = html.match(/<body([^>]*)>([\s\S]+)$/i);

	if(res.body){

		!res.header && res.body.index && (res.preHeader = html.substr(0, res.body.index));
		res.body[1] && (res.bodyAttrs = attributesFromString(res.body[1]));
		res.body = res.body[2];
		var regMatch = res.body.match(/<\/body>/i);
		regMatch === null || (res.body = res.body.substr(0, regMatch.index));

	}else res.body = html;

	res.preHeader = res.preHeader.replace(/<!doctype[^>]*>/gi, '').replace(/<html[^>]*>/gi, '');
	res.header = res.header.trim();
	res.body = res.preHeader.trim() + res.body.trim();
	res.preHeader = '';
	return res;

}

function implodeHTMLParts(parts, headerAdd, bodyAdd){

	headerAdd = headerAdd || '';
	bodyAdd = bodyAdd || '';
	return '<!DOCTYPE HTML><html><head' + createAttrString(parts.headAttrs) + '>' + headerAdd + parts.header + '</head><body' + createAttrString(parts.bodyAttrs) + '>' + parts.preHeader + bodyAdd + parts.body + '</body></html>';

}

function createAttrString(attrs){

	var res = '';
	for(var i in attrs) res += i + '="' + attrs[i] + '" ';
	return res ? ' ' + res.trim() : res;

}
	
function firstLetters(string, maxLetters){

	if(!string) return '';
	maxLetters = maxLetters || 2;
	var arr = string.split(' '), res = [];

	for(var i = 0; i < arr.length; i++){

		if(!arr[i] || !arr[i][0].match(/[\w\u0430-\u044f]/i)) continue;
		res.push(arr[i][0].toUpperCase());
		if(res.length > maxLetters - 1) break;

	}
	return res.join('');

}

function thumbPrepareSize(src, toHeight){

	return new Promise(function(res, rej){

		try{

			var canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d'),
				tmp = new Image(),
				cW = src.naturalWidth || null,
				cH = src.naturalHeight || null;

			tmp.src = src.src || src;

			tmp.onload = function(){

				cW || (cW = tmp.width);
				cH || (cH = tmp.height);
				if(cH <= toHeight) return res(tmp);

				if(cH > 1000){//bug with very big images to base64

					cW = Math.round(cW * (1000 / cH));
					cH = 1000;

				}else if(cH / 2 < toHeight){

					cW = Math.round(cW * (toHeight / cH));
					cH = toHeight;

				}else{

					cW = Math.round(cW / 2);
					cH = Math.round(cH / 2);

				}

				canvas.width = cW;
				canvas.height = cH;
				ctx.drawImage(tmp, 0, 0, cW, cH);
				tmp.src = canvas.toDataURL('image/png');

			};

		}catch(e){

			rej();

		}

	});

}

function thumbFromObject(sourceImage, maxHeight, maxWidth){

	var canvas = document.createElement('canvas'),
		ctx = canvas.getContext('2d'),
		coeff = (sourceImage.height / maxHeight),
		resWidth = Math.floor(sourceImage.width / coeff),
		xOffset = 0;

	sourceImage.width < sourceImage.height && (xOffset = Math.round(((maxWidth - resWidth) / 2)));
	canvas.height = maxHeight;
	canvas.width = maxWidth;
	ctx.beginPath();
	ctx.rect(0, 0, maxWidth, maxHeight);
	ctx.fillStyle = '#e0e0e0';
	ctx.fill();

	ctx.drawImage(

		sourceImage,
		resWidth >= maxWidth ? Math.round(((resWidth - maxWidth) / 2) * coeff) : 0,
		0,
		resWidth >= maxWidth ? Math.round(maxWidth * coeff) : sourceImage.width,
		sourceImage.height,
		xOffset,
		0,
		canvas.width - (xOffset * 2),
		canvas.height

	);

	return canvas.toDataURL('image/png');

}

function createVideoThumb(filePath){

	return new Promise(function(res){

		var _error = function(){

			video && video.remove();
			res('');

		};

		try{

			var video = document.createElement('video');
			video.invis();
			document.body.appendChild(video);

			video.addEventListener('canplay', function(){

				var canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d');

				canvas.height = this.videoHeight;
				canvas.width = this.videoWidth;
				ctx.drawImage(this, 0, 0, canvas.width, canvas.height); //get original screenshot

				thumbPrepareSize(canvas.toDataURL('image/png'), 64).then(function(result){

					var base64 = thumbFromObject(result, 64, 64);
					video && video.remove();
					return res(base64);

				});

			}, false);

			video.addEventListener('abort', _error);
			video.addEventListener('error', _error);
			video.addEventListener('stalled', _error);
			video.src = URL.createObjectURL(filePath);

		}catch(e){

			_error();

		}

	});

}

function createImageThumb(source){

	return new Promise(function(res){

		var _error = function(){ res(''); };

		var _processImage = function(src){

			var img = new Image();

			img.onload = function(){

				thumbPrepareSize(this, 64).then(function(result){

					res(thumbFromObject(result, 64, 64));

				});

			};

			img.onerror = _error;
			img.src = src;

		};

		try{

			if(source instanceof File){

				var reader = new FileReader();

				reader.onload = function(event){

					_processImage(event.target.result);

				};

				reader.onerror = _error;
				reader.readAsDataURL(source);

			}else _processImage(source);

		}catch(e){

			_error();

		}

	});

}

function createThumbs(fileObjects){

	var promises = [], shouldWait = false;

	for(var i = 0; i < fileObjects.length; i++){

		if(Z.isVideo(fileObjects[i].name)){

			shouldWait = true;

			if(app){

				promises.push(Promise.all([fileObjects[i], window.PKVideoThumbnail.createThumbnail(fileObjects[i]['localURL'], 'ignore', {mode: 'base64'}), true]));

			}else promises.push(Promise.all([fileObjects[i], createVideoThumb(fileObjects[i])]));

		}else if(Z.isImage(fileObjects[i].name)){

			shouldWait = true;
			promises.push(Promise.all([fileObjects[i], createImageThumb(fileObjects[i])]));

		}else{

			promises.push(Promise.all([fileObjects[i]]));

		}

	}

	if(!shouldWait) return Promise.resolve(fileObjects);
	app ? window.plugins.spinnerDialog.show(l[531].ucFirst, '', true) : D.m([l[39].ucFirst(), l[531].ucFirst()]);

	return Promise.all(promises).then(function(results){

		promises = [];

		for(var i = 0; i < results.length; i++){

			if(results[i].length === 2){

				results[i][1] && (results[i][0].thumb = results[i][1]);
				promises.push([results[i][0]]);

			}else{ //app video thumb post processing

				promises.push(Promise.all([results[i][0], createImageThumb(results[i][1])]));

			}

		}

		return Promise.all(promises);

	}).then(function(results){

		app ? window.plugins.spinnerDialog.hide() : D.h();

		return results.map(function(x){

			x[1] && (x[0].thumb = x[1]);
			return x[0];

		});

	}).catch(function(){

		app ? window.plugins.spinnerDialog.hide() && window.plugins.toast.showShortTop(l[530].ucFirst()) : D.h();
		return fileObjects;

	});

}

function styleMessage(html){

	var attrName, attrs, style;

	html = html.replace(/(<(\w+)([^>]*)>)/img, function(match, r1, tagName, attrsString){

		attrs = attrsString ? attributesFromString(attrsString) : [];

		switch(tagName){

		case 'a':

			style = 'font-size:14px;color:#4aaaef!important;text-decoration:none!important;outline:0;cursor:pointer;';
			break;

		case 'h1':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:2em;color:#00687e;margin:0.67em 0 0.67em 0;border-bottom:1px solid #ececec;';
			break;

		case 'h2':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:1.5em;color:#007e93;margin:0.83em 0 0.83em 0;';
			break;

		case 'h3':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:1.17.em;color:#01879e;margin:1em 0 1em 0;';
			break;

		case 'h4':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:1em;color:#0091aa;margin:1.33em 0 1.33em 0;';
			break;

		case 'h5':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:0.83em;color:#029bb5;margin:1.67em 0 1.67em 0;';
			break;

		case 'h6':

			style = 'font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:0.67em;color:#02a4c0;margin:2.33em 0 2.33em 0;';
			break;

		case 'code':

			style = 'font-family:Arial,Helvetica,sans-serif;display:block;padding: 5px;margin: 5px 0 5px 0;font-size:14px;background-color:#fffbff;border:1px solid #d6d7d6;border-radius: 2px;';
			break;

		case 'p':

			style = 'margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;';
			break;

		case 'div':

			style = 'margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;';
			break;

		case 'ul':

			style = 'font-size:14px;margin:0 0 0 30px;padding:5px 0;';
			break;

		case 'ol':

			style = 'font-size:14px;margin:0 0 0 30px;padding:5px 0;';
			break;

		case 'li':

			style = 'padding:3px 0;font-size:14px;';
			break;

		default:

			style = '';
			break;

		}

		attrsString = '';
		for(attrName in attrs) attrName === 'style' ? style += attrs[attrName] : attrsString += ' ' + attrName + '="' + attrs[attrName] + '"';
		return '<' + tagName + (style ? ' style="' + style + '"' : '') + (attrsString ? ' ' + attrsString : '') + '>';

	});

	return '<div style="font-family:Arial,Helvetica,sans-serif;color:#303030;padding:0;margin:0;font-size: 14px;">' + html + '</div>';

}

function onlyUnique(value, index, self){

	return self.indexOf(value) === index;

}

function getQueryStringValue(key){

	return decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' + encodeURIComponent(key).replace(/[.+*]/g, '\\$&') + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'));

}  

function prepareUTM(queryString){

	common.utm = {};
	var param = getQueryStringValue('utm_medium');
	param && (common.utm.utm_medium = param);
	param = getQueryStringValue('utm_source');
	param && (common.utm.utm_source = param);
	param = getQueryStringValue('utm_campaign');
	param && (common.utm.utm_campaign = param);
	param = getQueryStringValue('utm_term');
	param && (common.utm.utm_term = param);
	param = getQueryStringValue('utm_content');
	param && (common.utm.utm_content = param);
	objectIsEmpty(common.utm) && delete(common.utm);

}
function escapeStringRegExp(str){
	
	return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

}
function canReplace(html, val){

	var regExp = new RegExp('<\\w+\\s+[^>]+' + escapeStringRegExp(val) + '$', 'img'), result;
	if((result = regExp.exec(html)) && result.index + result[0].length === html.length) return false;
	regExp = new RegExp('<a\\s(?!.*</a>).*' + escapeStringRegExp(val) + '$', 'img');
	if((result = regExp.exec(html)) && result.index + result[0].length === html.length) return false;
	return true;

}

function phonesToLinks(html){

	for(var i = 0; i < common.phoneNumberRE.length; i++) html = html.replace(common.phoneNumberRE[i], function(match, prefix, val, length){

		if(!canReplace(html.substr(0, length + match.length), match)) return match;
		var tel = val.replace(/[()\s-]/ig, '');
		return tel.length > 5 ? match.replace(prefix + val, '<a href="tel:' + (prefix === '&#43;' ? '+' : prefix) + tel + '">' + prefix + val + '</a>') : match;

	});

	return html;

}

function emailsToLinks(html){

	for(var i = 0; i < common.emailRE.length; i++) html = html.replace(common.emailRE[i], function(match, val, length){

		return canReplace(html.substr(0, length + match.length), match) ? match.replace(val, '<a href="mailto:' + val + '">' + val + '</a>') : match;

	});

	return html;

}

function URLsToLinks(html){

	for(var i = 0; i < common.linksRE.length; i++) html = html.replace(common.linksRE[i], function(match, val, length){

		return canReplace(html.substr(0, length + match.length), match) ? match.replace(val, '<a target="_blank" href="' + val + '">' + val + '</a>') : match;

	});

	return html;

}