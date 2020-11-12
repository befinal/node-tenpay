import { RequestOptions } from "urllib";
import urllib = require("urllib");
import * as util from "./util";
const replyData = (msg: string) =>
  util.buildXML(
    msg ? { return_code: "FAIL", return_msg: msg } : { return_code: "SUCCESS" }
  );

class Payment {
  public readonly urls: Record<string, string>;
  public readonly appid: string;
  public readonly mchid: string;
  public readonly partnerKey: string;
  public readonly pfx: string;
  public readonly notify_url: string;
  public readonly refund_url: string;
  public readonly spbill_create_ip: string;

  constructor(
    config: Record<string, string>,
    sandbox = false,
    private readonly debug = false
  ) {
    if (!config.appid) throw new Error("appid fail");
    if (!config.mchid) throw new Error("mchid fail");
    if (!config.partnerKey) throw new Error("partnerKey fail");

    this.appid = config.appid;
    this.mchid = config.mchid;
    this.partnerKey = config.partnerKey;
    this.pfx = config.pfx;
    this.notify_url = config.notify_url;
    this.refund_url = config.refund_url;
    this.spbill_create_ip = config.spbill_create_ip || "127.0.0.1";
    this.urls = sandbox
      ? {
          micropay: "https://api.mch.weixin.qq.com/sandboxnew/pay/micropay",
          reverse:
            "https://api.mch.weixin.qq.com/sandboxnew/secapi/pay/reverse",
          unifiedorder:
            "https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder",
          orderquery: "https://api.mch.weixin.qq.com/sandboxnew/pay/orderquery",
          closeorder: "https://api.mch.weixin.qq.com/sandboxnew/pay/closeorder",
          refund: "https://api.mch.weixin.qq.com/sandboxnew/secapi/pay/refund",
          refundquery:
            "https://api.mch.weixin.qq.com/sandboxnew/pay/refundquery",
          downloadbill:
            "https://api.mch.weixin.qq.com/sandboxnew/pay/downloadbill",
          downloadfundflow:
            "https://api.mch.weixin.qq.com/sandboxnew/pay/downloadfundflow",
          send_coupon:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/send_coupon",
          query_coupon_stock:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/query_coupon_stock",
          querycouponsinfo:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/querycouponsinfo",
          transfers:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/promotion/transfers",
          gettransferinfo:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/gettransferinfo",
          sendredpack:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/sendredpack",
          sendgroupredpack:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/sendgroupredpack",
          gethbinfo:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaymkttransfers/gethbinfo",
          paybank:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaysptrans/pay_bank",
          querybank:
            "https://api.mch.weixin.qq.com/sandboxnew/mmpaysptrans/query_bank",
        }
      : {
          micropay: "https://api.mch.weixin.qq.com/pay/micropay",
          reverse: "https://api.mch.weixin.qq.com/secapi/pay/reverse",
          unifiedorder: "https://api.mch.weixin.qq.com/pay/unifiedorder",
          orderquery: "https://api.mch.weixin.qq.com/pay/orderquery",
          closeorder: "https://api.mch.weixin.qq.com/pay/closeorder",
          refund: "https://api.mch.weixin.qq.com/secapi/pay/refund",
          refundquery: "https://api.mch.weixin.qq.com/pay/refundquery",
          downloadbill: "https://api.mch.weixin.qq.com/pay/downloadbill",
          downloadfundflow:
            "https://api.mch.weixin.qq.com/pay/downloadfundflow",
          send_coupon:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/send_coupon",
          query_coupon_stock:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/query_coupon_stock",
          querycouponsinfo:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/querycouponsinfo",
          transfers:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers",
          gettransferinfo:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo",
          sendredpack:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack",
          sendgroupredpack:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/sendgroupredpack",
          gethbinfo:
            "https://api.mch.weixin.qq.com/mmpaymkttransfers/gethbinfo",
          paybank: "https://api.mch.weixin.qq.com/mmpaysptrans/pay_bank",
          querybank: "https://api.mch.weixin.qq.com/mmpaysptrans/query_bank",
          getpublickey: "https://fraud.mch.weixin.qq.com/risk/getpublickey",
          getsignkey: "https://api.mch.weixin.qq.com/sandboxnew/pay/getsignkey",
          combinedorder: "https://api.mch.weixin.qq.com/pay/combinedorder",
        };
  }

  log(config: Record<string, string> | string, sandbox = false, debug = false) {
    if (this.debug) console.log(config, sandbox, debug);
  }

  static init(config: Record<string, string>, sandbox = false, debug = false) {
    return new Payment(config, sandbox, debug);
  }

  static async sandbox(config: Record<string, string>, debug: boolean) {
    let { sandbox_signkey } = await Payment.init(config).getSignkey();
    return new Payment(
      {
        ...config,
        partnerKey: sandbox_signkey,
      },
      true,
      debug
    );
  }

  private async parse(xml: string, type: string, signType?: string) {
    let json = await util.parseXML(xml);

    switch (type) {
      case "middleware_nativePay":
        break;
      default:
        if (json.return_code !== "SUCCESS")
          throw new Error(json.return_msg || "XMLDataError");
    }

    switch (type) {
      case "middleware_refund":
      case "middleware_nativePay":
      case "getsignkey":
        break;
      default:
        if (json.result_code !== "SUCCESS")
          throw new Error(json.err_code || "XMLDataError");
    }

    switch (type) {
      case "getsignkey":
        break;
      case "middleware_refund": {
        if (json.appid !== this.appid) throw new Error("appid不匹配");
        if (json.mch_id !== this.mchid) throw new Error("mch_id不匹配");
        let key = util.md5(this.partnerKey).toLowerCase();
        let info = util.decrypt(json.req_info, key);
        json.req_info = await util.parseXML(info);
        break;
      }
      case "transfers":
        if (json.mchid !== this.mchid) throw new Error("mchid不匹配");
        break;
      case "sendredpack":
      case "sendgroupredpack":
        if (json.wxappid !== this.appid) throw new Error("wxappid不匹配");
        if (json.mch_id !== this.mchid) throw new Error("mchid不匹配");
        break;
      case "gethbinfo":
      case "gettransferinfo":
        if (json.mch_id !== this.mchid) throw new Error("mchid不匹配");
        break;
      case "send_coupon":
      case "query_coupon_stock":
      case "querycouponsinfo":
        if (json.appid !== this.appid) throw new Error("appid不匹配");
        if (json.mch_id !== this.mchid) throw new Error("mch_id不匹配");
        break;
      case "getpublickey":
        break;
      case "paybank":
        if (json.mch_id !== this.mchid) throw new Error("mchid不匹配");
        break;
      case "querybank":
        if (json.mch_id !== this.mchid) throw new Error("mchid不匹配");
        break;
      case "combinedorder":
        if (json.combine_appid !== this.appid) throw new Error("appid不匹配");
        if (json.combine_mch_id !== this.mchid) throw new Error("mch_id不匹配");
        if (json.sign !== this.getSign(json, "HMAC-SHA256"))
          throw new Error("sign签名错误");
        break;
      default:
        if (json.appid !== this.appid) throw new Error("appid不匹配");
        if (json.mch_id !== this.mchid) throw new Error("mch_id不匹配");
        if (json.sign !== this.getSign(json, json.sign_type || signType))
          throw new Error("sign签名错误");
    }
    return json;
  }

  private async parseBill(xml: string, format = false) {
    if (util.checkXML(xml)) {
      let json = await util.parseXML(xml);
      throw new Error(json.err_code || json.return_msg || "XMLDataError");
    }
    if (!format) return xml;

    const arr = xml
      .trim()
      .split(/\r?\n/)
      .filter((item) => item.trim());

    let total_data = (arr.pop() as string).substr(1).split(",`");
    let total_title = (arr.pop() as string).split(",");
    let list_title = (arr.shift() as string).split(",");
    let list_data = arr.map((item) => item.substr(1).split(",`"));
    return { total_title, total_data, list_title, list_data };
  }

  private getSign(params: Record<string, string>, type = "MD5") {
    let str = util.toQueryString(params) + "&key=" + this.partnerKey;
    switch (type) {
      case "MD5":
        return util.md5(str).toUpperCase();
      case "HMAC-SHA256":
        return util.sha256(str, this.partnerKey).toUpperCase();
      default:
        throw new Error("signType Error");
    }
  }

  private async request(
    params: Record<string, string>,
    type: string,
    cert = false
  ) {
    // 安全签名
    params.sign = this.getSign(params, params.sign_type);
    // 创建请求参数
    const pkg = <RequestOptions>{
      method: "POST",
      dataType: "text",
      data: util.buildXML(params),
      timeout: [10000, 15000],
      pfx: cert ? this.pfx : undefined,
      passphrase: cert ? this.mchid : undefined,
    };

    this.log("post data =>\r\n%s\r\n", pkg.data);
    let { status, data } = await urllib.request(this.urls[type], pkg);
    if (status !== 200) throw new Error("request fail");
    this.log("receive data =>\r\n%s\r\n", data);

    return ["downloadbill", "downloadfundflow"].indexOf(type) < 0
      ? this.parse(data, type, params.sign_type)
      : data;
  }

  // Express中间件
  middlewareForExpress(type = "pay") {
    return async (req: Record<string, unknown>, res: any, next: Function) => {
      res.reply = (msg: string) => {
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.send(replyData(msg));
      };

      res.replyNative = (prepay_id: string, err_code_des: string) => {
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.send(this.getNativeReply(prepay_id, err_code_des));
      };

      try {
        if (typeof req.body !== "string") throw new Error("XMLDataError");
        req.weixin = await this.parse(req.body, "middleware_" + type);
      } catch (err) {
        return res.reply(err.message);
      }

      next();
    };
  }

  // Koa中间件
  middleware(type = "pay") {
    return async (ctx: any, next: Function) => {
      ctx.reply = (msg: string) => {
        ctx.type = "application/xml; charset=utf-8";
        ctx.body = replyData(msg);
      };

      ctx.replyNative = (prepay_id: string, err_code_des: string) => {
        ctx.type = "application/xml; charset=utf-8";
        ctx.body = this.getNativeReply(prepay_id, err_code_des);
      };

      try {
        if (typeof ctx.request.body !== "string")
          throw new Error("XMLDataError");
        ctx.request.weixin = await this.parse(
          ctx.request.body,
          "middleware_" + type
        );
      } catch (err) {
        return ctx.reply(err.message);
      }

      await next();
    };
  }

  // 获取沙盒密钥
  getSignkey() {
    let pkg = {
      mch_id: this.mchid,
      nonce_str: util.generate(),
    };
    return this.request(pkg, "getsignkey");
  }

  // 获取RSA公钥
  getPublicKey(params: Record<string, string>) {
    let pkg = {
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
    };
    return this.request(pkg, "getpublickey", true);
  }

  // 获取JS支付参数(自动下单)
  async getPayParams(params: Record<string, string>) {
    params.trade_type = params.trade_type || "JSAPI";
    let order = await this.unifiedOrder(params);
    return this.getPayParamsByPrepay(order, params.sign_type);
  }

  // 获取JS支付参数(通过预支付会话标志)
  getPayParamsByPrepay(params: Record<string, string>, signType: string) {
    let pkg = <Record<string, string>>{
      appId: params.sub_appid || this.appid,
      timeStamp: "" + ((Date.now() / 1000) | 0),
      nonceStr: util.generate(),
      package: "prepay_id=" + params.prepay_id,
      signType: signType || "MD5",
    };
    pkg.paySign = this.getSign(pkg, signType);
    pkg.timestamp = pkg.timeStamp;
    return pkg;
  }

  // 获取APP支付参数(自动下单)
  async getAppParams(params: Record<string, string>) {
    params.trade_type = params.trade_type || "APP";
    let order = await this.unifiedOrder(params);
    return this.getAppParamsByPrepay(order, params.sign_type);
  }

  // 获取APP支付参数(通过预支付会话标志)
  getAppParamsByPrepay(params: Record<string, string>, signType: string) {
    let pkg = <Record<string, string>>{
      appid: params.sub_appid || this.appid,
      partnerid: params.sub_mch_id || this.mchid,
      prepayid: params.prepay_id,
      package: "Sign=WXPay",
      noncestr: util.generate(),
      timestamp: "" + ((Date.now() / 1000) | 0),
    };
    pkg.sign = this.getSign(pkg, signType);
    return pkg;
  }

  // 扫码支付, 生成URL(模式一)
  getNativeUrl(params: Record<string, string>) {
    let pkg = <Record<string, string>>{
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      time_stamp: "" + ((Date.now() / 1000) | 0),
      nonce_str: util.generate(),
    };

    let url =
      "weixin://wxpay/bizpayurl" +
      "?sign=" +
      this.getSign(pkg) +
      "&appid=" +
      pkg.appid +
      "&mch_id=" +
      pkg.mch_id +
      "&product_id=" +
      encodeURIComponent(pkg.product_id) +
      "&time_stamp=" +
      pkg.time_stamp +
      "&nonce_str=" +
      pkg.nonce_str;
    return url;
  }

  // 拼装扫码模式一返回值
  private getNativeReply(prepay_id: string, err_code_des: string) {
    let pkg = <Record<string, string>>{
      return_code: "SUCCESS",
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      result_code: "SUCCESS",
      prepay_id,
    };

    if (err_code_des) {
      pkg.result_code = "FAIL";
      pkg.err_code_des = err_code_des;
    }

    pkg.sign = this.getSign(pkg);
    return util.buildXML(pkg);
  }

  // 刷卡支付
  micropay(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
    };

    return this.request(pkg, "micropay");
  }

  // 撤销订单
  reverse(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
    };

    return this.request(pkg, "reverse", true);
  }

  // 统一下单
  unifiedOrder(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
      notify_url: params.notify_url || this.notify_url,
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
      trade_type: params.trade_type || "JSAPI",
    };

    return this.request(pkg, "unifiedorder");
  }

  // 订单查询
  orderQuery(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
    };

    return this.request(pkg, "orderquery");
  }

  // 关闭订单
  closeOrder(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
    };

    return this.request(pkg, "closeorder");
  }

  // 申请退款
  refund(params: Record<string, string>) {
    let pkg = <Record<string, string>>{
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
      op_user_id: params.op_user_id || this.mchid,
      notify_url: params.notify_url || this.refund_url,
    };

    if (!pkg.notify_url) delete pkg.notify_url;

    return this.request(pkg, "refund", true);
  }

  // 查询退款
  refundQuery(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
    };

    return this.request(pkg, "refundquery");
  }

  // 合单支付
  combinedOrder(params: Record<string, string>) {
    let pkg = {
      ...params,
      combine_appid: this.appid,
      combine_mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: "HMAC-SHA256",
      notify_url: params.notify_url || this.notify_url,
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
      trade_type: params.trade_type || "JSAPI",
    };

    return this.request(pkg, "combinedorder");
  }

  // 下载对帐单
  async downloadBill(params: Record<string, string>, format = false) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "MD5",
      bill_type: params.bill_type || "ALL",
    };

    let xml = await this.request(pkg, "downloadbill");
    return this.parseBill(xml, format);
  }

  // 下载资金帐单
  async downloadFundflow(params: Record<string, string>, format = false) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      sign_type: params.sign_type || "HMAC-SHA256",
      account_type: params.account_type || "Basic",
    };

    let xml = await this.request(pkg, "downloadfundflow", true);
    return this.parseBill(xml, format);
  }

  // 发放代金券
  sendCoupon(params: Record<string, string>) {
    let pkg = <Record<string, string>>{
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      openid_count: params.openid_count || 1,
    };

    return this.request(pkg, "send_coupon", true);
  }

  // 查询代金券批次
  queryCouponStock(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
    };

    return this.request(pkg, "query_coupon_stock");
  }

  // 查询代金券信息
  queryCouponInfo(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
    };

    return this.request(pkg, "querycouponsinfo");
  }

  // 企业付款
  transfers(params: Record<string, string>) {
    let pkg = {
      ...params,
      mch_appid: this.appid,
      mchid: this.mchid,
      nonce_str: util.generate(),
      check_name: params.check_name || "FORCE_CHECK",
      spbill_create_ip: params.spbill_create_ip || this.spbill_create_ip,
    };

    return this.request(pkg, "transfers", true);
  }

  // 查询企业付款
  transfersQuery(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
    };

    return this.request(pkg, "gettransferinfo", true);
  }

  // 企业付款到银行卡
  async payBank(params: Record<string, string>) {
    const data = await this.getPublicKey(params);
    const pub_key = data && data.result_code === "SUCCESS" ? data.pub_key : "";
    if (pub_key === "") throw new Error("get publickey fail");

    let pkg = {
      ...params,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      enc_bank_no: util.encryptRSA(pub_key, params.enc_bank_no),
      enc_true_name: util.encryptRSA(pub_key, params.enc_true_name),
    };

    return this.request(pkg, "paybank", true);
  }

  // 查询企业付款到银行卡
  queryBank(params: Record<string, string>) {
    let pkg = {
      ...params,
      mch_id: this.mchid,
      nonce_str: util.generate(),
    };

    return this.request(pkg, "querybank", true);
  }

  // 发送普通红包
  sendRedpack(params: Record<string, string>) {
    let pkg = <Record<string, string>>{
      ...params,
      wxappid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      client_ip: params.client_ip || this.spbill_create_ip,
      mch_billno:
        params.mch_billno ||
        (params.mch_autono
          ? this.mchid + util.getFullDate() + params.mch_autono
          : ""),
      total_num: params.total_num || 1,
    };
    delete pkg.mch_autono;

    return this.request(pkg, "sendredpack", true);
  }

  // 发送裂变红包
  sendGroupRedpack(params: Record<string, string>) {
    let pkg = <Record<string, string>>{
      ...params,
      wxappid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      mch_billno:
        params.mch_billno ||
        (params.mch_autono
          ? this.mchid + util.getFullDate() + params.mch_autono
          : ""),
      total_num: params.total_num || 3,
      amt_type: params.amt_type || "ALL_RAND",
    };
    delete pkg.mch_autono;

    return this.request(pkg, "sendgroupredpack", true);
  }

  // 查询红包记录
  redpackQuery(params: Record<string, string>) {
    let pkg = {
      ...params,
      appid: this.appid,
      mch_id: this.mchid,
      nonce_str: util.generate(),
      bill_type: params.bill_type || "MCHT",
    };

    return this.request(pkg, "gethbinfo", true);
  }
}

export = Payment;
