import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { router } from './router'

import type {
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

const port = 3344;

app.use(router.routes());
app.use(router.allowedMethods());

const server = app.listen(port, () => console.log(`Listening on port http://localhost:${port}`));

process.on('SIGTERM', () => {

  console.log('Bye bye!');
  server.close(() => {

    console.log('Server Closed');
    process.exit(0);
  });
});
