var debug = require('./debug');
var helper = require('./helper');
var run = helper.runWithControlChannel;
var tap = require('tap');

tap.test('appmetrics are forwarded via parentCtl', function(t) {
  var expressApp = require.resolve('./express-app');
  var received = {};
  var app = run([expressApp], ['--cluster=1', '--no-control'], function(msg) {
    debug('received: cmd %s: %j', msg.cmd, msg);
    switch (msg.cmd) {
      case 'appmetrics:cpu':
        t.deepEqual(Object.keys(msg.data), [
          'time',
          'process',
          'system',
        ]);
        received.cpu = true;
        break;

      case 'appmetrics:memory':
        t.deepEqual(Object.keys(msg.data), [
          'time',
          'physical_total',
          'physical_used',
          'physical',
          'private',
          'virtual',
          'physical_free',
        ]);
        received.memory = true;
        break;
    }

    if (received.cpu && received.memory)
      app.kill();
  });

  // keep test alive until app exits
  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});
