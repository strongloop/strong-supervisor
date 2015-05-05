var Statsd = require('strong-statsd');
var agent = require('./agent');
var assert = require('assert');
var cluster = require('cluster');
var master = require('strong-cluster-control');
var debug = require('./debug')('metrics');
var expandString = require('./expander').expand;

try {
  var syslog = require('strong-fork-syslog');
} catch (er) {
  debug('syslog optional dep not present');
}

function sendMetrics(parentCtl, callback) {
  callback = callback || function() {};

  // Scenarios:
  //   no STRONGLOOP_METRICS, return
  //
  //   called from master:
  //     needs to .start() with expanded scope
  //       if invalid, warn, and clear env... so children don't warn
  //     needs to wait for start
  //     needs to reset STRONGLOOP_METRICS *before* starting cluster
  //       statsd://:PORT/SCOPE-TEMPLATE
  //
  //
  //   called from worker:
  //     needs to .start() with expanded scope (will always be a statsd: URL)
  //
  //   called from single-instance:
  //     needs to .start() with expanded scope (can reset env, its ok)

  var self = this;
  var endpoints = parse(process.env.STRONGLOOP_METRICS);

  function parse(url) {
    if (url == null)
      return [];
    try {
      return JSON.parse(url);
    } catch (er) {
      return [url];
    }
  }

  if (cluster.isMaster) {
    endpoints.push('internal:');
  }

  if (!endpoints.length) {
    process.nextTick(callback);
    return false;
  }

  var server = Statsd({
    scope: '%a.%h.%w',
    expandScope: expandScope,
    flushInterval: process.env.STRONGLOOP_FLUSH_INTERVAL,
    syslog: syslog,
  });

  debug('metrics endpoints: %j', endpoints);

  endpoints.forEach(function(endpoint) {
    try {
      server.backend(endpoint);
      if (cluster.isMaster) {
        self.logger.info('supervisor reporting metrics to `%s`', endpoint);
      }
    } catch (er) {
      console.error('Invalid metrics endpoint `%s`: %s', endpoint, er.message);
      process.exit(1);
    }
  });

  // Internal metrics support, forwarded over node ipc from cluster master
  // to parent.
  if (parentCtl) {
    server.on('metrics', forwardMetrics);
  }

  server.start(function(er) {
    assert.ifError(er);

    process.env.STRONGLOOP_METRICS = server.url;
    agent().use(function(name, value) {
      server.send(name, value);
    });
    return callback(server);
  });

  if (this.setupChildLogger && server.child) {
    var statsdWorker = {
      process: {
        stdout: server.child.stdout,
        stderr: server.child.stderr,
        pid: process.pid,
      },
      id: 'statsd',
    };
    this.setupChildLogger(statsdWorker);
  }

  function expandScope(scope) {
    return expandString(scope, {
      id: (cluster.worker && cluster.worker.id) | 0,
      pid: process.pid,
      hostname: agent().config.hostname,
      appName: agent().config.appName,
    });
  }

  function forwardMetrics(metrics) {
    debug('received: %j', metrics);
    parentCtl.notify({cmd: 'metrics', metrics: injectIdentifiers(metrics)});
  }

  return true;
}

function injectIdentifiers(metrics) {
  var wid;
  var m;
  for (wid in metrics.processes) {
    m = metrics.processes[wid];
    m.wid = wid;
    if (cluster.workers[wid]) {
      m.pid = cluster.workers[wid].process.pid;
      m.pst = cluster.workers[wid].startTime;
    } else {
      m.pid = process.pid;
      m.pst = master.startTime;
    }
  }
  return metrics;
}

module.exports = sendMetrics;
