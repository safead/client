'use strict';

String.prototype.ucFirst = function(){

	return this.charAt(0).toUpperCase() + this.slice(1);

};

String.prototype.saparate4 = function(delimiter){

	delimiter = delimiter || '-';
	return this.substr(0, 4) + delimiter + this.substr(4, 4) + delimiter + this.substr(8, 4) + delimiter + this.substr(12);

};

String.prototype.ucAll = function(){

	var splitted = this.toLowerCase().split(' '), res = '';

	for(var i = 0; i < splitted.length; i++){

		if(!splitted[i]) continue;
		res && (res += ' ');
		res += splitted[i].ucFirst();

	}

	return res;

};

String.prototype.toDOM = function(){

	var i, div = document.createElement('div'), df = document.createDocumentFragment();
	div.innerHTML = this;
	while(i = div.firstChild) df.appendChild(i);
	return df;

};

String.prototype.endsOn = function(val){

	var pos = this.indexOf(val);
	return pos >= 0 ? (pos === (this.length - val.length)) : false;

};

String.prototype.getClearText = function(){

	var found = this.match(/<body[^>]*>([\s\S]+)/gi);
	var html = clearTagsContent(found ? found[0] : this, ['style', 'script']);
	html = html.replace(/&nbsp;/gi, ' ');
	html = html.replace(/<!--[^>]*-->/gi, ' ');
	html = html.replace(/\r\n/gi, ' ');
	return clearTags(html).trim();

};

Array.prototype.equals = function(array){

	if(!array || this.length !== array.length) return false;

	for(var i = 0; i < this.length; i++){

		if(this[i] instanceof Array && array[i] instanceof Array){

			if(!this[i].equals(array[i])) return false;

		}else if(this[i] !== array[i]) return false;

	}

	return true;

};

Object.defineProperty(Array.prototype, 'equals', {enumerable: false});

Array.prototype.removeMe = function(){

	for(var i = this.length - 1; i >= 0; i--) U.isMe(this[i]) && this.splice(i, 1);
	return this;

};

Object.defineProperty(Array.prototype, 'removeMe', {enumerable: false});

Element.prototype.getElementById = function(val){

	var children = this.childNodes, el;

	for(var i = 0; i < children.length; i++){

		if(children[i].nodeType !== 1) continue;
		if(children[i].getAttribute('id') === val) return children[i];
		if(el = children[i].getElementById(val)) return el;

	}
	return null;

};

Element.prototype.invis = function(){

	this.classList.add('h');
	return true;

};

Element.prototype.vis = function(){

	this.classList.remove('h');
	return true;

};

Element.prototype.hide = function(){

	this.classList.add('hide');
	return true;

};

Element.prototype.show = function(){

	this.classList.remove('hide');
	return true;

};

Element.prototype.visible = function(){

	return !this.classList.contains('hide');

};

Element.prototype.error = function(){

	this.classList.remove('allok');
	this.classList.add('error');

};

Element.prototype.noerror = function(){

	this.classList.remove('error');

};

Element.prototype.mok = function(){

	this.classList.remove('error');
	this.classList.add('allok');

};

Element.prototype.mnook = function(){

	this.classList.remove('allok');

};

Element.prototype.isok = function(){

	return this.classList.contains('allok');

};

Element.prototype.loading = function(){

	this.classList.add(I.isDesktop ? '_loading' : 'loading');

};

Element.prototype.noloading = function(){

	this.classList.remove(I.isDesktop ? '_loading' : 'loading');

};

Element.prototype.catchEnter = function(cb){

	this.addEventListener('keyup', function(e){

		e.keyCode === 13 && cb();

	});

};

Element.prototype.catchCtrlEnter = function(cb){

	this.addEventListener('keydown', function(e){

		e.ctrlKey && e.keyCode === 13 && cb();

	});

};

Element.prototype.customClear = function(){

	while(this.firstChild) this.removeChild(this.firstChild);

};

Element.prototype.fill = function(content){

	this.customClear();
	this.appendChild(content);

};

Element.prototype.remove = function(){

	this.parentElement && this.parentElement.removeChild(this);

};

Node.prototype.remove = function(){

	this.parentElement && this.parentElement.removeChild(this);

};

Element.prototype.findParentByTagname = function(tagName){

	tagName = tagName.toUpperCase();
	var el = this.parentNode;

	while(el && el.parentNode){

		el = el.parentNode;
		if(el.tagName && el.tagName === tagName) return el;

	}

	return null;

};

Element.prototype.findSelfOrParentByElement = function(element){

	var el = this;

	while(el && el.parentNode){

		if(el.tagName && el === element) return el;
		el = el.parentNode;

	}

	return null;

};

Element.prototype.findSelfOrParentByTagname = function(tagName){

	var el = this;
	tagName = tagName.toUpperCase();

	while(el && el.parentNode){

		if(el.tagName && el.tagName === tagName) return el;
		el = el.parentNode;

	}

	return null;

};

Element.prototype.findParentById = function(id){

	var el = this.parentNode;

	while(el && el.parentNode){

		el = el.parentNode;
		if(el.id === id) return el;

	}

	return null;

};

Element.prototype.findParentOrSelfById = function(id){

	if(this.id === id) return this;
	var el = this.parentNode;

	while(el && el.parentNode){

		if(el.id === id) return el;
		el = el.parentNode;

	}

	return null;

};

Element.prototype.getRoot = function(){

	var el = this.parentNode;
	while(el && el.parentNode && el.parentNode.tagName) el = el.parentNode;
	return el;

};

HTMLCollection.prototype.addEventListener = function(event, fn){

	for(var i = 0; i < this.length; i++) this[i].addEventListener(event, fn, false);

};

NodeList.prototype.addEventListener = function(event, fn){

	for(var i = 0; i < this.length; i++) this[i].tagName && this[i].addEventListener(event, fn, false);

};

HTMLCollection.prototype.remove = function(){

	for(var i = this.length - 1; i >= 0; i--) this[i].tagName && this[i].remove();

};

NodeList.prototype.remove = HTMLCollection.prototype.remove;

HTMLCollection.prototype.innerHTML = function(val){

	for(var i = this.length - 1; i >= 0; i--) this[i].tagName && (this[i].innerHTML = val);

};

NodeList.prototype.innerHTML = HTMLCollection.prototype.innerHTML;

Element.prototype.addEventListenerForTags = function(tagName, event, fn){

	tagName = tagName.toUpperCase();
	this.getElementsByTagName(tagName).addEventListener(event, fn);

};

Element.prototype.getChildsByTagName = function(tagName){

	var res = [];
	tagName = tagName.toUpperCase();
	for(var i in this.childNodes) this.childNodes[i].tagName && this.childNodes[i].tagName === tagName && res.push(this.childNodes[i]);
	return res;

};

Element.prototype.outerHeight = function(){

	var height = this.offsetHeight, 
		style = getComputedStyle(this);

	height += parseInt(style.marginTop) + parseInt(style.marginBottom);
	return height;

};

Element.prototype.absoluteOffset = function(){

	var element = this, top = 0, left = 0;

	do{

		top += element.offsetTop || 0;
		left += element.offsetLeft || 0;
		element = element.offsetParent;

	}while(element);

	return{

		top: top,
		left: left

	};

};

DocumentFragment.prototype.addEventListenerForTags = function(tagName, event, fn){

	tagName = tagName.toUpperCase();

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		this.childNodes[i].tagName === tagName && this.childNodes[i].addEventListener(event, fn);
		this.childNodes[i].getElementsByTagName(tagName).addEventListener(event, fn);

	}

};

DocumentFragment.prototype.innerHTML = function(){

	var res = '';
	for(var i = 0; i < this.childNodes.length; i++) this.childNodes[i].tagName && (res += this.childNodes[i].innerHTML);
	return res;

};

DocumentFragment.prototype.addEventListenerForClass = function(className, event, fn){

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		this.childNodes[i].classList.contains(className) && this.childNodes[i].addEventListener(event, fn);
		this.childNodes[i].getElementsByClassName(className).addEventListener(event, fn);

	}

};

DocumentFragment.prototype.addEventListenerForId = function(id, event, fn){

	var node;

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		node = this.childNodes[i].getElementById(id);
		node && node.addEventListener(event, fn);

	}

};

DocumentFragment.prototype.addEventListenerForId = function(id, event, fn){

	var node;

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		node = this.childNodes[i].getElementById(id);
		node && node.addEventListener(event, fn);

	}

};

if(!DocumentFragment.prototype.getElementById){

	DocumentFragment.prototype.getElementById = function(id){

		var res;

		for(var i in this.childNodes){

			if(!this.childNodes[i].tagName) continue;
			if(this.childNodes[i].getAttribute('id') === id) return this.childNodes[i];
			res = this.childNodes[i].getElementById(id);
			if(res) return res;

		}

		return null;

	};

}

DocumentFragment.prototype.addEventListenerForClassName = function(className, event, fn){

	var nodes = this.getElementsByClassName(className);
	for(var i in nodes) nodes[i].addEventListener(event, fn);

};

DocumentFragment.prototype.getElementsByClassName = function(className){

	var res = [], nodes;

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		this.childNodes[i].classList.contains(className) && res.push(this.childNodes[i]);
		nodes = this.childNodes[i].getElementsByClassName(className);
		for(var j in nodes) nodes[j].tagName && res.push(nodes[j]);

	}

	return res;

};

DocumentFragment.prototype.getElementsByTagName = function(tagName){

	tagName = tagName.toUpperCase();
	var res = [], nodes;

	for(var i in this.childNodes){

		if(!this.childNodes[i].tagName) continue;
		this.childNodes[i].tagName === tagName && res.push(this.childNodes[i]);
		nodes = this.childNodes[i].getElementsByTagName(tagName);
		for(var j in nodes) nodes[j].tagName && res.push(nodes[j]);

	}

	return res;

};

DocumentFragment.prototype.addEventListener = function(event, fn){

	this.firstChild.addEventListener(event, fn);

};

DocumentFragment.prototype.remove = function(id){

	for(var i in this.childNodes) this.childNodes[i].tagName && this.childNodes[i].id === id && this.removeChild(this.childNodes[i]);
	return this;

};