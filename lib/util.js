const xml2js = require('xml2js');

exports.formatToWechatTime = () => {
	let str = new Date();
	let YYYY = str.getFullYear();
	let MM = ('00' + (str.getMonth() + 1)).substr(-2);
	let DD = ('00' + str.getDate()).substr(-2);
	return YYYY + MM + DD;
}

exports.toQueryString = (obj) => {
	return Object.keys(obj)
		.filter(key => key != 'sign' && obj[key] !== undefined && obj[key] !== '')
		.sort()
		.map(key => key + '=' + obj[key])
		.join('&');
}

exports.generateX = (length = 32) => {
	let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let noceStr = '', maxPos = chars.length;
	while (length--) noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	return noceStr;
}

exports.generate = (length = 16) => Math.random().toString(36).substr(2, length);

exports.buildXML = (obj) => {
	let builder = new xml2js.Builder({allowSurrogateChars: true});
	return builder.buildObject({xml:obj});
}

exports.parseXML = (xml) => new Promise((resolve, reject) => {
	xml2js.parseString(xml, {trim: true, explicitArray: false}, (err, result) => {
		err ? reject(err) : resolve(result ? result.xml : {});
	});
})