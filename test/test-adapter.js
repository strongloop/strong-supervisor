// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var tap = require('tap');

tap.test('adapter exports', function(t) {
  var adapter = require('../lib/adapter');

  t.assert(adapter.use);
  t.assert(adapter.metrics.startCpuProfiling);
  t.assert(adapter.profile);
  t.assert(adapter.start);
  t.assert(adapter.on);
  t.assert(adapter.internal.on);
  t.end();
});

tap.test('appmetrics exposed after adapter start', function(t) {
  /* eslint no-undef:0 */

  var adapter = require('../lib/adapter');

  t.throws(function() {
    return APPMETRICS === undefined;
  }, ReferenceError);
  t.equal(global.APPMETRICS, undefined);

  adapter.start();

  t.assert(APPMETRICS);
  t.assert(global.APPMETRICS);

  t.end();
});
