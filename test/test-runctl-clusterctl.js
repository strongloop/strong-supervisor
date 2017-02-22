// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var CPUS = require('os').cpus().length;
var expect = require('./control').expect;
var setup = require('./runctl-setup');
var tap = require('tap');
var waiton = require('./control').waiton;

var options = {
  timeout: 1 * 60 * 1000 /* ms */, // Usually is < 10 seconds
};

if (process.platform === 'win32')
  options.skip = 'FIXME - test fails on win32';

tap.test('runctl ls', options, function(t) {
  setup(t);

  waiton(t, '', /worker count: 0/);
  expect(t, 'set-size 1');
  waiton(t, 'status', /worker count: 1/);
  expect(t, 'status', /worker id 1:/);
  expect(t, 'set-size 2');
  waiton(t, 'status', /worker count: 2/);
  expect(t, 'status', /worker id 2:/);
  expect(t, 'restart');
  waiton(t, 'status', /worker id 4:/);

  // cluster restart is start/kill, not kill/start, so we need
  // to wait for the cluster size to be 2 instead of assuming it is
  // 2 after we see worker 4, because that will happen before the
  // restart is completely finished
  waiton(t, 'status', /worker count: 2/);

  expect(t, 'fork', /workerID: 5/);

  // XXX(sam) racy... whether we see the 3 or not is just a matter of
  // luck
  // waiton(t, 'status', /worker count: 3/);

  // cluster control kills off the extra worker
  waiton(t, 'status', /worker count: 2/);

  expect(t, 'disconnect');
  waiton(t, 'status', /worker count: 2/);
  expect(t, 'status', /worker id 6:/);
  expect(t, 'set-size 0');
  waiton(t, 'status', RegExp('worker count: 0'));
  expect(t, 'set-size CPUs');
  waiton(t, 'status', RegExp('worker count: ' + CPUS));
  expect(t, 'stop');
});
