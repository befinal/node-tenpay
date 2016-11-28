# 微信支付 for nodejs
* 支付消息通知: 支持Express或Koa
* API调用: 支持使用callback或yield形式(co或Koa中使用)

[![npm](https://img.shields.io/npm/v/tenpay.svg)](https://www.npmjs.com/package/tenpay)
[![node](https://img.shields.io/node/v/tenpay.svg)](http://nodejs.org/download/)

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

### config说明:
* appid: 公众号ID(必填)
* mchid: 微信商户号(必填)
* partnerKey: 微信支付安全密钥(必填, 在微信商户管理界面获取)
* pfx: 证书文件(选填, 在微信商户管理界面获取)
	* 当不需要调用必须依赖证书的API时可不填此参数
* notify_url: 支付结果通知回调地址(选填)
	* 部分API需要回调地址
	* 可以在初始化的时候传入(设为默认值, 以后不传则使用该值)
	* 也可在调用相关API的时候再传入(会覆盖初始化的时候传入的值)
* spbill_create_ip: IP地址(选填)
	* 部分API需要IP地址
	* 可以在初始化的时候传入(设为默认值, 以后不传则使用该值或127.0.0.1)
	* 也可以在调用相关API的时候传入(会覆盖初始化的时候传入的值)

## 支付回调中间件:

	// Koa中间件
	var middleware = api.middleware();
	app.use(middleware, function *() {
		var payInfo = this.wexin;
	})
	
	// Express中间件
	var middleware = api.middlewareForExpress();
	app.use(middleware, function (req, res) {
		var payInfo = req.weixin;
	}) 

## API 使用说明
* 某些API预设了某些必传字段的默认值, 不传则使用默认值, 可在API示例中查看相关默认值说明
* 初始化时已传入的参数无需调用时重复传入, 如appid, mchid
* sign: 签名会在调用API时自动处理, 无需手动处理后传入
* nonce_str: 随机字符串会在调用API时自动处理, 无需手动处理后传入

##### promise方式调用(使用co或在Koa中使用)

	var result = yield api.getPayParams(order);

##### callback方式调用

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
* trade_type: JSAPI
	
### unifiedOrder: 微信统一下单

	var order = {
		out_trade_no: '商户内部订单号',
		body: '商品简单描述',
		total_fee: 100
	}
	api.unifiedOrder(order, callback);

##### 相关默认值:
* trade_type: JSAPI
* notify_url: 初始化时填入值, 未填入则无
* spbill_create_ip: 初始化时填入值, 未填入则为127.0.0.1

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
* op_user_id: 操作员帐号, 不传则默认为商户号(mchid)

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
* bill_type: 账单类型, 默认为ALL, 可选SUCCESS或REFUND

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
* check_name: 校验用户姓名选项, 默认OPTION_CHECK
* spbill_create_ip: 初始化时填入值, 未填入则为127.0.0.1

### transfersQuery: 查询企业付款

	var order = {
		partner_trade_no: '商户内部付款订单号'
	}
	api.transfersQuery(order, callback);

