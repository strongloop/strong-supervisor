var helper = require('./helper');
if (helper.skip()) return;
helper.pass = true; // Use tap, not this check.

var http = require('http');
var tap = require('tap');
var debug = require('./debug');
var run = helper.runWithControlChannel;

tap.test('traces are forwarded via parentCtl', function(t) {
  t.plan(2);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control', '--trace'],
    function(data) {
      debug('received: cmd %s: %j', data.cmd, data);
      switch (data.cmd) {
        case 'trace:object':
          t.ok(!!data.record.version, 'Record version should exist');
          t.ok(!!data.record.packet.metadata, 'Record data should exist');
          app.kill();
          break;
      }
    }
  );
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});
