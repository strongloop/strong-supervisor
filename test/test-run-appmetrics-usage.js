// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var run = require('./run-with-ctl-channel');
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
