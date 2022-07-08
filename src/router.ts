import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import KoaRouter from '@koa/router';
import Decimal from 'decimal.js';
import { db } from './db'

import {
  createRedsysAPI,
  TRANSACTION_TYPES,
  randomTransactionId,
  SANDBOX_URLS,
  isResponseCodeOk,
  CURRENCIES
} from 'redsys-easy';

import type {
  ResponseJSONSuccess,
  Currency
} from 'redsys-easy';

export interface OrderPaymentStatus {
  orderId: string
  amount: string
  currency: Currency
  status: 'PENDING_PAYMENT' | 'PAYMENT_FAILED' | 'PAYMENT_SUCCEDED'
}

const app = new Koa();
app.use(bodyParser());
const router = new KoaRouter();

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
  } = createRedsysAPI({
    urls: SANDBOX_URLS,
    secretKey: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'
  });
  
  const merchantInfo = {
    DS_MERCHANT_MERCHANTCODE: '999008881',
    DS_MERCHANT_TERMINAL: '1'
  } as const;

router.get('/', async ({ request, response }, next) => {

    const productIds = request.query['productIds'] as string[] || ['2rv934', '928h3f'];
  
    // Use productIds to calculate amount and currency
    const { totalAmount, currency } = {
      // Never use floats for money
      totalAmount: productIds.length > 3 ? '999' : '8.99',
      currency: 'EUR'
    } as const;
  
    const orderId = randomTransactionId();
  
    db.orderPayments.insert({
      orderId,
      amount: totalAmount,
      currency,
      status: 'PENDING_PAYMENT'
    });

    const currencyInfo = CURRENCIES[currency];
  
    // Convert 49.99€ -> 4999
    const redsysAmount = new Decimal(totalAmount).mul(Math.pow(10, currencyInfo.decimals)).round().toFixed(0);
    // Convert EUR -> 978
    const redsysCurrency = currencyInfo.num;
  
    const form = createRedirectForm({
      ...merchantInfo,
      DS_MERCHANT_MERCHANTCODE: '999008881',
      DS_MERCHANT_TERMINAL: '1',
      DS_MERCHANT_TRANSACTIONTYPE: TRANSACTION_TYPES.AUTHORIZATION, // '0'
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
    const notificationParams: ResponseJSONSuccess = {
      Ds_SignatureVersion: request.query['Ds_SignatureVersion'] as string,
      Ds_Signature: request.query['Ds_Signature'] as string,
      Ds_MerchantParameters: request.query['Ds_MerchantParameters'] as string
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
    const notificationParams: ResponseJSONSuccess = {
      Ds_SignatureVersion: request.query['Ds_SignatureVersion'] as string,
      Ds_Signature: request.query['Ds_Signature'] as string,
      Ds_MerchantParameters: request.query['Ds_MerchantParameters'] as string
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
    const notificationBody = request.body as unknown as ResponseJSONSuccess;
  
    // Always validate a notification
    const params = processRestNotification(notificationBody);
    const orderId = params.Ds_Order;
  
    if (isResponseCodeOk(params.Ds_Response)) {
      // eslint-disable-next-line no-console
      console.log(`Payment for order ${orderId} succeded`);
      db.orderPayments.update(orderId, { status: 'PAYMENT_SUCCEDED' });
    } else {
      // eslint-disable-next-line no-console
      console.log(`Payment for order ${orderId} failed`);
      db.orderPayments.update(orderId, { status: 'PAYMENT_FAILED' });
    }
  
    // In this case redsys doesn't care about the response body
    response.status = 204;
  
    return await next();
});

export { router }

  