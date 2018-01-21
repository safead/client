'use strict';

var MessageGroups = function(){

	this._references = [];
	this._items = [];
	return true;

};

MessageGroups.prototype.addMessage = function(data){

	var i, j, idx, allIds = [data.externalId || data.id + '@' + config.domain], myInsertedPos = [];
	if(data.group) return true;

	data.inReptyTo && allIds.push(data.inReptyTo);
	data.references && (allIds = allIds.concat(data.references).filter(onlyUnique));

	for(i in allIds){

		idx = arrayIndexProperty(this._references, 0, this._references.length - 1, allIds[i], 'i');

		if(idx[0]){

			for(j = 0; j < myInsertedPos.length; j++) if(myInsertedPos[j] >= idx[1]) myInsertedPos[j] = myInsertedPos[j] + 1;
			myInsertedPos.push(idx[1]);
			this._references.splice(idx[1], 0, {i: allIds[i], g: null});

		}else data.group || (data.group = this._references[idx[1]].g);

	}

	if(data.group){

		var inserted = false;

		for(i = 0; i < data.group.messages.length; i++){

			if(data.group.messages[i] === data){

				inserted = true;
				break;

			}

			if(data.group.messages[i].time < data.time){

				E.viewportRemove(data.group);
				data.group.messages.splice(i, 0, data);
				inserted = true;
				break;

			}

		}

		inserted || data.group.messages.splice(data.group.messages.length, 0, data);

	}else{

		data.group = new MessageGroup(data);
		this._items.push(data.group);

	}

	for(i in myInsertedPos) this._references[myInsertedPos[i]].g = data.group;
	data.starred && (data.group.starred = true);
	return data;

};

MessageGroups.prototype.asArray = function(){

	return this._items;

};

MessageGroups.prototype.resetView = function(){

	for(var i = 0; i < this._items.length; i++) delete(this._items[i].digest);

};

MessageGroups.prototype.syncStarred = function(){

	var toSend = [], i, j;

	for(i in this._items){

		if(!this._items[i].starred) continue;
		for(j in this._items[i].messages) if(!this._items[i].messages[j].isTrash() && !this._items[i].messages[j].starred) toSend.push(this._items[i].messages[j]);

	}

	toSend.length && E.emails.setStarred(toSend, true);

};

MessageGroups.prototype.getSelected = function(){

	var res = [];
	for(var i in this._items) this._items[i].digest && this._items[i].digest.selected && res.push(this._items[i]);
	return res;

};

MessageGroups.prototype._delete = function(group){

	for(var i in this._items){

		if(this._items[i] !== group) continue;
		this._items.splice(i, 1);
		return true;

	}

	return false;

};

MessageGroups.prototype.removeMessages = function(messages){

	messages instanceof Array || (messages = [messages]);
	var i, j;

	for(i in messages){

		if(!messages[i].group) continue;

		for(j = messages[i].group.messages.length - 1; j >= 0; j--){

			if(messages[i].group.messages[j] !== messages[i]) continue;
			messages[i].group.messages.splice(j, 1);
			messages[i].group.messages.length || this._delete(messages[i].group);
			break;

		}

	}

};

//Messages Group

var MessageGroup = function(data){

	this.messages = [data];
	return true;

};

MessageGroup.prototype.removeDigest = function(){

	if(!this.digest) return;
	this.digest.remove();
	delete(this.digest);

};

MessageGroup.prototype.hasAttaches = function(){

	for(var i in this.messages) if(this.messages[i].attachesIds) return true;
	return false;

};

MessageGroup.prototype.originalFolder = function(){

	var res = null;
	for(var i in this.messages) [1, 2, 3, 4].indexOf(F.byId(this.messages[i].folder, true)) < 0 && (res = this.messages[i].folder);
	return res;

};

MessageGroup.prototype.isTrashOnly = function(){

	for(var i in this.messages) if(!this.messages[i].isTrash()) return false;
	return true;

};

MessageGroup.prototype.lastReceivedMessage = function(){

	for(var i = 0; i < this.messages.length; i++) if(!U.isMe(this.messages[i].getSender())) return this.messages[i];
	return this.messages[0];

};

MessageGroup.prototype.messagesForFolder = function(folderId){

	var i, count = 0;
	for(i = 0; i < this.messages.length; i++) this.messages[i].folder === folderId && count++;
	return count;

};

MessageGroup.prototype.allMembers = function(skipMe){

	var aggr = {}, res = [], i;
	skipMe = skipMe || false;

	for(i in this.messages) this.messages[i].membersAddresses().forEach(function(address){

		if(skipMe && U.isMe(address)) return;
		aggr[address] = true;

	});

	for(i in aggr) res.push(i);
	return res;

};

MessageGroup.prototype.isLastVisible = function(data){

	for(var i = 0; i < this.messages.length; i++){

		if(!this.messages[i].isVisible()) continue;
		return this.messages[i] === data ? true : false;

	}

};