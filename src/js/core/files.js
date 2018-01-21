'use strict';

function cFiles(mode, count){

	var self = this;
	self.files = [];
	self._version = '1.0.0';
	self.size = 0;
	self._storage = 0;
	self._total = count || 0;
	self._viewport = [];
	self.mode = mode || 1; //1 - storage, 2 - attached files
	self._showUploaded = true;
	self._showSent = false;
	self._showReceived = false;
	self._countUploaded = 0;
	self._countSent = 0;
	self._countReceived = 0;
	self._simmConnections = 4;
	self._minItemsToHelpPanel = 7;
	self.onready = null;

	self.domInit = function(df){

		var container = df.getElementById('filesContainer');
		I.isDesktop && DOM.title(l[331].ucFirst(), df);
		self.fileUploads(container);
		DOM.loader(l[20], 0);

		return self.get().then(function(result){

			if(result === 'cancelled' || ['storage'].indexOf(navState.page[0]) < 0) return false;
			DOM.loader(l[366], 75);
			var ids = {}, sender;

			for(var i = 0; i < self.files.length; i++){

				sender = self.files[i].sender;
				if(!addrIsInternal(sender)) continue;
				ids[sender] = 1;

			}

			return AV.get(ids).then(function(){ //avatars

				DOM.loader();
				self._newViewport(navState.sort);
				I.isDesktop ? self._domPrepareTools(df) : self._domPrepareToolsM(df);
				if(!self._viewport.length) return I.isDesktop ? self._domEmpty(df) : self._domEmptyM(df);
				self._domPreparePage(df);
				return self.domFill(container);

			});

		});

	};

	self.domFill = function(container, sort){

		if(['storage', 'compose', 'message'].indexOf(navState.page[0]) < 0) return false;
		container.customClear();
		self._viewport.length || self._newViewport(sort || navState.sort);

		self.mode === 1 && I.addBodyListener('click', function(e){ //unselect all iteams if clicked outside

			if(!e.target.findParentOrSelfById(I.isDesktop ? 'fileBlock' : 'swipePanel')) self._domUnselect();

		});

		for(var i = 0; i < self._viewport.length; i++) new FileObject(container, self._viewport[i].d, self);
		return true;

	};

	self.get = function(channelId, filesByMessage, silent){

		if(self._total === self.files.length) return Promise.resolve(true);
		silent = silent || false;

		return A.filesGet(channelId, filesByMessage).then(function(result){

			if(result === 'cancelled') return result;
			return self._fromEncoded(result.files, result.files_direct, false, silent);

		});

	};

	self.upload = function(url, macKey, chunkSize){

		var promises = [], files = [], filesWithErrors = '', filesToDelete = [];
		app && window.plugins.insomnia.keepAwake();

		var _fileError = function(file, error){

			filesToDelete.push(file);
			error && (file._error = error);

			if(file._error){

				filesWithErrors += file.name + ': ' + file._error + '<br />';
				file._setState(3);

			}

			for(var i = files.length - 1; i >= 0; i--){ //remove file from future processing

				if(files[i].id !== file.id) continue;
				files.splice(i, 1);
				break;

			}

		};

		var _done = function(){

			app && window.plugins.insomnia.allowSleepAgain();
			filesToDelete.length && self._delete(filesToDelete); //auto delete files
			filesWithErrors && D.i([l[112].ucFirst(), l[96].ucFirst() + ':<br /><br />' + filesWithErrors], [l[0].ucFirst()]);
			self.ready() && self.onready && self.onready();

		};

		for(var i in self.files){

			if(self.files[i].state !== 0) continue;
			if(!(self.files[i]._file instanceof File)) throw new Error(l[363]);
			self.files[i].dom && self.files[i].dom.action(l[371], true);
			files.push(self.files[i]);

			promises.push(

				self.files[i],
				createFileId(self.files[i]._file, macKey, chunkSize), //create file blob id
				self.files[i]._initAES() //init AES for file encryption

			);

		}

		if(!files.length) return Promise.resolve(true);

		return Promise.all(promises).then(function(results){

			promises = [X.getChannel(U.me)]; //prepare channel for metadata encryption

			for(var i = 0; i < results.length; i += 3){ //file blob ids

				if(results[i + 1] === l[449]){ //file read failed

					_fileError(results[i], l[449]);
					continue;

				}

				if(!results[i + 1]){ //create fileId failed

					_fileError(results[i], l[143]);
					continue;

				}

				results[i]._blobId = results[i + 1];

				promises.push(

					results[i],
					crypto.subtle.digest('SHA-256', u2b(results[i]._blobId + (client.ios() ? '' : results[i].name)))

				);

			}

			return Promise.all(promises);

		}).then(function(results){

			var channel = results.shift();
			if(channel === 'cancelled' || !results.length) return _done();
			if(!(channel instanceof cChannel)) throw new Error(l[58]);

			for(var i = 0; i < results.length; i += 2){

				if(!results[i].dom){ //file was deleted during upload

					_fileError(results[i]);
					continue; 

				}

				results[i].id = b2z(results[i + 1]);

				if(app){

					results[i].name = results[i].id.substr(47) + '.' + Z.fileExt(results[i].name);
					Z.isImage(results[i].name) && (results[i].name = 'image_' + results[i].name);
					Z.isVideo(results[i].name) && (results[i].name = 'video_' + results[i].name);

				}

				results[i].channelId = channel.id;
				results[i].dom && results[i].dom.updateIds();

			}

			if(!files.length) return _done(); //no files to upload

			return A.filesNew(files.map(function(x){return x.id;}), self.mode === 1 ? 1 : 0).then(function(result){ //uploading request

				if(result === 'cancelled') return result;
				return self._fromEncoded(result.files, result.files_direct, true, true); //restore metadata

			}).then(function(result){

				if(result === 'cancelled') return;

				return self._uploadQueue(url, chunkSize).then(function(){ //upload new files

					promises = [channel];

					for(var i = files.length - 1; i >= 0; i--){

						if(!files[i].dom){ //file was deleted during upload or file upload failed

							_fileError(files[i]);
							continue;

						}

						promises.push(Promise.all([

							files[i].id,
							files[i]._createMeta(channel) //create files metadata (encrypted by channel AES)

						]));

					}

					return Promise.all(promises);

				}).then(function(results){

					if(results.length === 1) return _done(); //no files to upload

					return A.filesUploaded(results.shift().id, results, self.mode === 1 ? 1 : 0).then(function(results){ //write files metadata to the server

						if(result === 'cancelled') return _done();

						for(var i = files.length - 1; i >= 0; i--){ //files uploaded, setup db_sizes

							for(var j in results){

								if(j !== files[i].id) continue;

								if(results[j] === -1){ //disk quote exceeded

									_fileError(files[i], l[11]);
									continue;

								}

								files[i].dbSize = results[j];
								files[i]._setState(2);
								files.splice(i, 1);
								break;

							}

						}

						if(files.length) for(i in files) _fileError(files[i], l[90]); //server responded without db_size
						_done();

					});

				});

			});

		});

	};

	self._uploadQueue = function(url, chunkSize){

		return new Promise(function(res){

			var _onFailed = function(file, error){

				file._error = error;
				file._setState(3);
				file._stopStreams();

			};

			var _process = function(){

				var busy = 0;

				for(var i = 0; i < self.files.length; i++){

					if(busy >= self._simmConnections){

						self.files[i].dom && self.files[i].dom.action(l[373]);
						continue;

					}

					(function _inner(file){

						file.state === 1 && busy++;
						if(file.state > 0) return;
						file._setState(1);
						file._cipherIv = crypto.getRandomValues(new Uint8Array(16)).buffer; //init vector for cipher

						file._uploadStream = new ReaderStream(file._file) //read, compress, encrypt, upload
							.pipeTo(new PakoStream('Deflate', {level: 9, workerUrl: (app ? config.appPath + 'js/workers/pako-worker.js' : '/js/workers/pako-worker.js')}))
							.pipeTo(new CipheringStream(CipheringStream.ENCRYPT, file._keyWrap, {iv: file._cipherIv}))
							.pipeTo(new UploadStream(file.id + '/' + file._blobId, {uploadUrl: url, uploadChunk: chunkSize}));

						file._uploadStream.onerror = function(ex){

							if(['Aborted', 'Pipe broken'].indexOf(ex.message) >= 0) return;
							_onFailed(file, ex.message);
							_process();

						};

						file._uploadStream.onprogress = function(data){

							this instanceof UploadStream && file.dom && file.dom.progress(data.loaded);

						};

						file._uploadStream.onend = function(dbSize){

							file.state = 4;
							file._processedSize = dbSize;
							file._uploadStream = null;
							file = null;
							_process();

						};

						file._uploadStream.write();
						busy++;

					})(self.files[i]);

				}

				if(busy === 0){ //processing done

					self.mode === 1 && I.deviceClearDirectory();
					res();

				}

			};

			_process();

		});

	};

	self._fromEncoded = function(filesData, filesDataDirect, processing, silent){

		if(!(filesData instanceof Object)) throw new Error(l[90]);
		var i, channelId, promises = [], req = {}, channelIds = [], rsaIds = [];

		for(channelId in filesData){

			if(typeof channelId !== 'string' || !channelId.length) throw new Error(l[372].ucFirst());
			if(X.channelForId(channelId)) continue;
			req[channelId] = 1;

		}

		for(i in req) channelIds.push(i);
		req = {};

		for(channelId in filesDataDirect){

			if(typeof channelId !== 'string' || !channelId.length) throw new Error(l[372].ucFirst());
			if(U.keyIdByUuid(channelId)) continue;
			req[channelId] = 1;

		}

		for(i in req) rsaIds.push(i);
		silent || DOM.loader(l[364], 25);

		return X.prepareChannels(channelIds, rsaIds).then(function(result){

			if(result === 'cancelled') return result;
			silent || DOM.loader(l[365], 50);
			var channel;
			promises = [];

			var _checkData = function(filesData){

				return typeof filesData['id'] === 'string' && typeof filesData['data'] === 'string' && typeof filesData['db_size'] === 'number' && typeof filesData['message'] === 'string' && typeof filesData['time'] === 'number';

			};

			for(channelId in filesData){ //decoding channeled

				if(!(channel = X.channelForId(channelId))) throw new Error(l[58]);

				for(i in filesData[channelId]){

					if(!_checkData(filesData[channelId][i])) throw new Error(l[372].ucFirst());

					promises.push(Promise.all([

						filesData[channelId][i],
						channel.decode(filesData[channelId][i]['data']),
						channelId,

					]));

				}

			}

			for(channelId in filesDataDirect){ //decoding direct

				for(i in filesDataDirect[channelId]){

					if(!_checkData(filesDataDirect[channelId][i])) throw new Error(l[372].ucFirst());

					promises.push(Promise.all([

						filesDataDirect[channelId][i],
						Encryption.decrypt(U.keyring, U.keyIdByUuid(channelId), msgpack.unpack(a2b(filesDataDirect[channelId][i]['data']))),
						channelId,

					]));

				}

			}

			return Promise.all(promises).then(function(results){

				var decrypted, files, file;
				promises = [];

				for(i = 0; i < results.length; i++){

					files = [];

					if(processing){ //duplicate file already uploaded

						for(var j in self.files) self.files[j].id === results[i][0]['id'] && self.files[j]._file && self.files[j].state !== 2 && files.push(self.files[j]);

					}else{

						file = self._find(results[i][0]['id'], results[i][2], results[i][0]['message']);

						if(!file){

							files.push(new cFile(self._version));
							files[0].id = results[i][0]['id'];
							files[0]._blobId = results[i][0]['id'];
							self.files.push(files[0]);

						}else files.push(file);

						files[0].messageId = results[i][0]['message'];

					}

					decrypted = results[i][1] ? msgpack.unpack(results[i][1].data) : null;

					for(j = 0; j < files.length; j++){

						files[j].dbSize = results[i][0]['db_size']; //real file size in db
						files[j].time = results[i][0]['time']; //file db time
						files[j].channelId = results[i][2]; //file channel
						files[j].dom && files[j].dom.updateIds();

						if(

							!decrypted ||
							typeof decrypted.v !== 'string' ||
							typeof decrypted.a !== 'string' ||
							typeof decrypted.i !== 'string' ||
							typeof decrypted.n !== 'string' ||
							typeof decrypted.z !== 'number' ||
							typeof decrypted.zz !== 'number' ||
							typeof decrypted.iv !== 'object' ||
							!(decrypted.w instanceof ArrayBuffer) ||
							!(decrypted.s instanceof ArrayBuffer)

						){ //file metadata wrong format

							files[j].state = 3;
							continue;

						}

						if(!processing){

							files[j]._version = decrypted.v;
							files[j].sender = decrypted.a;
							files[j]._blobId = decrypted.i;
							files[j].name = decrypted.n;
							files[j].size = decrypted.z;

						}

						files[j]._processedSize = decrypted.zz;
						files[j]._type = decrypted.t;
						files[j]._cipherIv = decrypted.iv;
						decrypted.h && (files[j].thumb = decrypted.h);

						promises.push(Promise.all([

							files[j],
							crypto.subtle.importKey('raw', decrypted.w, Ciphering.ENC.alg, true, Ciphering.ENC.use),
							crypto.subtle.importKey('raw', decrypted.s, Ciphering.MAC.alg, true, Ciphering.MAC.use)

						]));

					}

				}

				return Promise.all(promises);

			}).then(function(results){

				for(i = 0; i < results.length; i++){

					results[i][0]._keyWrap = results[i][1];
					results[i][0]._keySign = results[i][2];
					results[i][0]._cipher = new Ciphering(results[i][1], results[i][2]);
					results[i][0]._uploadStream = null;
					processing ? results[i][0]._setState(2) : results[i][0].state = 2;

				}

				return true;

			});

		});

	};

	self.copy = function(files){

		self.files = [];
		for(var i = 0; i < files.files.length; i++) self.files.push(files.files[i]._copy(self._version));
		return self;

	};

	self._newViewport = function(sortBy){

		sortBy = sortBy || -1;
		self._viewport = [];
		self._countSent = 0;
		self._countReceived = 0;
		var pos;

		for(var i = 0; i < self.files.length; i++){

			if(self.mode === 1){

				if(self.files[i].messageId){

					if(self.files[i].sender === U.login()){

						[2, 3].indexOf(self.files[i].state) >= 0 && self._countSent++;
						if(!self._showSent) continue;

					}else{

						[2, 3].indexOf(self.files[i].state) >= 0 && self._countReceived++;
						if(!self._showReceived) continue;

					}

				}else if(!self._showUploaded) continue;

			}

			pos = self._getPosition(self.files[i], sortBy);
			self._viewport.splice(pos[0][1], 0, {v: pos[1], d: self.files[i]});
				
		}

	};

	self._getPosition = function(data, sortBy){

		var val;

		switch(Math.abs(sortBy)){

		case 1:

			val = data.time ? data.time : 999999999999 + self.files.length;
			break;

		case 2:

			val = data.name.toLowerCase();
			break;

		case 3:

			val = Z.fileExt(data.name.toLowerCase());
			break;

		case 4:

			val = data.size;
			break;

		case 5:

			val = data.sender;
			break;

		default:

			return [[true, self._viewport.length], null];

		}

		return [sortBy > 0 ? arrayIndexProperty(self._viewport, 0, self._viewport.length - 1, val, 'v') : arrayIndexPropertyInverse(self._viewport, 0, self._viewport.length - 1, val, 'v'), val];

	};

	self._viewportIndex = function(data){

		for(var i = 0; i < self._viewport.length; i++) if(self._viewport[i].d === data) return i;
		return -1;

	};

	self._viewportAdd = function(container, data){

		self._viewport || (self._viewport = []);
		if(self._viewportIndex(data) >= 0) return;
		var pos = self._getPosition(data, navState.sort);
		if(!self._viewport.length) self._domPreparePage();
		new FileObject(container, data, self, !self._viewport.length || pos[0][1] >= self._viewport.length ? null : self._viewport[pos[0][1]].d);
		self._viewport.splice(pos[0][1], 0, {v: pos[1], d: data});

	};

	self._viewportRemove = function(data){

		for(var i = self._viewport.length - 1; i >= 0; i--){

			if(self._viewport[i].d !== data) continue;
			self._viewport[i].d.dom.remove();
			self._viewport.splice(i, 1);
			break;

		}

		self._domHelperTools();

	};

	self._filter = function(container, val){

		val && (val = val.toLowerCase());

		for(var i = self._viewport.length - 1; i >= 0; i--){ //remove current

			if(!val) break;
			if(
				!self._showSent && self._viewport[i].d.messageId && self._viewport[i].d.sender === U.login() ||
				!self._showReceived && self._viewport[i].d.messageId && self._viewport[i].d.sender !== U.login()
			) continue;

			if(self._viewport[i].d.name.toLowerCase().indexOf(val) >= 0) continue;
			self._viewportRemove(self._viewport[i].d);

		}

		for(i in self.files){ //add new

			if(
				!self._showSent && self.files[i].messageId && self.files[i].sender === U.login() ||
				!self._showReceived && self.files[i].messageId && self.files[i].sender !== U.login()
			) continue;

			if((val && self.files[i].name.toLowerCase().indexOf(val) < 0)) continue;
			self._viewportAdd(container, self.files[i]);

		}

	};

	self._delete = function(files){

		if(!files.length) return;
		var records = [];

		for(var i = self.files.length - 1; i >= 0; i--){

			for(var j = files.length - 1; j >= 0; j--){

				if(self.files[i] !== files[j]) continue;
				[2, 3].indexOf(self.files[i].state) >= 0 && files[j].channelId && files[j]._blobId && records.push([files[j].id, files[j].channelId, files[j].messageId, files[j]._blobId]);
				self.files[i]._stopStreams();
				self._viewportRemove(self.files[i]);
				self._deleteFile(i);

			}

		}

		self.ondelete && self.ondelete(records);
		var elem = document.getElementById('contentBody');
		elem && !self._viewport.length && (I.isDesktop ? self._domEmpty(elem) : self._domEmptyM(elem));
		if(self.mode > 1 || !records.length) return; //just remove from local files

		return A.filesDelete(records).then(function(){

			self.domStats();

		});

	};

	self._deleteFile = function(idx){

		if(typeof idx !== 'number' || idx < 0 || idx >= self.files.length) throw new Error(l[363]);

		if([2, 3].indexOf(self.files[idx].state) >= 0){

			if(self.files[idx].messageId){

				self.files[idx].sender === U.login() ? self.countSent-- : self._countReceived--;

			}else self._countUploaded--;

		}

		self.files.splice(idx, 1);

	};

	self.bulkDelete = function(files){

		if(!files.length) return;
		var filesToDelete = [], found = false;

		files.forEach(function(file){

			file.messageId && (found = true);
			filesToDelete.push(file);

		});

		if(self.mode === 1){

			D.c([l[75].ucFirst(), found ? '<span class="red">' + l[142].ucFirst() + '</span>' : (l[384].ucFirst() + ' ' + I.countableWord(files.length, [l[262], l[263], l[264], l[274]]) + '?')], [l[1].ucFirst() + ', ' + l[167] + ' ' + l[45], l[164].ucFirst()], function(r){

				D.h();
				I.closeAllAnimated();
				if(!r) return;
				self._delete(filesToDelete);
				self.domOnSelected();
				self._domViewBar(document.getElementById('filesIncludeContainer'));

			});

		}else{

			self._delete(filesToDelete);
			self.domOnSelected();

		}

	};

	self.removeMessageIds = function(messageId, ids){

		if(!ids.length) return;

		for(var j = ids.length - 1; j >= 0; j--){

			for(var i = self.files.length - 1; i >= 0; i--){

				if(self.files[i].messageId !== messageId || self.files[i].id !== ids[j]) continue;
				self._deleteFile(i);
				break;

			}

		}

		self.domStats();

	};

	self._bulkSend = function(files){

		if(!(files instanceof Array) || !files.length) return;
		var toSend = new cFiles(2);
		files.map(function(x){toSend.files.push(x._copy(self._version));});
		W.addElements([], files.map(function(x){ return x; }));

	};

	self.setStats = function(stats){

		typeof stats === 'object' || (stats = {});
		self._countUploaded = stats.storage || 0;
		self.size = stats.size || 0;
		self._total = stats.total || 0;
		self._storage = stats.storage || 0;

	};

	self.domStats = function(nodeList){

		var count = (nodeList ? nodeList : document).getElementById('filesCount'),
			size = (nodeList ? nodeList : document).getElementById('filesSize'),
			blockSize = (nodeList ? nodeList : document).getElementById('filesSizeBlock');

		if(!self._total){

			blockSize.hide();
			count.hide();
			return;

		}

		count.innerHTML = self._total;
		count.show();
		size.innerHTML = bytesToSize(self.size);
		blockSize.show();

	};

	self._domEmpty = function(container){

		if(self.mode !== 1) return;
		var filesContainer = container.getElementById('filesContainer');
		filesContainer.customClear();
		filesContainer.className = 'upload-files-empty';
		filesContainer.appendChild(I.template('files empty'));
		container.getElementById('searchBlock').hide();
		container.getElementById('toolsContainer').hide();
		container.getElementById('btnUpload').hide();
		self._domViewBar(container.getElementById('filesIncludeContainer'));
		DOM.loader();

		container.getElementById('btnUploadEmpty').onclick = function(){

			self.processNewFiles(filesContainer);

		};

		return true;

	};

	self._domEmptyM = function(container){

		if(self.mode !== 1) return;
		self._domHelperTools(container);
		var filesContainer = container.getElementById('filesContainer');
		filesContainer.customClear();
		container.getElementById('noFilesUploadArea').show();
		container.getElementById('helpPanelContainer').hide();
		self.files.length ? container.getElementById('noFilesUploadArea').classList.remove('noCheckboxes') : container.getElementById('noFilesUploadArea').classList.add('noCheckboxes');
		document.getElementById('doubleAction').hide();
		document.getElementById('bulkDelete').hide();
		document.getElementById('bulkSend').hide();
		DOM.composeButton(true);
		self.files.length > 0 && self._domViewBar(container.getElementById('filesIncludeContainer'));
		DOM.loader();

		container.getElementById('filesUpload').onclick = function(e){

			e.stopPropagation();
			e.preventDefault();
			if(this.classList.contains('disabled')) return;
			self.processNewFiles(filesContainer);

		};

		return true;

	};

	self.processNewFiles = function(container, cb, params){

		params = params || {};

		if(app){

			return I.fileSelect.chooseFiles(params.safeStorage).then(function(results){

				if(!results) return;

				if(results === true){ //additional actions

					cb && cb(true);
					return;

				}

				var newFiles = self.newFiles(container, results, params);
				cb && cb(newFiles);

			}).catch(function(){

				cb && cb(false);

			});

		}else{

			I.fileInput(true);
		
			I.chooseFiles.onchange = function(e){

				createThumbs(e.target.files).then(function(results){

					var newFiles = self.newFiles(container, results, params);
					cb && cb(newFiles);

				});

			};

			DOM.chromeUploadAlert().then(function(){

				I.chooseFiles.value = '';
				I.chooseFiles.click();

			});

		}

	};

	self.newFiles = function(container, files, params){

		self._domShowUploaded();
		var newFiles = self.addFiles(container, files, params);
		newFiles && self.upload(config.files_url + U.sid + '/upload', U.keyring.keyAuthKey, options['s']);
		return newFiles;

	};

	self.addFiles = function(container, files, params){

		if(!(files instanceof FileList || files instanceof Array)) throw new Error(l[363]);
		params = params || {limit : 0};
		var i, j, skip, file, exceedFiles = '', fileInstance, newFiles = 0;

		for(i = 0; i < files.length; i++){

			skip = false;
			fileInstance = files[i] instanceof File;

			for(j in self.files){ //file limit reached

				if(self.mode === 1 && self.files[j].messageId) continue;

				if(params.limit && self.files.length >= params.limit){

					I.upgradeDialog(l[453].ucFirst() + ' ' + params.limit + ' ' + l[263]);
					skip = true;
					break;

				}

				if(fileInstance ? (self.files[j].name === files[i].name && self.files[j].size === files[i].size && self.files[j]._type === (files[i].type || Z.fileMimeType(files[i].name))) : self.files[j].equals(files[i])){

					skip = true;
					break;

				}

			}

			if(files[i].size > options['u' + U.class()]['l']){

				exceedFiles += files[i].name + ' [' + l[380] + ' ' + bytesToSize(files[i].size) + ']' + '<br />';
				skip = true;

			}

			if(skip) continue;

			if(fileInstance){

				file = new cFile(self._version);
				file._file = files[i];
				file.name = files[i].name;
				file.size = files[i].size;
				file._type = files[i].type || Z.fileMimeType(files[i].name);
				files[i].thumb && (file.thumb = files[i].thumb);
				file.sender = U.login();

			}else file = files[i]._copy(self._version);

			newFiles++;
			self.files.push(file);
			self._viewportAdd(container, file);

		}

		exceedFiles && I.upgradeDialog(l[412].ucFirst() + ' [' + bytesToSize(options['u' + U.class()]['l']) + ']' + '<br /><br />' + exceedFiles);
		return newFiles;

	};

	self._domHelperTools = function(container){

		if(self.mode !== 1) return;
		container = container || document;
		var elem = document.getElementById('searchInput');
		if(elem && document.activeElement && document.activeElement === elem) return;

		if(self._viewport.length < self._minItemsToHelpPanel){

			if(I.isDesktop){

				container.getElementById('searchBlock').hide();
				container.getElementById('sortBlock').hide();

			}else container.getElementById('helpPanelContainer').hide();

			return;

		}

		if(I.isDesktop){

			container.getElementById('sortBlock').show();
			container.getElementById('searchBlock').show();
			return;

		}

		container = container.getElementById('helpPanelContainer');

		var searchInput = container.getElementById('searchInput'),
			btnSearch = container.getElementById('btnSearch');

		new Dropdown(container.getElementById('sortingLink'), container.getElementById('sortingItems'), function(){

			var dropdown = ''.toDOM(), addTitle = '';
			var df = I.template('dropdown value');
			addTitle = navState.sort === 1 ? ' ' + l[383] : '';
			df.getElementById('title').innerHTML = l[233] + ' ' + l[378] + addTitle;
			df.firstChild.setAttribute('data-sort', 1);
			dropdown.appendChild(df);

			df = I.template('dropdown value');
			addTitle = navState.sort === 2 ? ' ' + l[383] : '';
			df.getElementById('title').innerHTML = l[233] + ' ' + l[382] + addTitle;
			df.firstChild.setAttribute('data-sort', 2);
			dropdown.appendChild(df);

			df = I.template('dropdown value');
			addTitle = navState.sort === 3 ? ' ' + l[383] : '';
			df.getElementById('title').innerHTML = l[233] + ' ' + l[379] + addTitle;
			df.firstChild.setAttribute('data-sort', 3);
			dropdown.appendChild(df);

			df = I.template('dropdown value');
			addTitle = navState.sort === 4 ? ' ' + l[383] : '';
			df.getElementById('title').innerHTML = l[233] + ' ' + l[380] + addTitle;
			df.firstChild.setAttribute('data-sort', 4);
			dropdown.appendChild(df);

			return dropdown;

		}.bind(this), function(clickedElem){

			I.setSort(parseInt(clickedElem.getAttribute('data-sort')));
			self._newViewport(navState.sort);
			searchInput.value = '';
			searchInput.blur();
			self.domFill(document.getElementById('filesContainer'));

		});

		btnSearch.addEventListener('click', function(){ //search icon

			return searchInput.focus();

		});

		searchInput.oninput = function(){ //search input

			self._filter(document.getElementById('filesContainer'), this.value);

		};

		container.show();

	};

	self._domPreparePage = function(container){

		if(['storage'].indexOf(navState.page[0]) < 0) return false;
		if(self.mode !== 1) return;
		container = container || document;
		var elem = container.getElementById('noFilesUploadArea');
		elem && elem.hide();
		elem = container.getElementById('filesContainer');
		elem.customClear();
		I.isDesktop && (elem.className = 'fileStorage');
		self._domHelperTools(container);
		self._domViewBar(container.getElementById('filesIncludeContainer'));

		if(I.isDesktop){ //desktop

			container.getElementById('btnUpload').show();
			container.getElementById('toolsContainer').show();

		}else{ //mobile

			document.getElementById('doubleAction').show();

		}

	};

	self._domPrepareTools = function(container){

		DOM.fixTopPanel();
		var toolsContainer = container.getElementById('toolsContainer');
		toolsContainer.appendChild(I.template('files top')); //top panel
		var searchInput = container.getElementById('searchInput'),
			btnSearch = container.getElementById('btnSearch'),
			btnUpload = container.getElementById('btnUpload'),
			bulkSend = container.getElementById('bulkSend'),
			bulkDelete = container.getElementById('bulkDelete'),
			bulkDownload = container.getElementById('bulkDownload'),
			sortBlock = container.getElementById('sortBlock'),
			sortPopup = container.getElementById('sortPopup');

		btnUpload.onclick = function(){ //bulk delete

			self.processNewFiles(document.getElementById('filesContainer'));

		};

		bulkSend.onclick = function(){ //bulk send

			if(this.classList.contains('disabled')) return;
			self._bulkSend(self._selected());

		};

		bulkDelete.onclick = function(){ //bulk delete

			if(this.classList.contains('disabled')) return;
			self.bulkDelete(self._selected());
			self._domUnselect();

		};

		bulkDownload.onclick = function(){ //bulk download

			if(this.classList.contains('disabled') || !self._selected().length) return;
			self.download(self._selected()[0]); //download selected file

		};

		sortBlock.onclick = function(){

			new Popup(I.template('empty popup'), sortPopup, function(popupNodes){

				var df = I.template('popup item');
				var addTitle = navState.sort === 1 ? ' ' + l[383] : '';
				df.getElementById('title').innerHTML = l[378].ucFirst() + addTitle;
				df.firstChild.setAttribute('data-sort', 1);
				popupNodes.appendChild(df);

				df = I.template('popup item');
				addTitle = navState.sort === 2 ? ' ' + l[383] : '';
				df.getElementById('title').innerHTML = l[382].ucFirst() + addTitle;
				df.firstChild.setAttribute('data-sort', 2);
				popupNodes.appendChild(df);

				df = I.template('popup item');
				addTitle = navState.sort === 3 ? ' ' + l[383] : '';
				df.getElementById('title').innerHTML = l[379].ucFirst() + addTitle;
				df.firstChild.setAttribute('data-sort', 3);
				popupNodes.appendChild(df);

				df = I.template('popup item');
				addTitle = navState.sort === 4 ? ' ' + l[383] : '';
				df.getElementById('title').innerHTML = l[380].ucFirst() + addTitle;
				df.firstChild.setAttribute('data-sort', 4);
				popupNodes.appendChild(df);

				return popupNodes;

			}, function(clickedElem){

				I.setSort(parseInt(clickedElem.getAttribute('data-sort')));
				self._newViewport(navState.sort);
				searchInput.value = '';
				searchInput.blur();
				self.domFill(document.getElementById('filesContainer'));

			});

		};

		btnSearch.addEventListener('click', function(){ //search icon

			return searchInput.focus();

		});

		searchInput.oninput = function(){ //search input

			self._filter(document.getElementById('filesContainer'), this.value);

		};

	};

	self._domPrepareToolsM = function(container){

		if(['storage'].indexOf(navState.page[0]) < 0) return false;		
		var filesContainer = container.getElementById('filesContainer');
		filesContainer.customClear();
		DOM.composeButton(true);
		var elem = document.getElementById('doubleAction'); //double action button (upload / download single file)
		elem.classList.remove('disabled');
		elem.show();

		elem.onclick = function(){

			if(this.classList.contains('disabled')) return;

			if(self._selected().length){

				if(!app) return D.i([l[345].ucFirst(), l[351].ucFirst() + ' ' + l[357].ucFirst()], [l[102].ucFirst()]);
				if(app && self.activeDownloads()) return window.plugins.toast.showShortTop(l[509].ucFirst()); 
				self._selected()[0].download(); //download selected file
				return;

			}

			self.processNewFiles(filesContainer);

		};

		document.getElementById('bulkSend').onclick = function(){ //bulk send

			if(this.classList.contains('disabled')) return;
			self._bulkSend(self._selected());

		};

		document.getElementById('bulkDelete').onclick = function(){ //bulk delete

			if(this.classList.contains('disabled')) return;
			self.bulkDelete(self._selected());
			self._domUnselect();

		};

	};

	self._domShowUploaded = function(){

		var checkbox = document.getElementById('filesUploaded');
		if(!checkbox || checkbox.checked) return;
		document.getElementById('filesUploadedBlock').click();

	};

	self._domViewBar = function(container){

		if(['storage'].indexOf(navState.page[0]) < 0) return false;

		if(!I.isDesktop && !container.innerHTML) container.appendChild(I.template('files include bar'));

		var filesUploaded = container.getElementById('filesUploaded'),
			filesUploadedCount = container.getElementById('filesUploadedCount'),
			filesUploadedBlock = container.getElementById('filesUploadedBlock'),
			filesSent = container.getElementById('filesSent'),
			filesSentCount = container.getElementById('filesSentCount'),
			filesSentBlock = container.getElementById('filesSentBlock'),
			filesReceived = container.getElementById('filesReceived'),
			filesReceivedCount = container.getElementById('filesReceivedCount'),
			filesReceivedBlock = container.getElementById('filesReceivedBlock');

		filesUploaded.onclick = function(e){

			e.preventDefault();

		};

		filesSent.onclick = function(e){

			e.preventDefault();

		};

		filesReceived.onclick = function(e){

			e.preventDefault();

		};

		var _refillDom = function(){

			I.clickSound();
			var elem = document.getElementById('contentBody');
			self._newViewport(navState.sort);
			if(!self._viewport.length) return I.isDesktop ? self._domEmpty(elem) : self._domEmptyM(elem);
			self._domPreparePage();
			self.domFill(document.getElementById('filesContainer'));
			self.domOnSelected();

		};

		if(self._countUploaded){ //show uploaded files

			self._showUploaded && (filesUploaded.checked = true);
			filesUploadedCount && (filesUploadedCount.innerHTML = self._countUploaded);
			filesUploadedBlock.show();

		}else filesUploadedBlock.hide();

		filesUploadedBlock.onclick = function(){

			filesUploaded.checked = !filesUploaded.checked;
			self._showUploaded = filesUploaded.checked;
			_refillDom();

		};

		if(self._countSent){ //show sent files

			self._showSent && (filesSent.checked = true);
			filesSentCount && (filesSentCount.innerHTML = self._countSent);
			filesSentBlock.show();

		}else filesSentBlock.hide();

		filesSentBlock.onclick = function(){

			filesSent.checked = !filesSent.checked;
			self._showSent = filesSent.checked;
			_refillDom();

		};

		if(self._countReceived){ //show recieved files

			self._showReceived && (filesReceived.checked = true);
			filesReceivedCount && (filesReceivedCount.innerHTML = self._countReceived);
			filesReceivedBlock.show();

		}else filesReceivedBlock.hide();

		filesReceivedBlock.onclick = function(){

			filesReceived.checked = !filesReceived.checked;
			self._showReceived = filesReceived.checked;
			_refillDom();

		};

	};

	self.fileUploads = function(container){

		function handleFileSelect(e){

			e.stopPropagation();
			e.preventDefault();
			self.newFiles(container, e.dataTransfer.files);

		}

		function handleDragOver(e){

			e.stopPropagation();
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';

		}

		var dropZone = document.getElementById('content-holder');

		if(dropZone){

			dropZone.ondragover = handleDragOver;
			dropZone.ondrop = handleFileSelect;

		}

	};

	self._domContentTitle = function(){

		if(['storage'].indexOf(navState.page[0]) < 0) return false;
		DOM.title(l[331].toUpperCase() + ' [' + self._viewport.length + ']');

	};

	self.domOnSelected = function(){

		if(self.mode !== 1) return;

		var actionTitle = document.getElementById('doubleActionTitle'),
			btnDoubleAction = document.getElementById('doubleAction'),
			doubleActionIco = document.getElementById('doubleActionIco'),
			btnSend = document.getElementById('bulkSend'),
			btnDelete = document.getElementById('bulkDelete'),
			btnDownload = document.getElementById('bulkDownload'),
			btnCompose = document.getElementById('newCompose');

		if(!self._selected().length){

			if(I.isDesktop){

				btnDelete.classList.add('disabled');
				btnSend.classList.add('disabled');
				btnDownload.classList.add('disabled');

			}else{

				btnDelete.hide();
				actionTitle.innerHTML = l[377].ucFirst();
				btnDoubleAction.classList.remove('disabled');
				doubleActionIco.classList.remove('i-download-grey');
				doubleActionIco.classList.add('i-upload');
				btnSend.hide();
				btnCompose.show();

			}

			return;

		}	

		btnDelete.show();
		btnDelete.classList.remove('disabled');
		I.isDesktop || btnCompose.hide();
		btnSend.show();
		btnSend.classList.remove('disabled');

		if(self._selected().length === 1){

			if(I.isDesktop){

				btnDownload.classList.remove('disabled');

			}else{

				actionTitle.innerHTML = l[367].ucFirst();
				btnDoubleAction.classList.remove('disabled');
				doubleActionIco.classList.remove('i-upload');
				doubleActionIco.classList.add('i-download-grey');

			}

		}else{

			if(I.isDesktop){

				btnDownload.classList.add('disabled');

			}else{

				btnDoubleAction.classList.add('disabled');

			}

		}

	};

	self._domUnselect = function(){

		for(var i = 0; i < self._viewport.length; i++) self._viewport[i].d.dom && self._viewport[i].d.dom.selected && self._viewport[i].d.dom.setSelected(false);
		self.domOnSelected();

	};

	self._selected = function(){

		var res = [];
		for(var i = 0; i < self._viewport.length; i++) self._viewport[i].d.dom && self._viewport[i].d.dom.selected && res.push(self._viewport[i].d);
		return res;

	};

	self.free = function(stopFileStreams){

		for(var i in self.files){

			stopFileStreams && self.files[i]._stopStreams();
			delete(self.files[i].dom);

		}

		self._viewport = [];

	};

	self.interrupt = function(){

		for(var i in self.files){

			self.files[i]._stopStreams();
			self.files[i]._setState(2);

		}

	};

	self.unfinished = function(){

		for(var i in self.files) if(self.files[i].state === 1) return true;
		return false;

	};

	self._find = function(id, channelId, messageId){

		for(var i in self.files){

			if(self.files[i].id !== id) continue;
			if(channelId && (self.files[i].channelId !== channelId || self.files[i].messageId !== messageId)) continue;
			return self.files[i];

		}

		return null;

	};

	self.ids = function(){

		return self.files.map(function(x){return [x.id, x._blobId, x.size];});

	};

	self.totalSize = function(){

		var res = 0;
		self.files.map(function(x){res += x.size;});
		return res;

	};

	self.metadata = function(channel){

		if(!self.files || !self.files.length) return Promise.resolve(false);
		var promises = [];

		for(var i in self.files){

			promises.push(Promise.all([

				self.files[i],
				self.files[i]._createMeta(channel)

			]));

		}

		return Promise.all(promises).then(function(results){

			var files = {};
			results.forEach(function(x){files[x[0].id] = x[1];});
			return files;

		});

	};

	self.ready = function(){

		for(var i in self.files) if(self.files[i].state !== 2) return false;

		if(self.mode === 1){

			self.domStats();
			self._domHelperTools();
			self._domViewBar(document.getElementById('filesIncludeContainer'));

		}

		return true;

	};

	self.download = function(file, viewOnReady){

		viewOnReady = viewOnReady || false;

		return file.download().then(function(blob){

			if(!app){ // default browser save, todo Safari IndexedDB

				blob && window.saveAs(new Blob([blob], {type: file._type}), file.name);
				return;

			}

			var _sharing = function(filePath){

				window.plugins.socialsharing.shareWithOptions({

					files: [filePath],

				}, function(){

					I.inAppBrowser && (I.inAppBrowser = null);
					I.deviceClearDirectory();

				}, function(){

					I.deviceClearDirectory();

				});

			};

			var _action = function(actionId, filePath, fileName){

				switch(actionId){

				case 0:

					I.inAppBrowser = cordova.ThemeableBrowser.open(filePath, '_blank', {

						title: { color: '#00000080', staticText: fileName },
						statusbar: { color: '#ffffffff' },
						toolbar: { height: 43, color: '#ffffffff' },
						closeButton: { image: 'close 35x35.png', imagePressed: 'close 35x35 active.png', align: 'right', event: 'closePressed' },
						backButton: { image: 'save 35x35.png', imagePressed: 'save 35x35 active.png', align: 'right', event: 'backPressed' },
						backButtonCanClose: true

					}).addEventListener('backPressed', function(){

						setTimeout(_sharing, 800, filePath);

					});

					break;

				case 1:

					_sharing(filePath);

					break;

				}

			};

			file._cordovaFS.writeDone(); //cordova file system actions

			file._cordovaFS.waitWriterDone().then(function(){

				return file._cordovaFS.getPath(cordova.file.tempDirectory, file._cordovaFile);

			}).then(function(deviceFilePath){

				file._stopStreams();

				viewOnReady ? _action(0, deviceFilePath, file.name) : D.b([[l['232'].ucFirst(), 0], [l['507'].ucFirst(), 1], [l['164'].ucFirst(), -1]], function(clickedId){

					D.h();
					_action(clickedId, deviceFilePath, file.name);

				});

			});

		}).catch(function(e){

			DEBUG_WARN('file ' + file.name + ': download failed', e);
			e || D.i([l[50].ucFirst(), l[6].ucFirst()], [l[0].ucFirst()]);

		});

	};

	self.activeDownloads = function(){

		var res = 0;
		for(var i in self.files) self.files[i].state === 5 && res++;
		return res;

	};

}

function cFile(version){

	var self = this;
	self._version = version,
	self._file = null;
	self.name = '';
	self.channelId = '';
	self.messageId = '';
	self.id = newUuid();
	self._blobId = '';
	self.size = 0;
	self.dbSize = 0;
	self.time = Date.now() / 1000 | 0;
	self._type = '';
	self.state = 0; //0 init, 1 processing, 2 ready, 3 error, 4 meta data upload, 5 download
	self._keyWrap = null;
	self._keySign = null;
	self._cipher = null;
	self.sender = null;
	self._cipherIv = null;
	self._uploadStream = null;
	self._downloadStream = null;

	self._createMeta = function(channel){

		if(!(channel instanceof cChannel)) throw new Error(l[58]);
		if(!(self._keyWrap && self._keySign)) throw new Error(l[363]);

		self.channelId = channel.id;

		return self._toObject().then(function(result){

			return channel.encode(result);

		}).then(function(result){

			return b2a(msgpack.pack(result));

		});

	};

	self._stopStreams = function(){

		if(self._downloadStream){

			self._downloadStream.abort();
			self._downloadStream.file && delete(self._downloadStream.file);

		}

		if(self._uploadStream){

			self._uploadStream.abort();
			self._uploadStream.file && delete(self._uploadStream.file);
			delete(self._uploadStream);

		}

	};

	self._copy = function(version){

		var file = new cFile(version);
		file.name = self.name;
		file.id = self.id;
		file._blobId = self._blobId;
		file._type = self._type;
		file.size = self.size;
		file._processedSize = self._processedSize;
		file.dbSize = self.dbSize;
		file.time = self.time;
		file.state = self.state;
		file._keyWrap = self._keyWrap;
		file._keySign = self._keySign;
		file._cipher = self._cipher;
		file.channelId = self.channelId;
		file._cipherIv = self._cipherIv.slice(0);
		file.sender = U.login(); //changing file owner only
		self.thumb && (file.thumb = self.thumb);
		return file;

	};

	self.equals = function(file){

		return self._blobId === file._blobId && self.name === file.name && self._type === file._type;

	};

	self._initAES = function(){

		return Promise.all([

			crypto.subtle.generateKey(Ciphering.ENC.alg, true, Ciphering.ENC.use),
			crypto.subtle.generateKey(Ciphering.MAC.alg, true, Ciphering.MAC.use)

		]).then(function(results){

			self._keyWrap = results[0];
			self._keySign = results[1];
			self._cipher = new Ciphering(self._keyWrap, self._keySign);
			return true;

		});

	};

	self._toObject = function(){

		return Promise.all([

			crypto.subtle.exportKey('raw', self._keyWrap),
			crypto.subtle.exportKey('raw', self._keySign)

		]).then(function(results){

			var res = {

				v: self._version,
				a: U.login(),
				i: self._blobId,
				n: self.name,
				z: self.size, // original file size
				zz: self._processedSize, // database file size
				t: self._type,
				w: results[0],
				s: results[1],
				iv: self._cipherIv.slice(0),

			};

			self.thumb && (res['h'] = self.thumb);
			return res;

		});

	};

	self.breakDownload = function(){

		self._stopStreams();
		self._setState(2);

	};

	self.download = function(blobRequired){

		blobRequired = blobRequired || false;
		var url = config.files_url + U.sid + '/download', chunkSize = options['s'];

		return new Promise(function(res){

			self.dom && self.dom.action(l[29], true);
			self.state = 5;
			app && window.plugins.insomnia.keepAwake();

			self._downloadStream = 
				new DownloadStream(self.id + '/' + self._blobId, {downloadUrl: url, downloadChunk: chunkSize, downloadSize: self._processedSize})
					.pipeTo(new CipheringStream(CipheringStream.DECRYPT, self._keyWrap, {iv: new Uint8Array(self._cipherIv)}))
					.pipeTo(new PakoStream('Inflate', {level: 9, workerUrl: (app ? config.appPath : '/') + 'js/workers/pako-worker.js'}))
					.pipeTo(new WriterStream(app && !blobRequired ? {saveByChunks : true} : {}));

			self._downloadStream.onerror = function(){

				if(app){

					if(!self._cordovaFile) return; //already cleared
					window.plugins.insomnia.allowSleepAgain();

					self._cordovaFS.writeDone(true);
					delete(self._cordovaFile);

				}

			};

			self._downloadStream.onprogress = function(progressObject){

				if(this instanceof DownloadStream){

					self.dom && self.dom.progress(progressObject.loaded, progressObject.total);

				}else if(this instanceof WriterStream){

					app && !blobRequired && self._cordovaFS.append(progressObject.blob);

				}

			};

			self._downloadStream.onend = function(blob){

				self._setState(2);
				delete(self._downloadStream);
				res(blob);

			};

			if(app && !blobRequired){

				self._cordovaFS = new CordovaFS();

				I.deviceClearDirectory().then(function(){

					return self._cordovaFS.getWriter(cordova.file.tempDirectory, self.name);

				}).then(function(result){

					self._cordovaFile = result;
					self._downloadStream.write();

				});

			}else self._downloadStream.write();

		});

	};

	self._setState = function(newState){

		self.state = newState;
		self.dom && self.dom.state();
		if([2, 3].indexOf(self.state) >= 0) self.dom && self.dom.progress(-1);

	};

}