var agent = require('strong-agent');
var debug = require('./debug')('targetctl');

module.exports = require('strong-control-channel/cluster')(onRequest);

function onRequest(req, callback) {
  var cmd = req.cmd;
  var rsp = {
  };

  try {
    switch (req.cmd) {
      // Object Tracking
      case 'start-tracking-objects':
        if (!agent.metrics.startTrackingObjects()) {
          rsp.error = 'unsupported';
        }
        break;

      case 'stop-tracking-objects':
        agent.metrics.stopTrackingObjects();
        break;

      // CPU Profiling
      case 'start-cpu-profiling':
        agent.metrics.startCpuProfiling();
        break;

      case 'stop-cpu-profiling':
        rsp.profile = agent.metrics.stopCpuProfiling();
        break;

      // Unsupported
      default:
        rsp.error = 'unsupported';
        break;
    }
  } catch(er) {
    rsp.error = er.message;
  }

  debug('request %s => response %s', debug.json(req), debug.json(rsp));

  callback(rsp);
}
