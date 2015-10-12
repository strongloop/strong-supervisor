var agent = require('./agent');
var assert = require('assert');
var cluster = require('cluster');
var cpuProfileWatcher = require('./watcher/cpu-profile');
var debug = require('./debug')('targetctl');
var fmt = require('util').format;
var fs = require('fs');
var capabilities = require('./capabilities');
var heapdump = null;
var async = require('async');
var strongDebugger = require('./debugger');
var extend = require('util')._extend;

// override any other options since some of them will break us
process.env.NODE_HEAPDUMP_OPTIONS = 'nosignal';
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

function queryCapabilities(req, rsp, callback) {
  var features = req.feature;
  var support = rsp.capabilities = {};

  if (typeof features === 'string') {
    features = features.split(',');
  } else {
    features = capabilities.list();
  }

  async.map(features, function(feature, callback) {
    capabilities.query(feature, function(status, reasons) {
      support[feature] = {
        status: status,
        reasons: reasons
      };

      callback(null, support[feature]);
    });
  }, function(err) {
    if (err) {
      rsp.error = err.message;
    }

    callback(rsp);
  });
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
    wid: worker.id,
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
      // Capabilities Query
      case 'query-capabilities':
        return queryCapabilities(req, rsp, callback);

      // Heap Snapshot
      case 'heap-snapshot':
        return dumpHeap(req, rsp, callback);

      // Object Tracking
      case 'start-tracking-objects':
        agent().metrics.startTrackingObjects();
        rsp.notify = {
          wid: worker.id,
          pid: worker.pid,
          cmd: 'object-tracking',
          isRunning: true,
        };
        break;

      case 'stop-tracking-objects':
        agent().metrics.stopTrackingObjects();
        rsp.notify = {
          wid: worker.id,
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
          wid: worker.id,
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
          wid: worker.id,
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

      case 'dbg-start':
        return startDebugger(req, rsp, callback);

      case 'dbg-stop':
        return stopDebugger(req, rsp, callback);

      case 'dbg-status':
        return debuggerStatus(req, rsp, callback);

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

function startDebugger(req, rsp, callback) {
  if (cluster.isMaster) {
    rsp.error = 'Cannot debug the supervisor process itself.';
    return callback(rsp);
  }

  if (!strongDebugger) {
    rsp.error = 'Cannot load the debugger module.';
    return callback(rsp);
  }

  strongDebugger.start(0, function(err, port) {
    rsp.error = err && err.message;
    rsp.port = port;
    addDebuggerStatusNotification(rsp);
    callback(rsp);
  });
}

function stopDebugger(req, rsp, callback) {
  if (cluster.isMaster) {
    rsp.error = 'Cannot debug the supervisor process itself.';
    return callback(rsp);
  }

  if (!strongDebugger) {
    rsp.error = 'Cannot load the debugger module.';
    return callback(rsp);
  }

  strongDebugger.stop(function() {
    addDebuggerStatusNotification(rsp);
    callback(rsp);
  });
}

function addDebuggerStatusNotification(rsp) {
  var worker = getWorkerInfo();
  rsp.notify = {
    wid: worker.id,
    pid: worker.pid,
    cmd: 'debugger-status',
  };
  extend(rsp.notify, strongDebugger.status());
}

function debuggerStatus(req, rsp, callback) {
  if (cluster.isMaster) {
    rsp.error = 'Cannot debug the supervisor process itself.';
    return callback(rsp);
  }

  if (!strongDebugger) {
    rsp.error = 'Cannot load the debugger module.';
    return callback(rsp);
  }

  rsp.status = strongDebugger.status();
  callback(rsp);
}
