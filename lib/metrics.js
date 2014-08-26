var cluster = require('cluster');
var expandString = require('./expander').expand;
var url = require('url');

function sendMetrics() {
  var agent = require('strong-agent');
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

  if (!scope || scope === '/') {
    scope = '%a.%h.%w';
  } else {
    scope = scope.slice(1);
  }

  scope = expandString(scope, {
    id: (cluster.worker && cluster.worker.id) |0,
    pid: process.pid,
    hostname: agent.config.hostname,
    appName: agent.config.appName,
  });

  if (cluster.isMaster) {
    this.logger.info('supervisor reporting metrics to "%s" using scope "%s"',
                     endpoint, scope);
  }

  var statsd = require('strong-agent-statsd')({
    port: options.port,
    host: options.hostname,
    scope: scope,
  });

  agent.use(statsd);

  return statsd;
}

module.exports = sendMetrics;
