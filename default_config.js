var fs = require('fs');

module.exports = {
  wechat: {
    appid: 'appid',
    mchid: '商户id',
    partnerKey: '商户密钥',
    pfx: fs.readFileSync('证书文件路径')
  },
  openid: '测试用openid'
}
