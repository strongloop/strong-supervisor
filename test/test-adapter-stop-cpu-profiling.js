// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var tap = require('tap');

tap.test('start and stop profiling', function(t) {
  var adapter = require('../lib/adapter');

  adapter.metrics.startCpuProfiling();

  adapter.metrics.stopCpuProfiling(function(profile) {
    debug('profile: %j', profile);
    t.assert(profile);
    t.assert(!profile.error);
    t.end();
  });
});

tap.test('stop profiling', function(t) {
  var adapter = require('../lib/adapter');

  adapter.metrics.stopCpuProfiling(function(profile) {
    debug('profile: %j', profile);
    t.assert(profile);
    t.assert(profile.error);
    t.end();
  });
});
