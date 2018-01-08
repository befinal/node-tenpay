const crypto = require('crypto');
const xml2js = require('xml2js');

exports.decrypt = (encryptedData, key, iv = '') => {
  let decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
      decipher.setAutoPadding(true);
  let decoded = decipher.update(encryptedData, 'base64', 'utf8');
      decoded += decipher.final('utf8');
  return decoded;
}

exports.md5 = (str, encoding = 'utf8') => crypto.createHash('md5').update(str, encoding).digest('hex');

exports.checkXML = str => {
  let reg = /^(<\?xml.*\?>)?(\r?\n)*<xml>(.|\r?\n)*<\/xml>$/i;
  return reg.test(str.trim());
}

exports.getFullDate = () => {
  const str = new Date();
  let YYYY = str.getFullYear();
  let MM = ('00' + (str.getMonth() + 1)).substr(-2);
  let DD = ('00' + str.getDate()).substr(-2);
  return YYYY + MM + DD;
}

exports.toQueryString = (obj) => Object.keys(obj)
  .filter(key => key !== 'sign' && obj[key] !== undefined && obj[key] !== '')
  .sort()
  .map(key => key + '=' + obj[key])
  .join('&');

exports.generate = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let noceStr = '', maxPos = chars.length;
  while (length--) noceStr += chars[Math.random() * maxPos |0];
  return noceStr;
}

exports.buildXML = (obj, rootName = 'xml') => {
  const opt = {rootName, allowSurrogateChars: true, cdata: true};
  return new xml2js.Builder(opt).buildObject(obj);
}

exports.parseXML = (xml) => new Promise((resolve, reject) => {
  const opt = {trim: true, explicitArray: false, explicitRoot: false};
  xml2js.parseString(xml, opt, (err, res) => err ? reject(new Error('XMLDataError')) : resolve(res || {}));
})
