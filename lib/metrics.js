var cluster = require('cluster');
var generateLogName = require('./logname').generate;
var url = require('url');

function sendMetrics() {
  var endpoint = process.env.STRONGLOOP_METRICS;

  if (!endpoint) return false;

  var options = url.parse(endpoint);

  if (options.protocol !== 'statsd:') {
    if (cluster.isMaster) {
      // Only warn about this once, in the supervisor
      this.logger.warn('ignoring unsupported metrics endpoint "%s"', endpoint);
    }
    return false;
  }

  var scope = options.pathname;

  if (scope !== null) {
    scope = scope.slice(1);

    if (scope.length < 1) {
      scope = null;
    } else {
      scope = generateLogName(scope, {
        id: cluster.isMaster ? 'supervisor' : String(cluster.worker.id),
        pid: process.pid,
      });
    }
  }

  if (cluster.isMaster) {
    this.logger.info('supervisor reporting metrics to "%s"', endpoint);
  }

  var statsd = require('strong-agent-statsd')({
    port: options.port,
    host: options.hostname,
    scope: scope,
  });

  require('strong-agent').use(statsd);

  return statsd;
}

module.exports = sendMetrics;
