'use strict';

var FileSelect = function(){

	this._iCloud = false;
	this._buttons = [[l[477].ucFirst(), 0], [l[478].ucFirst(), 1]];
	if(!app) return;

	FilePicker.isAvailable(function(result){

		this._iCloud = result;
		this._iCloud && this._buttons.push([l[506], 2]);

	}.bind(this));

};

FileSelect.prototype.chooseFiles = function(fromStorage){

	return new Promise(function(res, rej){

		var buttons = (fromStorage ? [[l[529].ucFirst(), 3]] : []).concat(this._buttons.map(function(x){ return x; })).concat([[l[164].ucFirst(), -1]]);

		D.b(buttons, function(clickedId){

			D.h();
			if(clickedId === - 1) return res(false);

			switch(clickedId){

			case 0:

				window.imagePicker.getPictures(function(results){ // multi images

					this._getFileObjects(results).then(function(results){

						return createThumbs(results).then(res);

					});

				}.bind(this), rej, { maximumImagesCount: 100 });

				break;

			case 1:

				navigator.camera.getPicture(function(result){ // only 1 video

					this._getFileObjects([result]).then(function(results){

						return createThumbs(results).then(res);

					});

				}.bind(this), rej, { //options

					destinationType: Camera.DestinationType.NATIVE_URI,
					sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
					mediaType: Camera.MediaType.VIDEO,

				});

				break;

			case 2:

				if(this._iCloud){

					FilePicker.pickFile(function(result){

						this._getFileObjects([cordova.file.tempDirectory + result.substr(result.indexOf('ad.safe'))]).then(function(results){

							return createThumbs(results).then(res);

						});

					}.bind(this));

				}else res(true);

				break;

			case 3:

				res(true);
				break;

			}

		}.bind(this));

	}.bind(this));

};

FileSelect.prototype._getFileObjects = function(filePaths){

	return new Promise(function(res, rej){

		var fileObjects = [], done = 0, total = filePaths.length;

		for(var i = 0; i < filePaths.length; i++){

			resolveLocalFileSystemURL(filePaths[i], function(entry){

				entry.file(function(file){

					if(!(file instanceof File)) return rej();
					fileObjects.push(file);
					++done === total && res(fileObjects);

				}, rej);

			}, function(){

			});

		}

	});
};

FileSelect.prototype.chooseImage = function(){

	revoke = revoke || false;

	return new Promise(function(res, rej){

		navigator.camera.getPicture(function(result){ // base64 encoded jpeg

			return res(result);

		}.bind(this), rej, { //options

			destinationType: Camera.DestinationType.DATA_URL,
			sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
			mediaType: Camera.MediaType.PICTURE,

		});

	}.bind(this));

};