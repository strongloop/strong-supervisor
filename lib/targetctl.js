var agent = require('strong-agent');
var debug = require('debug')('strong-supervisor:targetctl');

module.exports = require('strong-control-channel/cluster')(onRequest);

function onRequest(req, callback) {
  var cmd = req.cmd;
  var rsp = {
  };

  if (cmd === 'start-tracking-objects') {
    if (!agent.metrics.startTrackingObjects()) {
      rsp.error = 'unsupported';
    }
  }

  else if (cmd === 'stop-tracking-objects') {
    agent.metrics.stopTrackingObjects();
  }

  else {
    rsp.error = 'unsupported';
  }

  debug('request %s response %j', req, rsp);

  callback(rsp);
}
