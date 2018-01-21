'use strict';

var Notifications = function(){

	this._push = null;
	this.pushEnabled = false;
	this.deviceToken = '';
	this.deviceUUID = '';

};

Notifications.prototype.init = function(){

	return new Promise(function(res){

		var _error = function(){

			res(false);
		
		};

		this.deviceUUID = device.uuid;

		this._push = PushNotification.init({

			ios: {

				'alert': 'true',
				'badge': 'true',
				'sound': 'true',

			},

		});

		this._push.on('registration', function(data){

			if(this.deviceToken && this.deviceToken !== data.registrationId){

				alert('deviceToken has been changed from ' + this.deviceToken + ' to ' + data.registrationId);

			}

			this.deviceToken = data.registrationId;
			res(true);
				
		}.bind(this), _error);

		this._push.on('error', _error);

		this._push.on('notification', function(data){

			typeof data.count === 'number' && this.setBadgeNumber(data.count);

			if(data.additionalData.read){ //read messages

				E.setReadByIds(data.additionalData.read);

			}else if(data.additionalData.move){ //moved emails

				E.moveByIds(data.additionalData.move);

			}else if(data.additionalData.deleted){ //settings changed

				E.removeByIds(data.additionalData.deleted);

			}else if(data.additionalData.settings){ //settings changed

				U.settingsReload();

			}else{ //incoming emails

				!app.paused && U.access(1) && U.heartbeat(true);

			}

			this._push.finish(function(){

			}, function(){

			}, data.additionalData.notId);

		}.bind(this), _error);

		PushNotification.hasPermission(function(data){

			this.pushEnabled = data.isEnabled;
			if(!this.pushEnabled) return res(false);

		}.bind(this));

	}.bind(this));

};

Notifications.prototype.setBadgeNumber = function(num){

	this._push && this._push.setApplicationIconBadgeNumber(function(){

	}.bind(this), function(){

	}, num);

};