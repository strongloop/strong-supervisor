var Graphite = require('strong-statsd/test/servers/graphite');
var Splunk = require('strong-statsd/test/servers/splunk');
var Statsd = require('strong-statsd/test/servers/statsd');
var Syslog = require('strong-statsd/test/servers/syslog');
var assert = require('assert');
var async = require('async');
var control = require('strong-control-channel/process');
var cp = require('child_process');
var debug = require('./debug');
var fs = require('fs');
var helper = require('./helper');
var path = require('path');
var tap = require('tap');
var util = require('util');

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

tap.test('metrics', skipIfNoLicense, function(t) {
  var appPath = require.resolve('./module-app');
  var plan = 15; // for internal
  var runArgs = [
    '--cluster=1',
    '--no-profile',
  ];

  async.parallel([
    startGraphite,
    startSplunk,
    startStatsd,
    startLogFile,
  ], runTests);

  function runTests(err) {
    assert.ifError(err);
    t.plan(plan);

    var app = helper.runWithControlChannel(appPath, runArgs, onRequest);
    // app is unref()'d by the helper, need to ref() it to keep the test alive
    app.ref();
    t.on('end', function() {
      app.kill();
    });
  }

  var internalMetrics;

  function onRequest(req, callback) {
    if (internalMetrics) return;

    if (req.cmd == 'metrics') {
      debug('internal metrics: <\n%j>', req);
      internalMetrics = req.metrics;
      t.assert(internalMetrics.timestamp, 'internal metrics seen');
      t.type(internalMetrics.processes, 'object', 'contains process entries');
      testProcessMetrics(internalMetrics.processes);
      t.comment('internal: seen');
    }
    return callback('OK');

    function testProcessMetrics(procs) {
      var wid;
      var pm;
      for (wid in procs) {
        pm = procs[wid];
        // t.comment(pm);
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
      if(/stats.gauges.module-app..*.0.cpu.total/.test(data) &&
         /stats.gauges.module-app..*.1.cpu.system/.test(data)) {
        graphiteMetrics = data;
        t.assert(true, 'graphite metrics seen');
        t.comment('graphite: seen');
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

      debug('splunk metrics: <\n%s>', accumulator);
      // check we get data from supervisor and app
      if(/module-app..*.0.cpu.total/.test(accumulator) &&
         /module-app..*.1.cpu.system/.test(accumulator)) {
        splunkMetrics = accumulator;
        t.assert(true, 'splunk metrics seen');
        t.comment('splunk: seen');
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

      debug('statsd metrics: <\n%s>', accumulator);
      // check we get data from supervisor and app
      if(/module-app..*.0.cpu.total/.test(accumulator) &&
         /module-app..*.1.cpu.system/.test(accumulator)) {
        statsdMetrics = accumulator;
        t.assert(true, 'statsd metrics seen');
        t.comment('statsd: seen');
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
        debug('log metrics: <\n%s>', data);
        debug('log metrics: <\n%s>', data);
        // check we get data from supervisor and app
        if(/module-app..*.0.cpu.total/.test(data) &&
           /module-app..*.1.cpu.system/.test(data)) {
          logMetrics = data;
          t.assert(true, 'log metrics seen');
          t.comment('log: seen');
        }
      });
    }

    done();
  }
});
