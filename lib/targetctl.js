var agent = require('./agent');
var assert = require('assert');
var cluster = require('cluster');
var cpuProfileWatcher = require('./watcher/cpu-profile');
var debug = require('./debug')('targetctl');
var fmt = require('util').format;
var fs = require('fs');
var heapdump = null;

try {
  heapdump = require('heapdump');
} catch (e) {
  /* eslint no-empty:0 */
  /* Ignore. Heapdump is optional. */
}

module.exports = require('strong-control-channel/cluster')(onRequest);

function getWorkerInfo() {
  var workerId = cluster.isMaster ? 0 : cluster.worker.id;
  var workerPid = cluster.isMaster ? process.pid : cluster.worker.process.pid;

  return {
    id: workerId,
    pid: workerPid,
  };
}

function dumpHeap(req, rsp, callback) {
  if (!heapdump) {
    rsp.error = 'heap snapshot not supported, addon not built';
    return callback(rsp);
  }
  var filePath = fmt('node-%d-%d.heapdump', process.pid, Date.now());
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
    fs.readFile(filePath, function(err, profile) {
      if (err)
        rsp.error = err.message;
      else
        rsp.profile = String(profile);

      fs.unlink(filePath, function(err) {
        debug('Failed to unlink %j: %s', filePath, err);
      });

      callback(rsp);
    });
  });

  if (!result) {
    rsp.error = 'heap dump failed';
    return callback(rsp);
  }
}

function onRequest(req, callback) {
  /* eslint no-redeclare:0 */
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
        if (req.stallout) cpuProfileWatcher.stallout(req.stallout);
        rsp.notify = {
          id: worker.id,
          pid: worker.pid,
          cmd: 'cpu-profiling',
          isRunning: true,
          timeout: req.timeout,
          stallout: req.stallout,
        };
        break;

      case 'stop-cpu-profiling':
        rsp.profile = agent().metrics.stopCpuProfiling();
        rsp.notify = {
          id: worker.id,
          pid: worker.pid,
          cmd: 'cpu-profiling',
          isRunning: false,
        };
        break;

      // Dynamic Instrumentation
      case 'patch':
        assert(agent().dyninst.metrics,
          'agent is not configured to report metrics');
        var err = agent().dyninst.metrics.patch(req.patch);

        if (err && err.error) {
          rsp.error = fmt('patch failed: %s on %j', err.error, err.patch);
        }

        break;

      case 'env-get':
        rsp.env = process.env;
        break;

      case 'env-set':
        for (var k in req.env) {
          console.log('worker set %s=%s', k, req.env[k]);
          process.env[k] = req.env[k];
        }
        break;

      case 'env-unset':
        for (var k in req.env) {
          console.log('master unset %s', req.env[k]);
          delete process.env[req.env[k]];
        }
        break;

      // Unsupported
      default:
        rsp.error = 'unsupported';
        break;
    }
  } catch (err) {
    rsp.error = err.message;
  }

  debug('request %s => response %s', debug.json(req), debug.json(rsp));

  callback(rsp);
}
