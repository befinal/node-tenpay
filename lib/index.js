const urllib = require('urllib');
const util = require('./util');
const URLS = {
  micropay: 'https://api.mch.weixin.qq.com/pay/micropay',
  reverse: 'https://api.mch.weixin.qq.com/secapi/pay/reverse',
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
const replyData = msg => util.buildXML(msg ? {return_code: 'FAIL', return_msg: msg} : {return_code: 'SUCCESS'});

class Payment {
  constructor({appid, mchid, partnerKey, pfx, notify_url, spbill_create_ip} = {}, debug = false) {
    if (!appid) throw new Error('appid fail');
    if (!mchid) throw new Error('mchid fail');
    if (!partnerKey) throw new Error('partnerKey fail');
    this.appid = appid;
    this.mchid = mchid;
    this.partnerKey = partnerKey;
    this.pfx = pfx;
    this.notify_url = notify_url;
    this.spbill_create_ip = spbill_create_ip || '127.0.0.1';
    this.debug = debug;
  }

  static init(config) {
    return new Payment(config);
  }

  async _parse(xml, type) {
    if (this.debug) console.log(xml);
    if (type === 'downloadbill') return xml;

    let json = await util.parseXML(xml);
    if (json.return_code !== 'SUCCESS') throw new Error(json.return_msg || 'XMLDataError');
    if (type !== 'middleware_refund') {
      if (json.result_code !== 'SUCCESS') throw new Error(json.err_code || 'XMLDataError');
    }
    switch (type) {
      case 'middleware_refund':
        if (json.appid !== this.appid) throw new Error('appid不匹配');
        if (json.mch_id !== this.mchid) throw new Error('mch_id不匹配');
        let key = util.md5(this.partnerKey).toLowerCase();
        let info = util.decrypt(json.req_info, key);
        json.req_info = await util.parseXML(info);
        break;
      case 'transfers':
        if (json.mchid !== this.mchid) throw new Error('mchid不匹配');
        break;
      case 'sendredpack':
      case 'sendgroupredpack':
        if (json.wxappid !== this.appid) throw new Error('wxappid不匹配');
        if (json.mch_id !== this.mchid) throw new Error('mchid不匹配');
        break;
      case 'gethbinfo':
      case 'gettransferinfo':
        if (json.mch_id !== this.mchid) throw new Error('mchid不匹配');
        break;
      default:
        if (json.appid !== this.appid) throw new Error('appid不匹配');
        if (json.mch_id !== this.mchid) throw new Error('mch_id不匹配');
        if (json.sign !== this._getSign(json)) throw new Error('sign签名错误');
    }
    return json;
  }

  async _parseBill(xml, format = false) {
    if (util.checkXML(xml)) {
      let json = await util.parseXML(xml);
      throw new Error(json.return_msg || 'XMLDataError');
    }
    if (!format) return xml;

    let arr = xml.trim().split(/\r?\n/).filter(item => item.trim());
    let total_data = arr.pop().substr(1).split(',`');
    let total_title = arr.pop().split(',');
    let list_title = arr.shift().split(',');
    let list_data = arr.map(item => item.substr(1).split(',`'));
    return {total_title, total_data, list_title, list_data};
  }

  _getSign(params) {
    let str = util.toQueryString(params) + '&key=' + this.partnerKey;
    return util.md5(str).toUpperCase();
  }

  async _request(params, {type, needs = [], cert = false} = {}) {
    let miss = needs.filter(key => !key.split('|').some(key => params[key]));
    if (miss.length) throw new Error('missing params: ' + miss.join(', '));

    // 安全签名
    params.sign = this._getSign(params);
    // 创建请求参数
    let pkg = {method: 'POST', dataType: 'text', data: util.buildXML(params)};
    if (cert) {
      pkg.pfx = this.pfx;
      pkg.passphrase = this.mchid;
    }

    let {status, data} = await urllib.request(URLS[type], pkg);
    if (status !== 200) throw new Error('request fail');
    return this._parse(data, type);
  }

  // Express中间件
  middlewareForExpress(type = 'pay') {
    return async (req, res, next) => {
      res.reply = msg => {
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.send(replyData(msg));
      }

      try {
        if (typeof req.body !== 'string') throw new Error('XMLDataError');
        req.weixin = await this._parse(req.body, 'middleware_' + type);
      } catch (err) {
        return res.reply('XMLDataError');
      }

      next();
    }
  }

  // Koa中间件
  middleware(type = 'pay') {
    return async (ctx, next) => {
      ctx.reply = msg => {
        ctx.type = 'application/xml; charset=utf-8';
        ctx.body = replyData(msg);
      }

      try {
        if (typeof ctx.request.body !== 'string') throw new Error('XMLDataError');
        ctx.request.weixin = await this._parse(ctx.request.body, 'middleware_' + type);
      } catch (err) {
        return ctx.reply('XMLDataError');
      }

      await next();
    };
  }

  // 获取H5支付参数(自动下单)
  async getPayParams(params) {
    params.trade_type = 'JSAPI';
    let order = await this.unifiedOrder(params);
    return this.getPayParamsByPrepay(order);
  }

  // 获取H5支付参数(通过预支付会话标志)
  getPayParamsByPrepay(params) {
    let pkg = {
      appId: this.appid,
      timeStamp: '' + (Date.now() / 1000 |0),
      nonceStr: util.generate(),
      package: 'prepay_id=' + params.prepay_id,
      signType: 'MD5'
    };
    pkg.paySign = this._getSign(pkg);
    pkg.timestamp = pkg.timeStamp;
    return pkg;
  }

  // 获取APP支付参数(自动下单)
  async getAppParams(params) {
    params.trade_type = 'APP';
    let order = await this.unifiedOrder(params);
    return this.getAppParamsByPrepay(order);
  }

  // 获取APP支付参数(通过预支付会话标志)
  getAppParamsByPrepay(params) {
    let pkg = {
      appid: this.appid,
      partnerid: this.mchid,
      prepayid: params.prepay_id,
      package: 'Sign=WXPay',
      noncestr: util.generate(),
      timestamp: '' + (Date.now() / 1000 |0)
    };
    pkg.sign = this._getSign(pkg);
    return pkg;
  }

  // 刷卡支付
  micropay(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip
    };

    let needs = ['body', 'out_trade_no', 'total_fee', 'auth_code'];
    return this._request(pkg, {type: 'micropay', needs});
  }

  // 撤销订单
  reverse(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate()
    };

    let needs = ['transaction_id|out_trade_no'];
    return this._request(pkg, {type: 'reverse', needs, cert: true});
  }

  // 统一下单
  unifiedOrder(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      notify_url: params.notify_url || this.notify_url,
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
      trade_type: params.trade_type || 'JSAPI'
    };

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
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate()
    };

    let needs = ['transaction_id|out_trade_no'];
    return this._request(pkg, {type: 'orderquery', needs});
  }

  // 关闭订单
  closeOrder(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate()
    };

    let needs = ['out_trade_no'];
    return this._request(pkg, {type: 'closeorder', needs});
  }

  // 申请退款
  refund(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      op_user_id: params.op_user_id || this.mchid
    };

    let needs = ['transaction_id|out_trade_no', 'out_refund_no', 'total_fee', 'refund_fee', 'op_user_id'];
    return this._request(pkg, {type: 'refund', needs, cert: true});
  }

  // 查询退款
  refundQuery(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate()
    };

    let needs = ['transaction_id|out_trade_no|out_refund_no|refund_id'];
    return this._request(pkg, {type: 'refundquery', needs});
  }

  // 下载对帐单
  async downloadBill(params, format = false) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      bill_type: params.bill_type || 'ALL'
    };

    let needs = ['bill_date'];
    let xml = await this._request(pkg, {type: 'downloadbill', needs});
    return this._parseBill(xml, format);
  }

  // 企业付款
  transfers(params) {
    let pkg = {
      ...params,
      mch_appid: this.appid,
      mchid: this.mchid,
      nonce_str: util.generate(),
      check_name: params.check_name || 'FORCE_CHECK',
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip
    };

    let needs = ['partner_trade_no', 'openid', 'check_name', 'amount', 'desc'];
    if (pkg.check_name == 'FORCE_CHECK') needs.push('re_user_name');
    return this._request(pkg, {type: 'transfers', needs, cert: true});
  }

  // 查询企业付款
  transfersQuery(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate()
    };

    let needs = ['partner_trade_no'];
    return this._request(pkg, {type: 'gettransferinfo', needs, cert: true});
  }

  // 发送普通红包
  sendRedpack(params) {
    let pkg = {
      ...params,
      wxappid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      client_ip: params.client_ip || this.spbill_create_ip,
      mch_billno: params.mch_billno || (params.mch_autono ? this.mchid + util.getFullDate() + params.mch_autono : ''),
      total_num: params.total_num || 1
    };
    delete pkg.mch_autono;

    let needs = ['mch_billno', 'send_name', 're_openid', 'total_amount', 'wishing', 'act_name', 'remark'];
    if (pkg.total_amount >= 200) needs.push('scene_id');
    return this._request(pkg, {type: 'sendredpack', needs, cert: true});
  }

  // 发送裂变红包
  sendGroupRedpack(params) {
    let pkg = {
      ...params,
      wxappid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      mch_billno: params.mch_billno || (params.mch_autono ? this.mchid + util.getFullDate() + params.mch_autono : ''),
      total_num: params.total_num || 3,
      amt_type: params.amt_type || 'ALL_RAND'
    };
    delete pkg.mch_autono;

    let needs = ['mch_billno', 'send_name', 're_openid', 'total_amount', 'wishing', 'act_name', 'remark'];
    if (pkg.total_amount >= 200) needs.push('scene_id');
    return this._request(pkg, {type: 'sendgroupredpack', needs, cert: true});
  }

  // 查询红包记录
  redpackQuery(params) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      bill_type: params.bill_type || 'MCHT'
    };

    let needs = ['mch_billno'];
    return this._request(pkg, {type: 'gethbinfo', needs, cert: true});
  }
}

module.exports = Payment;
