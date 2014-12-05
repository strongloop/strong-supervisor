var helper = require('./helper');

if (helper.skip()) return;

helper.pass = true; // Use tap, not this check.

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
var nodeSyslog = require('strong-fork-syslog');
var path = require('path');
var tap = require('tap');
var util = require('util');

tap.test('metrics', function(t) {
  var plan = 1; // for internal
  var runArgs = [];

  async.parallel([
    startGraphite,
    startSplunk,
    startStatsd,
    startLogFile,
  ], function(er) {
    assert.ifError(er);

    run();
  });

  t.plan(plan);

  function run() {
    var options = {
      stdio: [0, 1, 2, 'ipc'],
      env: util._extend({
        SL_ENV: 'test',
        STRONGLOOP_FLUSH_INTERVAL: 2,
      }, process.env),
    };
    var run = require.resolve('../bin/sl-run');
    var app = require.resolve('./module-app');

    var args = [
      run,
      '--no-timestamp-workers',
      '--no-timestamp-supervisor',
      '--cluster=1',
      '--no-profile',
    ].concat(runArgs).concat(app);

    debug('spawn: %j', args);

    var run = cp.spawn(process.execPath, args, options);
    var ctl = control.attach(onRequest, run);
    run.unref();
    run._channel.unref(); // There is no documented way to unref child IPC
  }

  var internalMetrics;

  function onRequest(req, callback) {
    if (internalMetrics) return;

    if (req.cmd == 'metrics') {
      debug('internal metrics: <\n%j>', req);
      internalMetrics = req.metrics;
      t.assert(internalMetrics.timestamp, 'internal metrics seen');
      console.log('internal: seen');
    }
    return callback('OK');
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
        console.log('graphite: seen');
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
        console.log('splunk: seen');
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
        console.log('statsd: seen');
      }
    });
  }

  function startLogFile(done) {
    var file = path.join(__dirname, '_metrics.log');
    var url = 'log:' + file;
    var poll = setInterval(poller, 1000);

    try { fs.unlinkSync(file); } catch(er) {};

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
          console.log('log: seen');
        }
      });
    }

    done();
  }
});
