var agent = require('./agent');
var assert = require('assert');
var cluster = require('cluster');
var debug = require('./debug')('targetctl');
var fmt = require('util').format;
var fs = require('fs');
var heapdump = null;

try {
  heapdump = require('heapdump');
} catch (e) {
  /* ignore. heapdump is optional */
}

module.exports = require('strong-control-channel/cluster')(onRequest);

function getWorkerInfo() {
  var workerId = cluster.isMaster? 0 : cluster.worker.id;
  var workerPid = cluster.isMaster? process.pid : cluster.worker.process.pid;

  return {
    id: workerId,
    pid: workerPid
  };
}

function dumpHeap(req, rsp, callback) {
  if (!heapdump) {
    rsp.error = 'heap snapshot not supported, addon not built';
    return callback(rsp);
  }
  var filePath = req.filePath;
  var worker = getWorkerInfo();

  // test if file is writable. heapdump module does not give verbose errors yet
  try {
    var fd = fs.openSync(filePath, 'w');
    fs.closeSync(fd);
  } catch (err) {
    rsp.error = err.message;
    return callback(rsp);
  }

  rsp.notify = {
    id: worker.id,
    pid: worker.pid,
    cmd: 'heap-snapshot',
    isRunning: false,
  };

  var result = heapdump.writeSnapshot(filePath, function() {
    rsp.filePath = filePath;
    callback(rsp);
  });

  if (!result) {
    rsp.error = 'heap dump failed';
    callback(rsp);
  }
}

function onRequest(req, callback) {
  var cmd = req.cmd;
  var worker = getWorkerInfo();

  var rsp = {
  };

  try {
    switch (cmd) {
      // Heap Snapshot
      case 'heap-snapshot':
        return dumpHeap(req, rsp, callback);

      // Object Tracking
      case 'start-tracking-objects':
        agent().metrics.startTrackingObjects();
        rsp.notify = {
          id: worker.id,
          pid: worker.pid,
          cmd: 'object-tracking',
          isRunning: true,
        };
        break;

      case 'stop-tracking-objects':
        agent().metrics.stopTrackingObjects();
        rsp.notify = {
          id: worker.id,
          pid: worker.pid,
          cmd: 'object-tracking',
          isRunning: false,
        };
        break;

      // CPU Profiling
      case 'start-cpu-profiling':
        agent().metrics.startCpuProfiling(req.timeout);
        rsp.notify = {
          id: worker.id,
          pid: worker.pid,
          cmd: 'cpu-profiling',
          isRunning: true,
          timeout: req.timeout
        };
        break;

      case 'stop-cpu-profiling':
        var filePath = req.filePath;
        var profileData = agent().metrics.stopCpuProfiling();
        return fs.writeFile(filePath, profileData, function(err) {
          if (err) {
            rsp.error = err.message;
          } else {
            rsp.filePath = filePath;
            rsp.notify = {
              id: worker.id,
              pid: worker.pid,
              cmd: 'cpu-profiling',
              isRunning: false,
            };
          }

          callback(rsp);
        });

      // Dynamic Instrumentation
      case 'patch':
        assert(agent().dyninst.metrics,
          'agent is not configured to report metrics');
        var err = agent().dyninst.metrics.patch(req.patch);

        if(err && err.error) {
          rsp.error = fmt('patch failed: %s on %j', er.error, er.patch);
        }

        break;

      // Unsupported
      default:
        rsp.error = 'unsupported';
        break;
    }
  } catch(err) {
    rsp.error = err.message;
  }

  debug('request %s => response %s', debug.json(req), debug.json(rsp));

  callback(rsp);
}
