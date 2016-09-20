// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var Graphite = require('strong-statsd/test/servers/graphite');
var Splunk = require('strong-statsd/test/servers/splunk');
var Statsd = require('strong-statsd/test/servers/statsd');
var assert = require('assert');
var async = require('async');
var debug = require('./debug');
var fs = require('fs');
var path = require('path');
var run = require('./run-with-ctl-channel');
var tap = require('tap');

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? {}
                    : {skip: 'tested feature requires license'};

// Test usually takes < 10 seconds, give it a lot longer, but not half an hour.
skipIfNoLicense.timeout = 1 * 60 * 1000; // milliseconds

tap.test('metrics', skipIfNoLicense, function(t) {
  var appPath = require.resolve('./module-app');
  var plan = 15; // for internal
  var runArgs = [
    '--cluster=1',
    '--no-profile',
  ];
  var servers = [
    startGraphite,
    startSplunk,
    startStatsd,
    startLogFile,
  ];

  async.parallel(servers, runTests);

  // Note that this depends on async.parallel running all the start functions
  // synchronously (which it does), and all the start functions making any
  // t.asserts() asynchronously, in the next tick. This is defined behaviour of
  // async.parallel.
  t.plan(plan);

  function runTests(err) {
    assert.ifError(err);

    var app = run(appPath, runArgs, onRequest);
    // app is unref()'d by the helper, need to ref() it to keep the test alive
    app.ref();
    t.on('end', function() {
      debug('test ended, killing app');
      app.kill();
    });
  }

  var internalMetrics;

  function onRequest(req, callback) {
    if (internalMetrics) return;

    if (req.cmd === 'metrics') {
      debug('internal metrics: <\n%j>', req);
      internalMetrics = req.metrics;
      t.assert(internalMetrics.timestamp, 'internal metrics seen');
      t.type(internalMetrics.processes, 'object', 'contains process entries');
      testProcessMetrics(internalMetrics.processes);
    }
    return callback('OK');

    function testProcessMetrics(procs) {
      var wid;
      var pm;
      for (wid in procs) {
        pm = procs[wid];
        t.equivalent(pm.wid, wid, 'metrics for correct worker');
        t.assert(pm.pid > 0, 'metric includes pid');
        t.assert(pm.pst > 0, 'metric includes pst');
        t.assert('counters' in pm, 'metric includes counters');
        t.assert('timers' in pm, 'metric includes timers');
        t.assert('gauges' in pm, 'metric includes gauges');
      }
      t.assert(pm, 'has at least one process');
    }
  }


  function startGraphite(done) {
    var graphite = Graphite();

    graphite.unref();

    graphite.on('listening', function() {
      debug('graphite listening');
      runArgs.push('--metrics=' + graphite.url);
      done();
    });

    plan += 1;

    var graphiteMetrics;

    graphite.on('data', function(data) {
      if (graphiteMetrics) return;

      debug('graphite metrics: <\n%s>', data);
      // check we get data from supervisor and app
      if (/stats.gauges.module-app..*.0.cpu.total/.test(data) &&
         /stats.gauges.module-app..*.1.cpu.system/.test(data)) {
        graphiteMetrics = data;
        t.assert(true, 'graphite metrics seen');
      }
    });
  }

  function startSplunk(done) {
    var splunk = Splunk();

    splunk.unref();

    splunk.on('listening', function() {
      debug('splunk listening');
      runArgs.push('--metrics=' + splunk.url);
      done();
    });

    plan += 1;

    var splunkMetrics;
    var accumulator = '';

    splunk.on('data', function(data) {
      if (splunkMetrics) return;

      accumulator += '\n' + String(data);

      debug('splunk metrics: new <%s>', data);
      // check we get data from supervisor and app
      if (/module-app..*.0.cpu.total/.test(accumulator) &&
         /module-app..*.1.cpu.system/.test(accumulator)) {
        debug('splunk metrics: accumulated <\n%s>', accumulator);
        splunkMetrics = accumulator;
        t.assert(true, 'splunk metrics seen');
      }
    });
  }

  function startStatsd(done) {
    var statsd = Statsd();

    statsd.unref();

    statsd.on('listening', function() {
      debug('statsd listening');
      runArgs.push('--metrics=' + statsd.url);
      done();
    });

    plan += 1;

    var statsdMetrics;
    var accumulator = '';

    statsd.on('data', function(data) {
      if (statsdMetrics) return;

      accumulator += '\n' + String(data);

      debug('statsd metrics: new <%s>', data);
      // check we get data from supervisor and app
      if (/module-app..*.0.cpu.total/.test(accumulator) &&
         /module-app..*.1.cpu.system/.test(accumulator)) {
        debug('statsd metrics: accumulated <\n%s>', accumulator);
        statsdMetrics = accumulator;
        t.assert(true, 'statsd metrics seen');
        debug('statsd metrics: saw expected');
      }
    });
  }

  function startLogFile(done) {
    var file = path.join(__dirname, '_metrics.log');
    var url = 'log:' + file;
    var poll = setInterval(poller, 1000);

    try { fs.unlinkSync(file); } catch (er) {};

    debug('log: file set to `%s`', file);

    poll.unref();

    runArgs.push('--metrics=' + url);

    plan += 1;

    var logMetrics;

    function poller() {
      if (logMetrics) return;
      fs.readFile(file, {encoding: 'utf8'}, function(er, data) {
        if (er) return;
        debug('log metrics: from file <\n%s>', data);
        // check we get data from supervisor and app
        if (/module-app..*.0.cpu.total/.test(data) &&
           /module-app..*.1.cpu.system/.test(data)) {
          logMetrics = data;
          t.assert(true, 'log metrics seen');
          debug('log metrics: saw expected');
        }
      });
    }

    done();
  }
});
