// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var expect = require('./control').expect;
var failon = require('./control').failon;
var setup = require('./runctl-setup');
var tap = require('tap');
var waiton = require('./control').waiton;

var name = 'foo-' + Date.now();

// Test usually takes < 1 minute, give it a lot longer, but not half an hour.
var options = {
  timeout: 5 * 60 * 1000, // milliseconds
};

tap.test('runctl heap snapshot', options, function(t) {
  setup(t);

  waiton(t, '', /worker count: 0/);
  expect(t, 'set-size 1');
  waiton(t, 'status', /worker count: 1/);
  expect(t, 'status', /worker id 1:/);
  expect(t, 'heap-snapshot 0', /node\.0.*\.heapsnapshot/);
  expect(t, 'heap-snapshot 1', /node\.1.*\.heapsnapshot/);
  expect(t, 'heap-snapshot 1 ' + name, /foo.*\.heapsnapshot/);
  failon(t, 'heap-snapshot 1 /does/not/exist', /ENOENT/);
  expect(t, 'stop');
});
