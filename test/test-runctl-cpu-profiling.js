// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var expect = require('./control').expect;
var failon = require('./control').failon;
var setup = require('./runctl-setup');
var tap = require('tap');
var waiton = require('./control').waiton;

tap.test('runctl cpu profiling', function(t) {
  setup(t);

  waiton(t, '', /worker count: 0/);
  expect(t, 'set-size 1');
  waiton(t, 'status', /worker count: 1/);
  expect(t, 'status', /worker id 1:/);
  expect(t, 'cpu-start 0', /Profiler started/);
  expect(t, 'cpu-start 1', /Profiler started/);
  failon(t, 'cpu-start 6', /6 not found/);

  t.test('pause', function(t) {
    // XXX(sam) why did I put a pause in? so cpu profiling can occur?
    setTimeout(function() {
      t.pass();
      t.end();
    }, 2000);
  });

  expect(t, 'cpu-stop 0 file-name', /CPU profile.*file-name.cpuprofile/);
  expect(t, 'cpu-stop 1', /CPU profile.*node.1.cpuprofile/);
  failon(t, 'cpu-stop 6', /6 not found/);
  expect(t, 'stop');
});
