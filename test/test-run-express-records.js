var debug = require('./debug');
var helper = require('./helper');
var http = require('http');
var run = helper.runWithControlChannel;
var tap = require('tap');

tap.test('express-metrics are forwarded via parentCtl', function(t) {
  t.plan(7);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control'], function(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'listening':
        sendHttpRequest(data.address.address, data.address.port);
        break;

      case 'express:usage-record':
        t.deepEqual(data.record.request, { method: 'GET', url: '/not-found' });
        t.assert(data.record.timestamp);
        t.assert(data.record.client.address);
        t.equal(data.record.response.status, 404);
        t.assert(data.record.response.duration);
        t.assert(data.record.process.pid);
        t.deepEqual(data.record.data, { });
        app.kill();
        break;
    }
  });
  // keep test alive until app exits
  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

function sendHttpRequest(host, port) {
  http.get({ host: host, port: port, path: '/not-found' }, function(res) {
    var content = '';
    res.on('data', function(chunk) { content += chunk.toString(); });
    res.on('end', function() {
      debug('received response: %j', content);
    });
  });
}
