# 微信支付 for nodejs

- `支付结果通知` - 支持Express或Koa
- `微信支付API` - 支持使用callback或yield形式(co或Koa中使用)

[![npm](https://img.shields.io/npm/v/tenpay.svg)](https://www.npmjs.com/package/tenpay)
[![node](https://img.shields.io/node/v/tenpay.svg)](http://nodejs.org/download/)

- `2017-11-01` 增加扫码支付API
- `2016-11-29` 增加微信红包相关API
- `2016-11-28` 增加微信企业付款相关API

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

	npm install tenpay

## 初始化

	var tenpay = require('tenpay');
	var config = {
		appid: '公众号ID',
		mchid: '微信商户号',
		partnerKey: '微信支付安全密钥',
		pfx: require('fs').readFileSync('证书文件路径'),
		notify_url: '支付回调网址',
		spbill_create_ip: 'IP地址'
	}
	var api = new tenpay(config);

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
	- 调用相关API时, 若调用和初始化时均无此参数则返回错误
- `spbill_create_ip` - IP地址(选填)
	- 可以在初始化的时候传入设为默认值, 不传则默认值为`127.0.0.1`
	- 调用相关API时传入新值则使用新值

#### 可选参数最佳实践:
- 如业务流程中用到含证书请求的API, 则必须在初始时传入pfx参数
- 如回调地址不需要按业务变化, 建议在初始化时传入统一的回调地址
- 如IP地址不需要按业务变化, 建议在初始化时传入统一的IP地址

## 微信支付结果通知 • 中间件

	// Express
	var middleware = api.middlewareForExpress();
	app.use('/xxx', middleware, function (req, res) {
		var payInfo = req.weixin;
	})

	// Koa
	var middleware = api.middleware();

## API 使用说明

- 某些API预设了某些必传字段的默认值, 调用时不传参数则使用默认值
- 初始化时已传入的参数无需调用时重复传入, 如`appid` `mchid`
- 签名(sign)会在调用API时自动处理, 无需手动传入
- 随机字符串(nonce_str)会在调用API时自动处理, 无需手动传入

#### promise方式调用(使用co或在Koa中使用)

	var result = yield api.getPayParams(order);

#### callback方式调用

	api.getPayParams(order, callback);

## API 列表

### getPayParams: 获取微信JSSDK支付参数

	var order = {
		out_trade_no: '商户内部订单号',
		body: '商品简单描述',
		total_fee: 100,
		openid: '付款用户的openid'
	}
	api.getPayParams(order, callback);

##### 相关默认值:
- `trade_type` - JSAPI

### micropay: 扫码支付

	var order = {
		out_trade_no: '商户内部订单号',
		body: '商品简单描述',
		total_fee: 100
		auth_code: '1234567890123'
	}
	api.micropay(order, callback);

### unifiedOrder: 微信统一下单

	var order = {
		out_trade_no: '商户内部订单号',
		body: '商品简单描述',
		total_fee: 100
	}
	api.unifiedOrder(order, callback);

##### 相关默认值:
- `trade_type` - JSAPI
- `notify_url` - 默认为初始化时传入的值或空
- `spbill_create_ip` - 默认为初始化时传入的值或`127.0.0.1`

### orderQuery: 查询订单

	var order = {
		// transaction_id: '微信的订单号',
		out_trade_no: '商户内部订单号'
	}
	api.orderQuery(order, callback);

### closeOrder: 关闭订单

	var order = {
		out_trade_no: '商户内部订单号'
	}
	api.closeOrder(order, callback);

### refund: 申请退款

	var order = {
		// transaction_id: '微信的订单号',
		out_trade_no: '商户内部订单号',
		out_refund_no: '商户内部退款单号',
		total_fee: 100,
		refund_fee: 100,
	}
	api.refund(order, callback);

##### 相关默认值:
- `op_user_id` - 默认为商户号(mchid)

### refundQuery: 查询退款

	var order = {
		// 以下参数4选1
		// transaction_id: '微信的订单号',
		// out_trade_no: '商户内部订单号',
		// out_refund_no: '商户内部退款单号',
		refund_id: '微信退款单号'
	}
	api.refundQuery(order, callback);

### downloadBill: 下载对帐单

	var order = {
		bill_date: '账单的日期'
	}
	api.downloadBill(order, callback);

##### 相关默认值:
- `bill_type` - ALL

### transfers: 企业付款

	var order = {
		partner_trade_no: '商户内部付款订单号',
		openid: '用户openid',
		re_user_name: '用户真实姓名',
		amount: 100,
		desc: '企业付款描述信息',
	}
	api.transfers(order, callback);

##### 相关默认值:
- `check_name` - OPTION_CHECK
- `spbill_create_ip` - 默认为初始化时传入的值或`127.0.0.1`

### transfersQuery: 查询企业付款

	var order = {
		partner_trade_no: '商户内部付款订单号'
	}
	api.transfersQuery(order, callback);

### sendRedpack: 发放普通红包

	var order = {
		// mch_billno和mch_autono二选一
		// mch_billno: '商户内部付款订单号',
		mch_autono: '10位当日唯一数字',
		send_name: '商户名称',
		re_openid: '用户openid',
		total_amount: <付款金额(分)>,
		wishing: '红包祝福语',
		act_name: '活动名称',
		remark: '备注信息'
	}
	api.sendRedpack(order, callback);

##### 相关默认值和其它说明:
- `mch_billno` - 商户内部订单号(传入则mch_autono失效)
- `mch_autono` - 当日10位唯一数字, 用于自动处理商户内部订单号逻辑, 用于取代mch_billno参数
- `total_num` - 1
- `client_ip` - 默认为初始化时的spbill_create_ip参数值或`127.0.0.1`
- `scene_id` - 空, 当红包金额大于`200元`时必传

### sendGroupRedpack: 发放裂变红包

	var order = {
		// mch_billno和mch_autono二选一
		// mch_billno: '商户内部付款订单号',
		mch_autono: '10位当日唯一数字',
		send_name: '商户名称',
		re_openid: '种子用户openid',
		total_amount: <付款金额(分)>,
		wishing: '红包祝福语',
		act_name: '活动名称',
		remark: '备注信息'
	}
	api.sendGroupRedpack(order, callback);

##### 相关默认值和其它说明:
- `mch_billno` - 商户内部订单号(传入则mch_autono失效)
- `mch_autono` - 当日10位唯一数字, 用于自动处理商户内部订单号逻辑, 用于取代mch_billno参数
- `total_num` - 3
- `amt_type` - ALL_RAND
- `scene_id` - 空, 当红包金额大于`200元`时必传(文档中未说明)

### redpackQuery: 查询红包记录

	var order = {
		mch_billno: '商户内部付款订单号'
	}
	api.redpackQuery(order, callback);

##### 相关默认值:
- `bill_type` - MCHT