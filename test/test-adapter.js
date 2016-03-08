'use strict';

var os = require('os');
var tap = require('tap');

tap.test('adapter exports', function(t) {
  var adapter = require('../lib/adapter');

  t.assert(adapter.use);
  t.assert(adapter.metrics.startCpuProfiling);
  t.equal(adapter.config.hostname, os.hostname());
  t.assert(adapter.profile);
  t.assert(adapter.start);
  t.assert(adapter.configure);
  t.assert(adapter.on);
  t.assert(adapter.internal.on);
  t.end();
});
