'use strict';

function cAvatars(){

	var self = this;
	self._items = {};
	self._version = '1.0.0';

	self.get = function(ids){

		var i, j, found, users = [];

		for(i in ids){

			found = false;

			for(j in self._items){

				if(j === i){

					found = true;
					break;

				}

			}

			if(found) continue;
			users.push(i);

		}

		if(!users.length) return Promise.resolve(true);

		return A.avatarsGet(users).then(function(response){

			if(response === 'cancelled') return;
			var contact;

			for(var i in response.avatars){

				self.set(typeof response.avatars[i] === 'object' ? response.avatars[i] : null, i);

				if(typeof response.avatars[i].nick === 'string'){

					contact = C.byAddress(i);

					if(contact){

						contact.ownName = a2u(response.avatars[i].nick);

					}else C.add(new cContact(i, a2u(response.avatars[i].nick)));

				}

			}

		});

	};

	self.set = function(data, address){

		data = data || {};
		address = address || U.login();
		if(self._items[address] && self._items[address].uuid && self._items[address].uuid === data.uuid) return;

		self._items[address] || (self._items[address] = {});
		data.uuid && (self._items[address].uuid = data.uuid);

		if(typeof data.big !== 'undefined'){

			if(data.big){

				var blob = new Blob([a2b(data.big)], {type: 'image/jpeg'});
				self._items[address].blob = blob;
				self._items[address].uri = URL.createObjectURL(blob);
				return;

			}

		}

		if(data.uuid) return;
		self._items[address] && delete(self._items[address].blob);
		self._items[address] && delete(self._items[address].uri);

	};

	self.uri = function(address){

		address = address || U.login();
		return self._items[address] && self._items[address].uri ? self._items[address].uri : '';

	};

	self.deploy = function(params){

		params.address = params.address || U.login();
		var elems = params.items || params.container.getElementsByClassName(params.className), found = false;

		for(var i = elems.length - 1; i >= 0; i--){

			if(self._items[params.address] && self._items[params.address].uri){

				elems[i].setAttribute('src', self._items[params.address].uri);
				elems[i].show();
				params.className && elems[i].classList.remove(params.className);
				found = true;

			}else (params.address === U.login() && !params.remove) ? elems[i].hide() : elems[i].remove();

		}

		if(found){

			if(params.removeIfFound) for(i = params.removeIfFound.length - 1; i >= 0; i--) params.removeIfFound[i].remove();

			if(params.removeIfFoundClass){

				for(i = 0; i < params.removeIfFoundClass.length; i++){

					var className = params.removeIfFoundClass[i].getAttribute('data-remove');
					params.removeIfFoundClass[i].classList.remove(className);
					params.removeIfFoundClass[i].removeAttribute('data-remove');

				}

			}

		}else{

			if(params.removeIfNotFound) for(i = params.removeIfNotFound.length - 1; i >= 0; i--) params.removeIfNotFound[i].remove();

		}

	};

	self.asBase64 = function(address){

		address = address || U.login();

		return new Promise(function(res){

			if(!self._items[address].blob) return res('');

			var fileReader = new FileReader();

			fileReader.onload = function(){

				res(b2a(this.result));

			};

			fileReader.readAsArrayBuffer(self._items[address].blob);

		});

	};

	self.store = function(){

		return I.lsWrite('avatars', self.items);

	};

	self._restore = function(){

		return I.lsRead('avatars').then(function(result){

			self._items = result || {};

		});

	};

}