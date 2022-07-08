"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _koa = require('koa'); var _koa2 = _interopRequireDefault(_koa);
var _koabodyparser = require('koa-bodyparser'); var _koabodyparser2 = _interopRequireDefault(_koabodyparser);
var _router = require('./router');












const app = new (0, _koa2.default)();
app.use(_koabodyparser2.default.call(void 0, ));

const port = 3344;

app.use(_router.router.routes());
app.use(_router.router.allowedMethods());

const server = app.listen(port, () => console.log(`Listening on port http://localhost:${port}`));

process.on('SIGTERM', () => {

  console.log('Bye bye!');
  server.close(() => {

    console.log('Server Closed');
    process.exit(0);
  });
});
