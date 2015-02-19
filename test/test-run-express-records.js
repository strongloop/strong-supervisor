var helper = require('./helper');
if (helper.skip()) return;
helper.pass = true; // Use tap, not this check.

var http = require('http');
var tap = require('tap');
var debug = require('./debug');
var run = helper.runWithControlChannel;

tap.test('express-metrics are forwarded via parentCtl', function(t) {
  t.plan(7);

  var expressApp = require.resolve('./express-app'); // XXX use path.resolve
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
        t.end();
        break;
    }
  });
});

function sendHttpRequest(host, port) {
  http.get({ host: host, port: port, path: '/not-found' }, function(res) {
    var content = '';
    res.on('data', function(chunk) { content += chunk.toString(); });
    res.on('end', function() {
      debug('received response\n', content, '\n--end--');
    });
  });
}
