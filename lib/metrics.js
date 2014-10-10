var Statsd = require('strong-statsd');
var cluster = require('cluster');
var debug = require('./debug')('metrics');
var expandString = require('./expander').expand;
var url = require('url');

function sendMetrics(callback) {
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
  });
  var er = server.backend(endpoint);

  if (er.error) {
    // Only warn about this once, in the supervisor
    delete process.env.STRONGLOOP_METRICS;
    this.logger.warn('ignoring invalid metrics endpoint `%s`: %s',
      endpoint, er.error);
    // XXX(sam) perhaps we should not ignore, and instead should abort?

    process.nextTick(callback);
    return false;
  }

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

  return true;
}

module.exports = sendMetrics;
