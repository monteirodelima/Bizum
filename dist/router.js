"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _koa = require('koa'); var _koa2 = _interopRequireDefault(_koa);
var _koabodyparser = require('koa-bodyparser'); var _koabodyparser2 = _interopRequireDefault(_koabodyparser);
var _router = require('@koa/router'); var _router2 = _interopRequireDefault(_router);
var _decimaljs = require('decimal.js'); var _decimaljs2 = _interopRequireDefault(_decimaljs);
var _db = require('./db');








var _redsyseasy = require('redsys-easy');













const app = new (0, _koa2.default)();
app.use(_koabodyparser2.default.call(void 0, ));
const router = new (0, _router2.default)();

app.use(router.routes());
app.use(router.allowedMethods());

const port = 3344;
const endpoint = `http://example.com:${port}`;

const successRedirectPath = '/success';
const errorRedirectPath = '/error';
const notificationPath = '/api/notification';

const {
    createRedirectForm,
    processRestNotification
  } = _redsyseasy.createRedsysAPI.call(void 0, {
    urls: _redsyseasy.SANDBOX_URLS,
    secretKey: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'
  });
  
  const merchantInfo = {
    DS_MERCHANT_MERCHANTCODE: '999008881',
    DS_MERCHANT_TERMINAL: '1'
  } ;

router.get('/', async ({ request, response }, next) => {

    const productIds = request.query['productIds']  || ['2rv934', '928h3f'];
  
    // Use productIds to calculate amount and currency
    const { totalAmount, currency } = {
      // Never use floats for money
      totalAmount: productIds.length > 3 ? '999' : '8.99',
      currency: 'EUR'
    } ;
  
    const orderId = _redsyseasy.randomTransactionId.call(void 0, );
  
    _db.db.orderPayments.insert({
      orderId,
      amount: totalAmount,
      currency,
      status: 'PENDING_PAYMENT'
    });

    const currencyInfo = _redsyseasy.CURRENCIES[currency];
  
    // Convert 49.99€ -> 4999
    const redsysAmount = new (0, _decimaljs2.default)(totalAmount).mul(Math.pow(10, currencyInfo.decimals)).round().toFixed(0);
    // Convert EUR -> 978
    const redsysCurrency = currencyInfo.num;
  
    const form = createRedirectForm({
      ...merchantInfo,
      DS_MERCHANT_MERCHANTCODE: '999008881',
      DS_MERCHANT_TERMINAL: '1',
      DS_MERCHANT_TRANSACTIONTYPE: _redsyseasy.TRANSACTION_TYPES.AUTHORIZATION, // '0'
      DS_MERCHANT_ORDER: orderId,
      // amount in smallest currency unit(cents)
      DS_MERCHANT_AMOUNT: redsysAmount,
      DS_MERCHANT_CURRENCY: redsysCurrency,
      DS_MERCHANT_MERCHANTNAME: 'MI COMERCIO',
      DS_MERCHANT_MERCHANTURL: `${endpoint}${notificationPath}`,
      DS_MERCHANT_URLOK: `${endpoint}${successRedirectPath}`,
      DS_MERCHANT_URLKO: `${endpoint}${errorRedirectPath}`,
      DS_MERCHANT_PAYMETHODS: 'z'
    });
  
    response.status = 200;
    response.type = 'text/html; charset=utf-8';
    response.body = [
      '<!DOCTYPE html>',
      '<html>',
      '<body>',
      `<p>Payment for order ${orderId}, ${totalAmount} ${currency}</p>`,
      `<form action="${form.url}" method="post" target="_blank">`,
      `  <input type="hidden" id="Ds_SignatureVersion" name="Ds_SignatureVersion" value="${form.body.Ds_SignatureVersion}" />`,
      `  <input type="hidden" id="Ds_MerchantParameters" name="Ds_MerchantParameters" value="${form.body.Ds_MerchantParameters}" />`,
      `  <input type="hidden" id="Ds_Signature" name="Ds_Signature" value="${form.body.Ds_Signature}"/>`,
      '  <input type="submit" value="Pay with BIZUM" />',
      '</form>',
      '</body>',
      '</html>'
    ].join('\n');
  
    
    return await next();
});
  
  /*
   * Landing page for a successful transaction
   */
router.get(successRedirectPath, async ({ request, response }, next) => {
    const notificationParams = {
      Ds_SignatureVersion: request.query['Ds_SignatureVersion'] ,
      Ds_Signature: request.query['Ds_Signature'] ,
      Ds_MerchantParameters: request.query['Ds_MerchantParameters'] 
    };
  
    // Always validate a notification
    const { Ds_Order: orderId } = processRestNotification(notificationParams);
  
    response.status = 200;
    response.type = 'text/plain; charset=utf-8';
    response.body = `Your payment for order ${orderId} is now complete`;
  
    
    return await next();
});
  
  /*
   * Landing page for a failed transaction
   */
router.get(errorRedirectPath, async ({ request, response }, next) => {
    const notificationParams = {
      Ds_SignatureVersion: request.query['Ds_SignatureVersion'] ,
      Ds_Signature: request.query['Ds_Signature'] ,
      Ds_MerchantParameters: request.query['Ds_MerchantParameters'] 
    };
  
    // Always validate a notification
    const { Ds_Order: orderId } = processRestNotification(notificationParams);
  
    response.status = 200;
    response.type = 'text/plain; charset=utf-8';
    response.body = `Payment for order ${orderId} failed`;
   
    return await next();
});
  
  /*
   * Get notified when a transaction completes
   */
router.post(notificationPath, async ({ request, response }, next) => {
    const notificationBody = request.body ;
  
    // Always validate a notification
    const params = processRestNotification(notificationBody);
    const orderId = params.Ds_Order;
  
    if (_redsyseasy.isResponseCodeOk.call(void 0, params.Ds_Response)) {
      // eslint-disable-next-line no-console
      console.log(`Payment for order ${orderId} succeded`);
      _db.db.orderPayments.update(orderId, { status: 'PAYMENT_SUCCEDED' });
    } else {
      // eslint-disable-next-line no-console
      console.log(`Payment for order ${orderId} failed`);
      _db.db.orderPayments.update(orderId, { status: 'PAYMENT_FAILED' });
    }
  
    // In this case redsys doesn't care about the response body
    response.status = 204;
  
    return await next();
});

exports.router = router;

  