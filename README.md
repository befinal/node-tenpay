# 微信支付 for nodejs

- `支付结果通知` - 支持Express和Koa(仅支持node 8.0.0以上版本)
- `微信支付API` - 支持使用await/async和promise/then方式调用

[![npm](https://img.shields.io/npm/v/tenpay.svg)](https://www.npmjs.com/package/tenpay) [![node](https://img.shields.io/node/v/tenpay.svg)](http://nodejs.org/download/)


## 使用前必读
#### 关于传入值和微信返回值的数据类型
> 因涉及金额等敏感问题, API和中间件并没有对数据字段做类型转换
> `微信返回值XML做JSON转换之后的字段均为字符串类型, 请自行转换后再进行数据运算`

- **重点:** `'1' + 0 = '10'`
- **重点:** `微信支付中传入的金额单位为分, 请注意查阅官方文档`

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
```
npm i tenpay
```
## 初始化
```
const tenpay = require('tenpay');
const config = {
  appid: '公众号ID',
  mchid: '微信商户号',
  partnerKey: '微信支付安全密钥',
  pfx: require('fs').readFileSync('证书文件路径'),
  notify_url: '支付回调网址',
  spbill_create_ip: 'IP地址'
}
const api = new tenpay(config);
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

## 中间件 • 微信通知()
```
// middleware参数: 'pay'-支付结果通知<默认>, 'refund'-退款结果通知

// Express中使用
app.use('/xxx', api.middlewareForExpress('pay'), (req, res) => {
  let info = req.weixin;
})

// Koa中使用
app.use('/xxx', app.middleware('refund'), async ctx => {
  let info = ctx.request.weixin;
})
```

## API 列表
- 某些API预设了某些必传字段的默认值, 调用时不传参数则使用默认值
- 初始化时已传入的参数无需调用时重复传入, 如`appid` `mchid`
- 签名(sign)会在调用API时自动处理, 无需手动传入
- 随机字符串(nonce_str)会在调用API时自动处理, 无需手动传入

### getPayParams: 获取微信JSSDK支付参数
```
let result = await api.getPayParams({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100,
  openid: '付款用户的openid'
});
```
##### 相关默认值:
- `trade_type` - JSAPI

### micropay: 扫码支付
```
let result = await api.micropay({
  out_trade_no: '商户内部订单号',
  body: '商品简单描述',
  total_fee: 100,
  auth_code: '1234567890123'
});
```
### unifiedOrder: 微信统一下单
```
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
```
let result = await api.orderQuery({
  // transaction_id: '微信的订单号',
  out_trade_no: '商户内部订单号'
});
```
### closeOrder: 关闭订单
```
let result = await api.closeOrder({
  out_trade_no: '商户内部订单号'
});
```
### refund: 申请退款
```
let result = await api.refund({
  // transaction_id: '微信的订单号',
  out_trade_no: '商户内部订单号',
  out_refund_no: '商户内部退款单号',
  total_fee: 100,
  refund_fee: 100
});
```
##### 相关默认值:
- `op_user_id` - 默认为商户号(mchid)

### refundQuery: 查询退款
```
let result = await api.refundQuery({
  // 以下参数4选1
  // transaction_id: '微信的订单号',
  // out_trade_no: '商户内部订单号',
  // out_refund_no: '商户内部退款单号',
  refund_id: '微信退款单号'
});
```
### downloadBill: 下载对帐单
```
// 新增一个format参数: true/false, 不传此参数则默认为false
// format = true时, 如果对帐单存在则会对数据进行格式化返回一个json: {total_title, total_data, list_title, list_data}
// total_title: 统计数据的标题数组["总交易单数","总交易额","总退款金额", ...];
// total_data: 统计数据的数组["3", "88.00", "0.00", ...]
// list_title: 详细数据的标题数组["﻿交易时间","公众账号ID","商户号", ...];
// list_data: 详细数据的二维数据[["2017-12-26 19:20:39","wx12345", "12345", ...], ...];

let result = await api.downloadBill({
  bill_date: '账单的日期'
}, format);
```
##### 相关默认值:
- `bill_type` - ALL
- `format` - false

### transfers: 企业付款
```
let result = await api.transfers({
  partner_trade_no: '商户内部付款订单号',
  openid: '用户openid',
  re_user_name: '用户真实姓名',
  amount: 100,
  desc: '企业付款描述信息',
});
```
##### 相关默认值:
- `check_name` - OPTION_CHECK
- `spbill_create_ip` - 默认为初始化时传入的值或`127.0.0.1`

### transfersQuery: 查询企业付款
```
let result = await api.transfersQuery({
  partner_trade_no: '商户内部付款订单号'
});
```
### sendRedpack: 发放普通红包
```
let result = await api.sendRedpack({
  // mch_billno和mch_autono二选一
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
- `scene_id` - 空, 当红包金额大于`200元`时必传

### sendGroupRedpack: 发放裂变红包
```
let result = await api.sendGroupRedpack({
  // mch_billno和mch_autono二选一
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
- `scene_id` - 空, 当红包金额大于`200元`时必传(文档中未说明)

### redpackQuery: 查询红包记录
```
api.redpackQuery({
  mch_billno: '商户内部付款订单号'
});
```
##### 相关默认值:
- `bill_type` - MCHT
