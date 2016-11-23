/**
 * 微信支付API
 * @author Eric
 */
var URLS = {
	unifiedorder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
	orderquery: 'https://api.mch.weixin.qq.com/pay/orderquery',
	closeorder: 'https://api.mch.weixin.qq.com/pay/closeorder',
	refund: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
	refundquery: 'https://api.mch.weixin.qq.com/pay/refundquery',
	downloadbill: 'https://api.mch.weixin.qq.com/pay/downloadbill',
	shorturl: 'https://api.mch.weixin.qq.com/tools/shorturl',
	report: 'https://api.mch.weixin.qq.com/payitil/report',
	transfers: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers',
	gettransferinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo'
}
var crypto = require('crypto');
var urllib = require('urllib');
var xml2js = require('xml2js');
var getRawBody = require('raw-body');

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
			nonceStr: that._generateNonceStr(),
			package: 'prepay_id=' + result.prepay_id,
			signType: 'MD5'
		});
		pkg.paySign = that._getSign(pkg);
		pkg.timestamp = pkg.timeStamp;
		// delete pkg.appId;
		callback(null, pkg);
	})
};

// 统一下单
API.prototype.unifiedorder = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr(),
		notify_url: params.notify_url || this.notify_url,
		spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip || '192.168.0.1'
	});

	var needs = ['body', 'out_trade_no', 'total_fee', 'spbill_create_ip', 'trade_type'];
	if (pkg.trade_type == 'JSAPI') {
		needs.push('openid');
	} else if (pkg.trade_type == 'NATIVE') {
		needs.push('product_id');
	}

	return this._request(URLS.unifiedorder, pkg, {needs}, callback);
};

// 订单查询
API.prototype.orderquery = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr()
	});

	var needs = ['transaction_id|out_trade_no'];

	return this._request(URLS.orderquery, pkg, {needs}, callback);
};

// 关闭订单
API.prototype.closeorder = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr()
	});

	var needs = ['out_trade_no'];

	return this._request(URLS.closeorder, pkg, {needs}, callback);
};

// 申请退款
API.prototype.refund = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr(),
		op_user_id: params.op_user_id || this.mchid
	});

	var needs = ['transaction_id|out_trade_no', 'out_refund_no', 'total_fee', 'refund_fee', 'op_user_id'];

	return this._request(URLS.refund, pkg, {needs, cert: true}, callback);
};

// 查询退款
API.prototype.refundquery = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr()
	});

	var needs = ['transaction_id|out_trade_no|out_refund_no|refund_id'];

	return this._request(URLS.refundquery, pkg, {needs}, callback);
};

// 下载对帐单
API.prototype.downloadbill = function(params, callback) {
	var pkg = Object.assign({}, params, {
		appid: this.appid,
		mch_id: this.mchid,
		nonce_str: this._generateNonceStr()
	});

	var needs = ['bill_date', 'bill_type'];

	return this._request(URLS.downloadbill, pkg, {needs}, callback);
};

// 企业付款api
API.prototype.transfers = function(params, callback) {
	var pkg = Object.assign({}, order, {
		mch_appid: this.appid,
		mchid: this.mchid,
		nonce_str: this._generateNonceStr(),
		check_name: params.check_name || 'OPTION_CHECK',
		spbill_create_ip: params.ip || this.ip || '192.168.0.1'
	});

	var needs = ['partner_trade_no', 'openid', 'check_name', 'amount', 'desc'];
	if (pkg.check_name == 'FORCE_CHECK') needs.push('re_user_name');

	return this._request(URLS.transfers, pkg, {needs}, callback);
};

API.prototype.get_transfers = function() {

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
API.prototype._request = function(url, params, options, callback) {
	var that = this;
	if (typeof callback == 'undefined' && typeof options == 'function') {
		callback = options;
		options = {};
	}
	options = options || {};

	// callback
	if (typeof callback == 'function') return that._httpRequest(url, params, options, callback);
	// promise
	return new Promise(function(resolve, reject) {
		that._httpRequest(url, params, options, function(err, result) {
			err ? reject(err) : resolve(result);
		});
	});
};

API.prototype._httpRequest = function(url, params, options, callback) {
	var that = this;

	// 验证参数合法且完整
	var needs = options.needs || [], missing = [];
	needs.forEach(function(key) {
		var keys = key.split('|');
		for (var i = 0; i < keys.length; i++) {
			if (params[keys[i]]) return;
		}
		missing.push(key);
	});
	if (missing.length) return callback('missing params: ' + missing.join(', '));

	// 安全签名
	delete params.sign;
	params.sign = that._getSign(params);

	// 创建请求参数
	var pkg = {
		method: 'POST',
		data: that._buildXML(params)
	}
	// 是否需要证书
	if (options.cert) {
		pkg.pfx = that.pfx;
		pkg.passphrase = that.passphrase;
	}

	urllib.request(url, pkg, function(err, data, res) {
		if (err) return callback(err);
		that._parseXML(data.toString(), function(err, json) {
			if (err) return callback(err);
			if (json.return_code != 'SUCCESS') return callback(json.return_msg || '未知错误');
			if (json.result_code != 'SUCCESS') return callback(json.err_code_des || '未知错误');
			return callback(null, json);
		});
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
	that._parseXML(xml, function (err, json) {
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
	var str = this._toQueryString(pkg) + '&key=' + this.partnerKey;
	return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
};

API.prototype._toQueryString = function(obj) {
	return Object.keys(obj).filter(function (key) {
		return obj[key] !== undefined && obj[key] !== '';
	}).sort().map(function (key) {
		return key + '=' + obj[key];
	}).join('&');
};

API.prototype._generateNonceStr = function(length) {
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var maxPos = chars.length;
	var noceStr = '';
	for (var i = 0; i < (length || 32); i++) {
		noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return noceStr;
};

API.prototype._buildXML = function(obj) {
	var builder = new xml2js.Builder({
		allowSurrogateChars: true
	});
	return builder.buildObject({xml:obj});
};

API.prototype._parseXML = function(xml, callback) {
	xml2js.parseString(xml, {
		trim: true,
		explicitArray: false
	}, function(err, result) {
		err ? callback(err) : callback(null, result ? result.xml : {});
	});
};

module.exports = API;
// FILE EOF