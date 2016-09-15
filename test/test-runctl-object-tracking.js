// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var expect = require('./control').expect;
var failon = require('./control').failon;
var fmt = require('util').format;
var server = require('./statsd');
var setup = require('./runctl-setup');
var tap = require('tap');
var waiton = require('./control').waiton;

var skipIfNode010 = ((Number(process.version.match(/^v(\d+\.\d+)/)[1])) > 0.1) 
                  ? false 
                  : {skip: 'tested feature requires node 0.11 minimum'} 
 

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

// Cause metrics to be emitted 30 times faster, so we don't have to
// wait minutes for object metrics.
process.env.STRONGAGENT_INTERVAL_MULTIPLIER = 30;

var run;
var statsd;

tap.test('object-tracking', skipIfNoLicense || skipIfNode010 || function(t) {
  t.test('stat statsd', function(t) {
    server(function(_statsd) {
      t.ok(_statsd, 'started');
      statsd = _statsd;
      t.end();
    });
  });

  t.test('setup', function(tt) {
    // Need to delay setup until the port is known
    setup(t, ['--metrics', fmt('statsd://:%d', statsd.port)]);
    tt.pass();
    tt.end();
  });

  waiton(t, '', /worker count: 0/);
  expect(t, 'set-size 1');
  waiton(t, 'status', /worker count: 1/);
  expect(t, 'status', /worker id 1:/);
  failon(t, 'objects-start', /missing argument/);
  failon(t, 'objects-stop', /missing argument/);
  expect(t, 'objects-start 0');
  expect(t, 'objects-start 1');
  failon(t, 'objects-start 6', /6 not found/);

  t.test('stop statsd', function(t) {
    statsd.waitfor(/object.*count:/, function() {
      statsd.close();
      t.pass('stopped');
      t.end();
    });
  });

  expect(t, 'objects-stop 0');
  expect(t, 'objects-stop 1');
  failon(t, 'objects-stop 6', /6 not found/);
  expect(t, 'stop');
});
