var Statsd = require('strong-statsd');
var cluster = require('cluster');
var debug = require('./debug')('metrics');
var expandString = require('./expander').expand;
var fmt = require('util').format;
var url = require('url');

function sendMetrics(parentCtl, callback) {
  callback = callback || function(){};

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

  var agent = require('strong-agent');
  var endpoint = process.env.STRONGLOOP_METRICS;

  if (!endpoint) {
    process.nextTick(callback);
    return false;
  }

  var server = Statsd({
    silent: true,
    scope: '%a.%h.%w',
    expandScope: expandScope,
    flushInterval: process.env.STRONGLOOP_FLUSH_INTERVAL,
  });

  // Throws on error, but it should have been validated before trying to start.
  server.backend(endpoint);
  server.on('metrics', forwardMetrics);

  var self = this;

  server.start(function() {
    if (cluster.isMaster) {
      self.logger.info('supervisor reporting metrics to `%s` using scope `%s`',
        endpoint, server.statsdScope);
    }

    process.env.STRONGLOOP_METRICS = server.url;
    agent.use(function(name, value) {
      server.send(name, value);
    });
    return callback(server);
  });

  if (this.setupChildLogger && server.child) {
    var statsdWorker = {
      process: server.child,
      id: 'statsd',
    };
    this.setupChildLogger(statsdWorker);
  }

  function expandScope(scope) {
    return expandString(scope, {
      id: (cluster.worker && cluster.worker.id) |0,
      pid: process.pid,
      hostname: agent.config.hostname,
      appName: agent.config.appName,
    });
  }

  function forwardMetrics(metrics) {
    debug('received: %j', metrics);

    if (parentCtl)
      parentCtl.notify({cmd: 'metrics', metrics: metrics});
  }

  return true;
}

function validateUrl(endpoint) {
  var server = Statsd();
  try {
    server.backend(endpoint);
  } catch(er) {
    throw Error(fmt('Invalid metrics endpoint `%s`: %s', endpoint, er.message));
  }

  return endpoint;
}

module.exports = sendMetrics;
module.exports.validateUrl = validateUrl;
