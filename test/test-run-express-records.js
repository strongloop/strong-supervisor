// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var http = require('http');
var run = require('./run-with-ctl-channel');
var tap = require('tap');

tap.test('express-metrics are forwarded via parentCtl', function(t) {
  t.plan(7);

  var expressApp = require.resolve('./express-app');
  var record;
  var app = run([expressApp], ['--cluster=1', '--no-control'], function(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'listening':
        sendHttpRequest(data.address.address, data.address.port);
        break;

      case 'express:usage-record':
        if (record) return;
        record = data.record;
        t.deepEqual(data.record.request, { method: 'GET', url: '/not-found' });
        t.assert(data.record.timestamp);
        t.assert(data.record.client.address);
        t.equal(data.record.response.status, 404);
        t.assert(data.record.response.duration);
        t.assert(data.record.process.pid);
        t.deepEqual(data.record.data, { });
        break;
    }
  });
  // keep node alive until app exits
  app.ref();

  t.on('end', function() {
    app.kill();
  });
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
  });
});

function sendHttpRequest(host, port) {
  var options = {
    host: host,
    port: port,
    path: '/not-found',
    // Agents leak in 0.10, and we never need one, see
    //   https://github.com/nodejs/node-v0.x-archive/issues/6833
    agent: false,
  };
  http.get(options, function(res) {
    var content = '';
    res.on('data', function(chunk) { content += chunk.toString(); });
    res.on('end', function() {
      debug('received response: %j', content);
    });
  });
}
