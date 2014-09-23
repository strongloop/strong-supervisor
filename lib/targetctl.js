var agent = require('strong-agent');
var assert = require('assert');
var debug = require('./debug')('targetctl');
var fs = require('fs');
var heapdump = null;
try {
  heapdump = require('heapdump');
} catch (e) {
  /* ignore. heapdump is optional */
}

module.exports = require('strong-control-channel/cluster')(onRequest);

function dumpHeap(req, rsp, callback) {
  if (!heapdump) {
    rsp.error = 'heap snapshot not supported, addon not built';
    return callback(rsp);
  }
  var filePath = req.filePath;

  // test if file is writable. heapdump module does not give verbose errors yet
  try {
    var fd = fs.openSync(filePath, 'w');
    fs.closeSync(fd);
  } catch (ex) {
    rsp.error = ex.message;
    return callback(rsp);
  }

  var result = heapdump.writeSnapshot(filePath, function() {
    rsp.heapdumpFile = filePath;
    callback(rsp);
  });

  if (!result) {
    rsp.error = 'heap dump failed';
    callback(rsp);
  }
}

function onRequest(req, callback) {
  var cmd = req.cmd;
  var rsp = {
  };

  try {
    switch (cmd) {
      // Heap Snapshot
      case 'heap-snapshot':
        return dumpHeap(req, rsp, callback);

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

      // Dynamic Instrumentation
      case 'patch':
        try {
          assert(agent.dyninst.metrics,
               'agent is not configured to report metrics');
          rsp.status = agent.dyninst.metrics.patch(req.patch);
        } catch(er) {
          rsp.error = er.message;
        }
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
