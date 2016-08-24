// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';
var helper = require('./helper');
var tap = require('tap');

var skipIfNode010 = ((Number(process.version.match(/^v(\d+\.\d+)/)[1])) > 0.1) 
                  ? false 
                  : {skip: 'tested feature requires node 0.11 minimum'} 
 

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var failon = rc.failon;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');

// Cause metrics to be emitted 30 times faster, so we don't have to
// wait minutes for object metrics.
process.env.STRONGAGENT_INTERVAL_MULTIPLIER = 30;

var run;
var statsd;

tap.test('start statsd', skipIfNoLicense || skipIfNode010 || function(t) {
  helper.statsd(function(_statsd) {
    t.ok(_statsd, 'started');
    statsd = _statsd;
    t.end();
  });
});

tap.test('start app', skipIfNoLicense || skipIfNode010 || function(t) {
  var url = util.format('statsd://:%d', statsd.port);
  run = supervise(APP, ['--metrics', url]);
  t.pass('app started');
  t.end();
});

tap.test('runctl commands', skipIfNoLicense || skipIfNode010 || function(t) {
  cd(path.dirname(APP));

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  });
  t.doesNotThrow(function() {
    expect('set-size 1');
  });
  t.doesNotThrow(function() {
    waiton('status', /worker count: 1/);
  });
  t.doesNotThrow(function() {
    expect('status', /worker id 1:/);
  });

  t.doesNotThrow(function() {
    failon('objects-start', /missing argument/);
  });
  t.doesNotThrow(function() {
    failon('objects-stop', /missing argument/);
  });

  t.doesNotThrow(function() {
    expect('objects-start 0');
  });
  t.doesNotThrow(function() {
    expect('objects-start 1');
  });
  t.doesNotThrow(function() {
    failon('objects-start 6', /6 not found/);
  });

  t.end();
});

tap.test('stop statsd', skipIfNoLicense || skipIfNode010 || function(t) {
  statsd.waitfor(/object.*count:/, function() {
    statsd.close();
    t.pass('stopped');
    t.end();
  });
});

tap.test('runctl commands', skipIfNoLicense || skipIfNode010 || function(t) {
  t.doesNotThrow(function() {
    expect('objects-stop 0');
  });
  t.doesNotThrow(function() {
    expect('objects-stop 1');
  });
  t.doesNotThrow(function() {
    failon('objects-stop 6', /6 not found/);
  });
  t.doesNotThrow(function() {
    expect('stop');
  });
  t.end();
});
