var debug = require('./debug');
var helper = require('./helper');
var http = require('http');
var tap = require('tap');

var run = helper.runWithControlChannel;

tap.test('agent traces are forwarded via parentCtl', function(t) {
  t.plan(4);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control'], function(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'listening':
        sendHttpRequest(data.address.address, data.address.port);
        break;

      case 'agent:trace':
        t.equal(data.workerId, 1);
        t.assert(data.processId);
        t.assert(data.trace.start);
        t.assert(data.trace.list[0]);
        app.kill();
        break;
    }
  });
  // keep test alive until app exits
  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
  });
});

function sendHttpRequest(host, port) {
  http.get({ host: host, port: port, path: '/' }, function(res) {
    var content = '';
    res.on('data', function(chunk) { content += chunk.toString(); });
    res.on('end', function() {
      debug('received response: %j', content);
    });
  });
}
