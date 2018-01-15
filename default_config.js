module.exports = {
  appid: 'appid',
  mchid: '微信支付商户号',
  partnerKey: '商户密钥',
  pfx: require('fs').readFileSync('证书文件路径'),
  openid: '测试用openid'
};
