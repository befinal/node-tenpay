# 微信支付 for nodejs
[![travis][travis]][travis-u] [![npm][npm]][npm-u] [![node][node]][node-u] [![issues][issues]][issues-u] [![commit][commit]][commit-u]

- `中间件` - 支付结果通知, 退款结果通知
- `获取前端支付参数` - 支持JSSDK, WeixinJSBridge, 小程序, APP
- `微信支付` `刷卡支付` `扫码支付` `微信红包` `企业付款`
- `微信对帐单下载` - 支持数据格式化

## 使用前必读
#### 版本要求
nodejs >= 8.3.0

#### 关于传入值和微信返回值的数据类型
> 因涉及金额等敏感问题, API和中间件并没有对数据字段做类型转换
>
> `微信返回值XML做JSON转换之后的字段均为字符串类型, 请自行转换后再进行数据运算`

#### 重点关注问题
- 字符串与数字运算结果问题 `'1' + 0 = '10'`
- 金额单位问题 `微信支付中传入的金额单位为分`

#### 关于错误
> API和中间件均对所有错误进行了处理, 统一通过error返回, 包括:

- `网络类错误` - 网络中断, 连接超时等
- `微信返回值检验错误` - 微信返回值非法(伪造请求等, 可能性非常低)
- `业务逻辑错误` - 订单重复, 退款金额大于支付金额等
- `其它错误` - 应传参数未传入等

#### 关于返回值
> 未出错时正常返回为JSON格式数据

- **特殊情况:** `downloadBill` 下载对帐单, 返回值为字符串文本

## 安装
```Bash
npm i tenpay

# 如已安装旧版, 重新安装最新版
npm i tenpay@latest
```

## 实例化
```javascript
const tenpay = require('tenpay');
const config = {
  appid: '公众号ID',
  mchid: '微信商户号',
  partnerKey: '微信支付安全密钥',
  pfx: require('fs').readFileSync('证书文件路径'),
  notify_url: '支付回调网址',
  spbill_create_ip: 'IP地址'
};
const api = new tenpay(config);

// init调用: 用于多帐号省略new关键字, tenpay.init(config)返回一个新的实例对象
await tenpay.init(config).some_api();
```

#### config说明:
- `appid` - 公众号ID(必填)
- `mchid` - 微信商户号(必填)
- `partnerKey` - 微信支付安全密钥(必填, 在微信商户管理界面获取)
- `pfx` - 证书文件(选填, 在微信商户管理界面获取)
  - 当不需要调用依赖证书的API时可不填此参数
  - 若业务流程中使用了依赖证书的API则需要在初始化时传入此参数
- `notify_url` - 支付结果通知回调地址(选填)
  - 可以在初始化的时候传入设为默认值, 不传则需在调用相关API时传入
  - 调用相关API时传入新值则使用新值
- `spbill_create_ip` - IP地址(选填)
  - 可以在初始化的时候传入设为默认值, 不传则默认值为`127.0.0.1`
  - 调用相关API时传入新值则使用新值

#### 关于可选参数的最佳实践:
- 如业务流程中用到含证书请求的API, 则必须在初始时传入pfx参数
- 如回调地址不需要按业务变化, 建议在初始化时传入统一的回调地址
- 如IP地址不需要按业务变化, 建议在初始化时传入统一的IP地址

## 中间件・微信通知(支付结果/退款结果)
- middleware参数: `pay<支付结果通知, 默认>` `refund<退款结果通知>` `nativePay<扫码支付模式一回调>`
- 需自行添加bodyParser接收post data
- reply()会自动封装SUCCESS消息, reply('some error_msg')会自动封装FAIL消息

#### Express中使用
```javascript
app.use(bodyParser.text({type: '*/xml'}));

router.post('/xxx', api.middlewareForExpress('pay'), (req, res) => {
  let info = req.weixin;

  // 业务逻辑...

  // 回复成功消息
  res.reply();
  // 回复错误消息
  // res.reply('错误信息');
});
```

#### Koa中使用
```javascript
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  extendTypes: {
    text: ['text/xml', 'application/xml']
  }
}));

router.post('/xxx', api.middleware('refund'), async ctx => {
  let info = ctx.request.weixin;

  // 业务逻辑...

  // 回复成功消息
  ctx.reply();
  // 回复错误消息
  // ctx.reply('错误信息');
});
```

## API 列表
- 某些API预设了某些必传字段的默认值, 调用时不传参数则使用默认值
- 初始化时已传入的参数无需调用时重复传入, 如`appid` `mchid`
- 签名(sign)会在调用API时自动处理, 无需手动传入
- 随机字符串(nonce_str)会在调用API时自动处理, 无需手动传入

### getPayParams: 获取微信JSSDK支付参数(自动下单, 兼容小程序)
```javascript
let result = await api.getPayParams({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100,
  openid: '付款用户的openid'
});
```
##### 相关默认值:
- `trade_type` - JSAPI

### getPayParamsByPrepay: 获取微信JSSDK支付参数(通过预支付会话标识, 兼容小程序)
```javascript
// 该方法需先调用api.unifiedOrder统一下单, 获取prepay_id;
let result = await api.getPayParamsByPrepay({
  prepay_id: '预支付会话标识'
});
```

### getAppParams: 获取APP支付参数(自动下单)
```javascript
let result = await api.getAppParams({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100
});
```
##### 相关默认值:
- `trade_type` - APP

### getAppParamsByPrepay: 获取APP支付参数(通过预支付会话标识)
```javascript
// 该方法需先调用api.unifiedOrder统一下单<注意传入trade_type: 'APP'>, 获取prepay_id;
let result = await api.getAppParamsByPrepay({
  prepay_id: '预支付会话标识'
});
```

### micropay: 扫码支付
```javascript
let result = await api.micropay({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100,
  auth_code: '1234567890123'
});
```

### unifiedOrder: 微信统一下单
```javascript
let result = await api.unifiedOrder({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100,
  openid: '用户openid'
});
```
##### 相关默认值:
- `trade_type` - JSAPI
- `notify_url` - 默认为初始化时传入的值或空
- `spbill_create_ip` - 默认为初始化时传入的值或`127.0.0.1`

### orderQuery: 查询订单
```javascript
let result = await api.orderQuery({
  // transaction_id, out_trade_no 二选一
  // transaction_id: '微信的订单号',
  out_trade_no: '商户内部订单号'
});
```

### reverse: 撤消订单
```javascript
let result = await api.reverse({
  // transaction_id, out_trade_no 二选一
  // transaction_id: '微信的订单号',
  out_trade_no: '商户内部订单号'
});
```

### closeOrder: 关闭订单
```javascript
let result = await api.closeOrder({
  out_trade_no: '商户内部订单号'
});
```

### refund: 申请退款
```javascript
let result = await api.refund({
  // transaction_id, out_trade_no 二选一
  // transaction_id: '微信的订单号',
  out_trade_no: '商户内部订单号',
  out_refund_no: '商户内部退款单号',
  total_fee: 100,
  refund_fee: 100
});
```
##### 相关默认值:
- `op_user_id` - 默认为商户号(此字段在小程序支付文档中出现)

### refundQuery: 查询退款
```javascript
let result = await api.refundQuery({
  // 以下参数 四选一
  // transaction_id: '微信的订单号',
  // out_trade_no: '商户内部订单号',
  // out_refund_no: '商户内部退款单号',
  refund_id: '微信退款单号'
});
```

### downloadBill: 下载对帐单
```javascript
/**
 * 新增一个format参数(默认: false), 用于自动转化帐单为json格式
 * json.total_title: 统计数据的标题数组 - ["总交易单数","总交易额","总退款金额", ...],
 * json.total_data: 统计数据的数组 - ["3", "88.00", "0.00", ...],
 * json.list_title: 详细数据的标题数组 - ["﻿交易时间","公众账号ID","商户号", ...],
 * json.list_data: 详细数据的二维数据 - [["2017-12-26 19:20:39","wx12345", "12345", ...], ...]
 */
let result = await api.downloadBill({
  bill_date: '账单的日期'
}, true);
```
##### 相关默认值:
- `bill_type` - ALL
- `format` - false

### transfers: 企业付款
```javascript
let result = await api.transfers({
  partner_trade_no: '商户内部付款订单号',
  openid: '用户openid',
  re_user_name: '用户真实姓名',
  amount: 100,
  desc: '企业付款描述信息'
});
```
##### 相关默认值:
- `check_name` - OPTION_CHECK
- `spbill_create_ip` - 默认为初始化时传入的值或`127.0.0.1`

### transfersQuery: 查询企业付款
```javascript
let result = await api.transfersQuery({
  partner_trade_no: '商户内部付款订单号'
});
```

### sendRedpack: 发放普通红包
```javascript
let result = await api.sendRedpack({
  // mch_billno, mch_autono 二选一
  // mch_billno: '商户内部付款订单号',
  mch_autono: '10位当日唯一数字',
  send_name: '商户名称',
  re_openid: '用户openid',
  total_amount: <付款金额(分)>,
  wishing: '红包祝福语',
  act_name: '活动名称',
  remark: '备注信息'
});
```
##### 相关默认值和其它说明:
- `mch_billno` - 商户内部订单号(传入则mch_autono失效)
- `mch_autono` - 当日10位唯一数字, 用于自动处理商户内部订单号逻辑
- `total_num` - 1
- `client_ip` - 默认为初始化时的spbill_create_ip参数值或`127.0.0.1`
- `scene_id` - 空, 当红包金额大于`2元`时必传(微信文档说明为200元, 实测为2元)

### sendGroupRedpack: 发放裂变红包
```javascript
let result = await api.sendGroupRedpack({
  // mch_billno, mch_autono 二选一
  // mch_billno: '商户内部付款订单号',
  mch_autono: '10位当日唯一数字',
  send_name: '商户名称',
  re_openid: '种子用户openid',
  total_amount: <付款金额(分)>,
  wishing: '红包祝福语',
  act_name: '活动名称',
  remark: '备注信息'
});
```
##### 相关默认值和其它说明:
- `mch_billno` - 商户内部订单号(传入则mch_autono失效)
- `mch_autono` - 当日10位唯一数字, 用于自动处理商户内部订单号逻辑
- `total_num` - 3, 分裂红包要求值为3~20之间
- `amt_type` - ALL_RAND
- `scene_id` - 空, 当红包金额大于`2元`时必传(文档中未说明)

### redpackQuery: 查询红包记录
```javascript
api.redpackQuery({
  mch_billno: '商户内部付款订单号'
});
```
##### 相关默认值:
- `bill_type` - MCHT

[travis]: https://img.shields.io/travis/befinal/node-tenpay.svg
[travis-u]: https://travis-ci.org/befinal/node-tenpay

[npm]: https://img.shields.io/npm/v/tenpay.svg
[npm-u]: https://www.npmjs.com/package/tenpay

[node]: https://img.shields.io/node/v/tenpay.svg
[node-u]: https://nodejs.org/en/download/

[commit]: https://img.shields.io/github/last-commit/befinal/node-tenpay.svg
[commit-u]: https://github.com/befinal/node-tenpay/commits/master

[issues]: https://img.shields.io/github/issues/befinal/node-tenpay.svg
[issues-u]: https://github.com/befinal/node-tenpay/issues

[downloads]: https://img.shields.io/npm/dm/tenpay.svg
