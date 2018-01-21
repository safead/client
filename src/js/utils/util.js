'use strict';

/*
 * Convert binary string into an byte buffer.
 * @param {string} s - input string.
 * @return {Uint8Array} Byte buffer.
*/

function s2b(s){

	var b = new Uint8Array(s.length);

	for(var i = 0; i < s.length; i++){

		var c = s.charCodeAt(i);
		if(c > 255) throw new Error('Wide characters are not allowed');
		b[i] = c;

	}

	return b;

}

/*
 * Encode Unicode-string into an UTF8-encoded buffer.
 * @param {string} s - input string.
 * @return {Uint8Array} Byte buffer.
*/

function u2b(s){

	return s2b(unescape(encodeURIComponent(s)));

}

/*
 * Decode Base64 URL-safe string into a byte buffer.
 * @param {string} s - input Base64 URL-safe string.
 * @return {Uint8Array} Byte buffer.
*/

function a2b(s){

	s += '===', s = s.slice(0, -s.length % 4);
	return s2b(atob(s.replace(/-/g, '+').replace(/_/g, '/')));

}

/*
 * Parse HEX-string into a byte buffer.
 * @param {string} s - input HEX-string.
 * @return {Uint8Array} Byte buffer.
*/

function x2b(s){

	if(s.length % 2) s = '0'+s;
	var b = new Uint8Array(s.length/2);
	for(var i = 0; i < s.length; i += 2) b[i>>1] = parseInt(s.substr(i,2), 16);
	return b;

}

/*
 * Convert byte buffer into a binary string.
 * @param {(ArrayBuffer|Uint8Array)} ab - input binary buffer.
 * @return {string} Binary string.
*/

function b2s(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab, s = '';
	for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
	return s;

}

/*
 * Decode UTF8-encoded byte buffer into an Unicode-string.
 * @param {(ArrayBuffer|Uint8Array)} ab - input binary buffer.
 * @return {string} Unicode string.
*/

function b2u(ab){

	return decodeURIComponent(escape(b2s(ab)));

}

/*
 * Encode byte buffer into Base64 URL-safe string.
 * @param {(ArrayBuffer|Uint8Array)} ab - input binary buffer.
 * @return {string} Base64 URL-safe string.
*/

function b2a(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab;
	return btoa(b2s(b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

}

/*
 * Encode byte buffer into a HEX-string.
 * @param {(ArrayBuffer|Uint8Array)} ab - input binary buffer.
 * @return {string} HEX string.
*/

function b2x(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab, s = '';

	for(var i = 0; i < b.length; i++){

		var h = b[i].toString(16);
		if(h.length < 2) s += '0';
		s += h;

	}

	return s;

}

/*
 * Like <code>window.btoa</code>, but encode into Base64 URL-safe format.
 * @param {string} s - input binary string.
 * @return {string} Base64 URL-safe string.
 * @see <code>window.btoa</code>
*/

function u2a(s){

	return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

}

/*
 * Like <code>window.atob</code>, but decode from Base64 URL-safe format.
 * @param {string} s - input Base64 URL-safe string.
 * @return {string} binary string.
 * @see <code>window.atob</code>
*/

function a2u(s){

	s += '===', s = s.slice(0, -s.length % 4);
	return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

}

/*
 * Merge one or more objects in the first one
 * @param {Object} obj - the object to mixin to
 * @param {Object..} mix - one or more object to being mixed in
 * @return {Object} the first argument <code>obj</code>
*/

function mixin(obj){

	for(var i = 1; i < arguments.length; i++) for(var k in arguments[i]) obj[k] = arguments[i][k];
	return obj;

}

// Z-Base32 alphabet

var _b2z_alphabet = 'ybndrfg8ejkmcpqxot1uwisza345h769'.split('');

/*
 * Encode the supplied buffer into Z-Base32 string.
 * @param {(ArrayBuffer|Uint8Array)} ab - input buffer.
 * @return {string} Z-Base32 string.
*/

function b2z(ab){

	var b = (ab instanceof ArrayBuffer) ? new Uint8Array(ab) : ab, s = '';

	for(var i = 5, c = b[0], l = b.length * 8, j, k; i < l; i += 5){

		j = i >> 3, k = i & 7;
		s += _b2z_alphabet[( c << k | b[j] >> (8 - k)) & 0x1f];
		c = b[j];

	}

	if((k = i & 7) % 5) s += _b2z_alphabet[(c << k) & 0x1f];
	return s;

}

function b64EncodeUnicode(str){

	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1){

		return String.fromCharCode('0x' + p1);

	}));

}

function b64DecodeUnicode(str){

	return decodeURIComponent(atob(str).split('').map(function(c){

		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);

	}).join(''));

}

function e2s(aesPacket){

	return b2a(msgpack.pack([aesPacket.v, aesPacket.iv, aesPacket.data, aesPacket.tag]));

}

function s2e(strPacket){

	var packet = msgpack.unpack(a2b(strPacket));
	return {v: packet[0], iv: packet[1], data: packet[2], tag: packet[3]};

}