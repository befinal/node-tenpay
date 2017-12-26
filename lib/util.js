var xml2js = require('xml2js');

exports.formatToWechatTime = function() {
	var str = new Date();
	var year = str.getFullYear();
	var month = ('0' + (str.getMonth() + 1)).substr(-2);
	var date = ('0' + str.getDate()).substr(-2);
	return year + month + date;
}

exports.toQueryString = function(obj) {
	return Object.keys(obj).filter(function (key) {
		return key != 'sign' && obj[key] !== undefined && obj[key] !== '';
	}).sort().map(function (key) {
		return key + '=' + obj[key];
	}).join('&');
};

exports.generateNonceStr = function(length) {
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var maxPos = chars.length;
	var noceStr = '';
	for (var i = 0; i < (length || 32); i++) {
		noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return noceStr;
};

exports.buildXML = function(obj) {
	var builder = new xml2js.Builder({allowSurrogateChars: true});
	return builder.buildObject({xml:obj});
};

exports.parseXML = function(xml, callback) {
	xml2js.parseString(xml, {trim: true, explicitArray: false}, function(err, result) {
		err ? callback(err) : callback(null, result ? result.xml : {});
	});
};