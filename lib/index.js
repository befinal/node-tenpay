const crypto = require('crypto');
const urllib = require('urllib');
const getRawBody = require('raw-body');
const util = require('./util');
const URLS = {
	micropay: 'https://api.mch.weixin.qq.com/pay/micropay',
	unifiedorder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
	orderquery: 'https://api.mch.weixin.qq.com/pay/orderquery',
	closeorder: 'https://api.mch.weixin.qq.com/pay/closeorder',
	refund: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
	refundquery: 'https://api.mch.weixin.qq.com/pay/refundquery',
	downloadbill: 'https://api.mch.weixin.qq.com/pay/downloadbill',
	transfers: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers',
	gettransferinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo',
	sendredpack: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack',
	sendgroupredpack: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendgroupredpack',
	gethbinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gethbinfo'
};

class Payment {
	constructor({appid, mchid, partnerKey, passphrase, pfx, notify_url, spbill_create_ip} = {}, debug = false) {
		if (!appid) throw new Error('appid为必传参数');
		if (!mchid) throw new Error('mchid为必传参数');
		if (!partnerKey) throw new Error('partnerKey为必传参数');

		this.appid = appid;
		this.mchid = mchid;
		this.partnerKey = partnerKey;
		this.passphrase = passphrase || mchid;
		this.pfx = pfx;
		this.notify_url = notify_url;
		this.spbill_create_ip = spbill_create_ip || '127.0.0.1';
		this.debug = debug;
	}

	_getSign(params) {
		let str = util.toQueryString(params) + '&key=' + this.partnerKey;
		return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
	}

	async _validate(xml, type) {
		if (this.debug) console.info('---- tenpay debug ----\n' + xml);
		let json = {};
		try {
			json = await util.parseXML(xml);
		} catch (err) {
			if (type == 'downloadbill') return xml;
			throw new Error('XMLParseError');
		}

		if (json.return_code != 'SUCCESS') throw new Error(json.return_msg);
		if (json.result_code != 'SUCCESS') throw new Error(json.err_code);
		switch (type) {
			case 'downloadbill': throw new Error('微信端返回参数错误');
			case 'gettransferinfo':
			case 'gethbinfo':
				if (json.mch_id !== this.mchid) throw new Error('mchid不匹配');
				break;
			case 'sendredpack':
			case 'sendgroupredpack':
				if (json.wxappid !== this.appid) throw new Error('wxappid不匹配');
				if (json.mch_id !== this.mchid) throw new Error('mchid不匹配');
				break;
			case 'transfers':
				if (json.mch_appid !== this.appid) throw new Error('wxappid不匹配');
				if (json.mchid !== this.mchid) throw new Error('mchid不匹配');
				break;
			default:
				if (json.appid !== this.appid) throw new Error('appid不匹配');
				if (json.mch_id !== this.mchid) throw new Error('mch_id不匹配');
		}
		if (type != 'transfers') {
			if (json.sign !== this._getSign(json)) throw new Error('sign签名错误');
		}
		return json;
	}

	async _request(params, {type, needs = [], cert = false} = {}) {
		let miss = needs.filter(key => !key.split('|').some(key => params[key]));
		if (miss.length) throw new Error('missing params: ' + miss.join(', '));

		// 安全签名
		params.sign = this._getSign(params);
		// 创建请求参数
		let pkg = {method: 'POST', data: util.buildXML(params)};
		if (cert) {
			pkg.pfx = this.pfx;
			pkg.passphrase = this.passphrase;
		}

		let res = await urllib.request(URLS[type], pkg);
		return this._validate(res.data.toString(), type);
	}

	// Express中间件
	async middlewareForExpress(req, res, next) {
		if (req.method != 'POST') throw new Error('请求来源错误');
		let xml = await getRawBody(req, {
			length: req.get['content-length'],
			limit: '1mb',
			encoding: 'utf8'
		});
		req.weixin = await this._validate(xml);
		next();
	}

	// Koa中间件
	middleware() {
		let that = this;
		return async function (next) {
			if (this.method != 'POST') throw new Error('请求来源错误');
			var xml = await getRawBody(this.req, {
				length: this.length,
				limit: '1mb',
				encoding: this.charset
			});
			this.weixin = await that._validate(xml);
			await next();
		};
	}

	// 支付参数
	async getPayParams(params) {
		let order = await this.unifiedOrder(params);
		let pkg = {
			appId: this.appid,
			timeStamp: '' + (Date.now() / 1000 |0),
			nonceStr: util.generate(),
			package: 'prepay_id=' + order.prepay_id,
			signType: 'MD5'
		};
		pkg.paySign = this._getSign(pkg);
		return pkg;
	}

	// 扫码支付
	micropay(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip
		});

		let needs = ['body', 'out_trade_no', 'total_fee', 'auth_code'];
		return this._request(pkg, {type: 'micropay', needs});
	}

	async unifiedOrder(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			notify_url: params.notify_url || this.notify_url,
			spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
			trade_type: params.trade_type || 'JSAPI'
		});

		let needs = ['body', 'out_trade_no', 'total_fee', 'notify_url'];
		if (pkg.trade_type == 'JSAPI') {
			needs.push('openid');
		} else if (pkg.trade_type == 'NATIVE') {
			needs.push('product_id');
		}
		return this._request(pkg, {type: 'unifiedorder', needs});
	}

	// 订单查询
	orderQuery(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate()
		});

		let needs = ['transaction_id|out_trade_no'];
		return this._request(pkg, {type: 'orderquery', needs});
	}

	// 关闭订单
	closeOrder(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate()
		});

		let needs = ['out_trade_no'];
		return this._request(pkg, {type: 'closeorder', needs});
	}

	// 申请退款
	refund(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			op_user_id: params.op_user_id || this.mchid
		});

		let needs = ['transaction_id|out_trade_no', 'out_refund_no', 'total_fee', 'refund_fee', 'op_user_id'];
		return this._request(pkg, {type: 'refund', needs, cert: true});
	}

	// 查询退款
	refundQuery(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate()
		});

		let needs = ['transaction_id|out_trade_no|out_refund_no|refund_id'];
		return this._request(pkg, {type: 'refundquery', needs});
	}

	// 下载对帐单
	downloadBill(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			bill_type: params.bill_type || 'ALL'
		});

		let needs = ['bill_date'];
		return this._request(pkg, {type: 'downloadbill', needs});
	}

	// 企业付款api
	transfers(params) {
		let pkg = Object.assign({}, params, {
			mch_appid: this.appid,
			mchid: this.mchid,
			nonce_str: util.generate(),
			check_name: params.check_name || 'NO_CHECK',
			spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip
		});

		let needs = ['partner_trade_no', 'openid', 'check_name', 'amount', 'desc'];
		if (pkg.check_name == 'FORCE_CHECK') needs.push('re_user_name');
		return this._request(pkg, {type: 'transfers', needs, cert: true});
	}

	// 查询企业付款API
	transfersQuery(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate()
		});

		let needs = ['partner_trade_no'];
		return this._request(pkg, {type: 'gettransferinfo', needs, cert: true});
	}

	// 发送普通红包
	sendRedpack(params) {
		let pkg = Object.assign({}, params, {
			wxappid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			client_ip: params.client_ip || this.spbill_create_ip,
			mch_billno: params.mch_billno || (params.mch_autono ? this.mchid + util.formatToWechatTime() + params.mch_autono : ''),
			total_num: params.total_num || 1
		});
		delete pkg.mch_autono;

		let needs = ['mch_billno', 'send_name', 're_openid', 'total_amount', 'wishing', 'act_name', 'remark'];
		if (pkg.total_amount > 200) needs.push('scene_id');
		return this._request(pkg, {type: 'sendredpack', needs, cert: true});
	}

	// 发送裂变红包
	sendGroupRedpack(params) {
		let pkg = Object.assign({}, params, {
			wxappid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			mch_billno: params.mch_billno || (params.mch_autono ? this.mchid + util.formatToWechatTime() + params.mch_autono : ''),
			total_num: params.total_num || 3,
			amt_type: params.amt_type || 'ALL_RAND'
		});
		delete pkg.mch_autono;

		let needs = ['mch_billno', 'send_name', 're_openid', 'total_amount', 'wishing', 'act_name', 'remark'];
		if (pkg.total_amount > 200) needs.push('scene_id');
		return this._request(pkg, {type: 'sendgroupredpack', needs, cert: true});
	}

	// 查询红包记录
	redpackQuery(params) {
		let pkg = Object.assign({}, params, {
			appid: this.appid,
			mch_id: this.mchid,
			nonce_str: util.generate(),
			bill_type: params.bill_type || 'MCHT'
		});

		let needs = ['mch_billno'];
		return this._request(pkg, {type: 'gethbinfo', needs, cert: true});
	}
}

module.exports = Payment;