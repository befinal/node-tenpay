const config = require('../config');
const tenpay = require('../lib');
const api = new tenpay(config.wechat);

const assert = require('assert');
describe('订单相关', () => {
  let id = Date.now();

  it('支付参数: getPayParams', async () => {
    let res = await api.getPayParams({
      out_trade_no: id,
      body: '商品简单描述',
      total_fee: 100,
      openid: config.openid
    });
    let keys = ['appId', 'timeStamp', 'nonceStr', 'package', 'signType', 'paySign', 'timestamp'];
    assert.deepEqual(Object.keys(res), keys);
  });

  it.skip('统一下单: unifiedOrder', async () => {
    let res = await api.unifiedOrder({
      out_trade_no: id,
      body: '商品简单描述',
      total_fee: 100,
      openid: config.openid
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('订单查询: orderQuery', async () => {
    let res = await api.orderQuery({
      out_trade_no: id
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('关闭订单: closeOrder', async () => {
    let res = await api.closeOrder({
      out_trade_no: id
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });
});

describe('退款相关', () => {
  it('申请退款: refund', async () => {
    let res = await api.refund({
     out_trade_no: '1711185583256741',
     out_refund_no: 'REFUND_1711185583256741',
     total_fee: 1,
     refund_fee: 1
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('退款查询: refundQuery - out_trade_no', async () => {
    let res = await api.refundQuery({
      out_trade_no: '1711185583256741'
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('退款查询: refundQuery - out_refund_no', async () => {
    let res = await api.refundQuery({
      out_refund_no: 'REFUND_1711185583256741'
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });
});

describe('企业付款相关', () => {
  // let id = 'T' + Date.now();
  let id = 'T1514732081550';

  it.skip('申请付款: transfers', async () => {
    let res = await api.transfers({
     partner_trade_no: id,
     openid: config.openid,
     // check_name: 'FORCE_CHECK',
     // re_user_name: '马晓斌',
     amount: 1,
     desc: '企业付款测试'
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('付款查询: transfersQuery', async () => {
    let res = await api.transfersQuery({
      partner_trade_no: id
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });
});

describe('红包相关', () => {
  let id = '201712311234567890';

  it('普通红包: sendRedpack', async () => {
    let res = await api.sendRedpack({
     mch_billno: id,
     send_name: '商户名称',
     re_openid: config.openid,
     total_amount: 100,
     wishing: '普通红包祝福语',
     act_name: '活动名称',
     remark: '备注信息'
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });

  it('红包查询: redpackQuery', async () => {
    let res = await api.redpackQuery({
      mch_billno: id
    });
    assert.ok(res.return_code === 'SUCCESS');
    assert.ok(res.result_code === 'SUCCESS');
  });
});
