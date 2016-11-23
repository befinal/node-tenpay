/**
 * 微信支付API
 * @author Eric
 */
var crypto = require('crypto');
var urllib = require('urllib');
var getRawBody = require('raw-body');
var ulits = require('./ulits');

var URLS = {
	unifiedorder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
	orderquery: 'https://api.mch.weixin.qq.com/pay/orderquery',
	closeorder: 'https://api.mch.weixin.qq.com/pay/closeorder',
	refund: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
	refundquery: 'https://api.mch.weixin.qq.com/pay/refundquery',
	downloadbill: 'https://api.mch.weixin.qq.com/pay/downloadbill',
	transfers: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers',
	gettransferinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo'
}

var API = function(config) {
	this.appid = config.appid;
	this.mchid = config.mchid;
	this.partnerKey = config.partnerKey;
	this.passphrase = config.passphrase || config.mchid;
	this.pfx = config.pfx;
	this.notify_url = config.notify_url;
	this.spbill_create_ip = config.spbill_create_ip;
	return this;
}

// JSSDK支付签名
API.prototype.getPayParams = function(params, callback) {
	var that = this;
	if (typeof callback == 'function') return that._getPayParams(params, callback);
	// promise
	return new Promise(function(resolve, reject) {
		that._getPayParams(params, function(err, result) {
			err ? reject(err) : resolve(result);
		});
	});
};

API.prototype._getPayParams = function(params, callback) {
	var that = this;
	that.unifiedorder(params, function(err, result) {
		if (err) return callback(err);
		var pkg = Object.assign({}, {
			appId: that.appid,
			timeStamp: '' + (Date.now()/1000|0),
			nonceStr: ulits.generateNonceStr(),
			package: 'prepay_id=' + result.prepay_id,
			signType: 'MD5'
		});
		pkg.paySign = that._getSign(pkg);
		pkg.timestamp = pkg.timeStamp;
		callback(null, pkg);
	})
};

// 统一下单
API.prototype.unifiedorder = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr(),
		notify_url: params.notify_url || this.notify_url,
		spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip || '192.168.0.1'
	});
	return this._request(pkg, 'unifiedorder', callback);
};

// 订单查询
API.prototype.orderquery = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr()
	});
	return this._request(pkg, 'orderquery', callback);
};

// 关闭订单
API.prototype.closeorder = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr()
	});
	return this._request(pkg, 'closeorder', callback);
};

// 申请退款
API.prototype.refund = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr(),
		op_user_id: params.op_user_id || this.mchid
	});
	return this._request(pkg, 'refund', callback);
};

// 查询退款
API.prototype.refundquery = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr()
	});
	return this._request(pkg, 'refundquery', callback);
};

// 下载对帐单
API.prototype.downloadbill = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: ulits.generateNonceStr()
	});
	return this._request(pkg, 'downloadbill', callback);
};

// 企业付款api
API.prototype.transfers = function(params, callback) {
	var pkg = Object.assign({}, params, {
		mch_appid: this.appid,
		mchid: this.mchid,
		nonce_str: ulits.generateNonceStr(),
		check_name: params.check_name || 'OPTION_CHECK',
		spbill_create_ip: params.ip || this.ip || '192.168.0.1'
	});
	return this._request(pkg, 'transfers', callback);
};

API.prototype.get_transfers = function(params, callback) {

};

// 支付结果通知
API.prototype.middleware = function() {
	var that = this;
	return function *(next) {
		if (this.method != 'POST') throw new Error('请求来源错误');
		var xml = yield getRawBody(this.req, {
			length: this.length,
			limit: '1mb',
			encoding: this.charset
		});
		this.weixin = yield that._validatePromise(xml);
		yield next;
	};
};
// 支付结果通知forExpress
API.prototype.middlewareForExpress = function() {
	var that = this;
	return function(req, res, next) {
		if (req.method != 'POST') return next('请求来源错误');
		getRawBody(req, {
			length: req.headers['content-length'],
			limit: '1mb',
			encoding: 'utf8'
		}, function(err, xml) {
			if (err) return next(err);
			that._validate(xml, function(err, result) {
				if (err) return next(err);
				req.weixin = result;
				next();
			});
		});
	}
};

// common
API.prototype._request = function(params, type, callback) {
	var that = this;
	if (typeof callback == 'function') return that._httpRequest(params, type, callback);
	// promise
	return new Promise(function(resolve, reject) {
		that._httpRequest(params, type, function(err, result) {
			err ? reject(err) : resolve(result);
		});
	});
};

API.prototype._httpRequest = function(params, type, callback) {
	var that = this;

	var needs = [], cert = false;
	switch (type) {
		case 'unifiedorder':
			needs = ['body', 'out_trade_no', 'total_fee', 'spbill_create_ip', 'trade_type'];
			if (params.trade_type == 'JSAPI') {
				needs.push('openid');
			} else if (params.trade_type == 'NATIVE') {
				needs.push('product_id');
			}
			break;
		case 'orderquery':
			needs = ['transaction_id|out_trade_no'];
			break;
		case 'closeorder':
			needs = ['out_trade_no'];
			break;
		case 'refund':
			needs = ['transaction_id|out_trade_no', 'out_refund_no', 'total_fee', 'refund_fee', 'op_user_id'];
			cert = true;
			break;
		case 'refundquery':
			needs = ['transaction_id|out_trade_no|out_refund_no|refund_id'];
			break;
		case 'downloadbill':
			needs = ['bill_date', 'bill_type'];
			break;
		case 'transfers':
			needs = ['partner_trade_no', 'openid', 'check_name', 'amount', 'desc'];
			if (params.check_name == 'FORCE_CHECK') needs.push('re_user_name');
			cert = true;
			break;
		case 'gettransferinfo':
			break;
		default:
			callback('请求类型不存在');
	}

	// 验证参数合法且完整
	var missing = [];
	needs.forEach(function(key) {
		var keys = key.split('|');
		for (var i = 0; i < keys.length; i++) {
			if (params[keys[i]]) return;
		}
		missing.push(key);
	});
	if (missing.length) return callback('missing params: ' + missing.join(', '));

	// 安全签名
	params.sign = that._getSign(params);
	// 创建请求参数
	var pkg = {method: 'POST', data: ulits.buildXML(params)};
	// 是否需要证书
	if (cert) {
		pkg.pfx = that.pfx;
		pkg.passphrase = that.passphrase;
	}

	urllib.request(URLS[type], pkg, function(err, data, res) {
		if (err) return callback(err);
		if (type == 'transfers') {
			ulits.parseXML(data.toString(), function(err, json) {
				if (json.return_code != 'SUCCESS') return callback(json.return_msg || '消息格式错误: return_msg');
				if (json.result_code != 'SUCCESS') return callback(json.err_code || '消息格式错误: err_code');
				if (json.mch_appid !== that.appid) return callback('appid不匹配');
				if (json.mchid !== that.mchid) return callback('mch_id不匹配');
				callback(null, json);
			})
		} else {
			that._validate(data.toString(), callback);
		}
	});
};

API.prototype._validatePromise = function(xml) {
	var that = this;
	return new Promise(function(resolve, reject) {
		that._validate(xml, function(err, result) {
			err ? reject(err) : resolve(result);
		});
	});
}

API.prototype._validate = function(xml, callback) {
	var that = this;
	ulits.parseXML(xml, function (err, json) {
		if (err) return callback('XMLParseError', xml);
		if (json.return_code != 'SUCCESS') return callback(json.return_msg || '消息格式错误: return_msg');
		if (json.result_code != 'SUCCESS') return callback(json.err_code || '消息格式错误: err_code');
		if (json.appid !== that.appid) return callback('appid不匹配');
		if (json.mch_id !== that.mchid) return callback('mch_id不匹配');
		if (json.sign !== that._getSign(json)) return callback('sign签名错误');
		callback(null, json);
	});
};

API.prototype._getSign = function(pkg) {
	pkg = Object.assign({}, pkg);
	delete pkg.sign;
	var str = ulits.toQueryString(pkg) + '&key=' + this.partnerKey;
	return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
};

module.exports = API;
// FILE EOF