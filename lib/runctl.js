// run-time control channel
var agent = require('./agent');
var agentVersion = require('strong-agent/package.json').version;
var async = require('async');
var cluster = require('cluster');
var debug = require('./debug')('runctl');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var master = require('strong-cluster-control');
var npmls = require('strong-npm-ls');
var os = require('os');
var targetctl = require('./targetctl');
var util = require('util');
var wsChannel = require('strong-control-channel/ws-channel').connect;
var processChannel = require('strong-control-channel/process').attach;

var debuggerVersion = 'n/a';
try {
  debuggerVersion = require('strong-debugger/package.json').version;
} catch (err) {
  debug('Cannot load strong-debugger: ', err);
}

exports.start = start;
exports.onRequest = onRequest; // For testing

// Return the number of event listeners.
var listenerCount = EventEmitter.listenerCount || function(emitter, event) {
  return emitter.listeners(event).length;
};

// sent on startup and with every status message
var osVersion = {
  platform: os.platform(),
  arch: os.arch(),
  release: os.release()
};

var ctlChannel = {
  notify: function notify(req) {
    debug('notify: ipcctl? %j %s', !!ipcctl, debug.json(req));
    if (ipcctl) {
      ipcctl.notify(req);
    }
    server.notify(req);
  },
};
// Expose runctl using local domain server
var server = require('strong-control-channel/server').create(onRequest);

// Expose runctl using node IPC only in the master/supervisor (workers
// attach targetctl to the master).
var ipcctl = null;
if (cluster.isMaster && !process.env.SL_RUN_SKIP_IPCCTL) {
  var wsUrl = process.env.STRONGLOOP_CONTROL;
  if (wsUrl) {
    debug('runctl connect: %s', wsUrl);
    ipcctl = wsChannel(onRequest, wsUrl);
    ipcctl.on('error', function(err) {
      console.error('strong-supervisor: lost connection to control channel: %s',
                    err.message);
      process.exit(1);
    });
    ipcctl.unref();
  } else if (process.send) {
    debug('runctl connect: <process channel>');
    ipcctl = processChannel(onRequest);
  }
}

if (cluster.isMaster) {
  exports.notifyStarted = function() {
    // Must not be done synchronously in the require, we don't know the app name
    // until after run has found the app, and change to its directory.
    ctlChannel.notify({
      wid: 0,
      cmd: 'started',
      pid: process.pid,
      ppid: 0,  // Value is not known for the master process
      pst: master.startTime,
      appName: agent().config.appName,
      agentVersion: agentVersion,
      debuggerVersion: debuggerVersion,
      nodeVersion: process.version,
      osVersion: osVersion,
      setSize: master.size,
    });

    // Status notifications usually come after every fork and exit, but if there
    // are no forks, we still want at least one status notification sent. Note
    // that size may be undefined, which isn't > or < than 1.
    if (!(master.options.size >= 1)) {
      notifyStatus();
    }
  };

  cluster.on('listening', function(worker, address) {
    debug('listening');
    ctlChannel.notify({
      cmd: 'listening',
      wid: worker.id,
      pid: worker.process.pid,
      pst: worker.startTime,
      address: address,
    });
  });

  exports.parentCtl = ctlChannel;

  master.on('fork', function(worker) {
    debug('fork');
    ctlChannel.notify({
      cmd: 'fork',
      wid: worker.id,
      pid: worker.process.pid,
      ppid: process.pid,
      pst: worker.startTime,
    });
    notifyStatus();
  });

  cluster.on('exit', function(worker, code, signal) {
    ctlChannel.notify({
      cmd: 'exit',
      wid: worker.id,
      pid: worker.process.pid,
      pst: worker.startTime,
      suicide: worker.suicide,
      reason: signal || code,
    });
    notifyStatus();
  });
}

function notifyStatus() {
  var status = clusterStatus();
  status.cmd = 'status';
  ctlChannel.notify(status);
}

function start(options) {
  var logger = options.logger;

  // XXX(sam) I don't like this 'last one wins' approach, but its impossible to
  // prevent the channel outliving sl-run under all conditions, this is the only
  // robust way I've found.
  try {
    fs.unlinkSync(options.channel);
  } catch (er) {
    /* eslint no-empty:0 */
    // Didn't exist
  }

  server.listen(options.channel);

  server.on('error', function(er) {
    logger.error('control channel failed to listen on `%s`: %s',
                 options.channel, er);
    throw er;
  });

  master.on('stop', function() {
    server.close();
  });
  return server;
}

function onRequest(req, callback) {
  /* eslint no-redeclare:0 */
  debug('request %s', debug.json(req));

  var cmd = req.cmd;
  var rsp = {
  };

  if (cmd === 'status') {
    rsp = clusterStatus();
  } else if (cmd === 'npm-ls') {
    rsp = null;
    npmls.read('.', function(er, data) {
      return callback(er ? {error: er.message} : data);
    });
  } else if (cmd === 'set-size') {
    try {
      if (/cpu/i.test(req.size))
        req.size = os.cpus().length;
      else
        req.size = +req.size;
      master.setSize(req.size);
    } catch (er) {
      rsp.error = er.message;
    }

  } else if (cmd === 'stop') {
    try {
      master.stop();
    } catch (er) {
      rsp.error = er.message;
    }

  } else if (cmd === 'restart') {
    try {
      process.chdir(process.env.PWD);
    } catch (er) {
      // Ignore, things will probably go poorly, but we don't want the master to
      // die even if the working directory becomes inaccessible, or the PWD,
      // probably a current link, becomes invalid.
    }
    try {
      master.restart();
    } catch (er) {
      rsp.error = er.message;
    }

  } else if (cmd === 'disconnect') {
    cluster.disconnect();

  } else if (cmd === 'fork') {
    rsp = null;
    var worker = cluster.fork();
    // worker emits its own 'fork' _after_ s-c-c has augmented it
    worker.once('fork', function() {
      var rsp = {
        workerID: worker.id,
        processID: worker.process.pid,
        pst: worker.startTime,
      };
      callback(rsp);
    });

  } else if (cmd === 'env-set') {
    for (var k in req.env) {
      process.env[k] = req.env[k];
    }
    rsp = requestAllTargets(req, callback);

  } else if (cmd === 'env-unset') {
    for (var k in req.env) {
      delete process.env[req.env[k]];
    }
    rsp = requestAllTargets(req, callback);

  } else if (cmd === 'tracing') {
    var enabled = !!process.env.STRONGLOOP_TRACING;
    if (req.enabled && !enabled) {
      process.env.STRONGLOOP_TRACING = 1;
    } else if (!req.enabled && enabled) {
      delete process.env.STRONGLOOP_TRACING;
    } else {
      return;
    }

    try {
      master.restart();
    } catch (er) {
      rsp.error = er.message;
    }

  } else if (cmd === 'signal') {
    if (req.pid !== process.pid) {
     // Do nothing
    } else if (listenerCount(process, req.signame) > 0) {
      // If there are any listeners for this signal, emit it on the
      // process object.
      process.emit(req.signame);
    } else {
      // If there are no listeners, use the default action.
      process.kill(process.pid, req.signame);
    }

  } else {
    // Pass any others off to the target
    rsp = requestOfTarget(req, rsp, callback);
  }

  if (callback && rsp) {
    process.nextTick(callback.bind(null, rsp));
  }
}

function requestAllTargets(req, callback) {
  console.log('forwarding to all workers:', req);
  var wIds = [];
  for (var w in cluster.workers) {
    wIds.push(cluster.workers[w].id);
  }
  async.map(wIds, forwardToWorker, makeResponse);
  return null;

  function forwardToWorker(wid, next) {
    var wreq = JSON.parse(JSON.stringify(req));
    wreq.target = wid;
    console.log('forwarding %j', wreq);
    requestOfTarget(wreq, {}, function(rsp) {
      next(null, rsp);
    });
  }

  function makeResponse(_, res) {
    callback(res);
  }
}

function requestOfTarget(req, rsp, callback) {
  debug('requestOfTarget %j', req);

  if (targetctl.request(+req.target, req, wrapCallback)) {
    rsp = null;
  } else {
    rsp.error = util.format('target %s not found', req.target);
  }

  return rsp;

  function wrapCallback(rsp) {
    // add pst field in master since workers don't know their own pst
    var target = cluster.workers[+rsp.target] || master;
    rsp.pst = target.startTime;
    if (rsp.notify) {
      ctlChannel.notify(rsp.notify);
      delete rsp.notify;
    }

    callback(rsp);
  }
}

function clusterStatus() {
  var mStatus = master.status();
  // pst is used by PM, startTime is set by strong-cluster-control
  mStatus.master.pst = mStatus.master.pst || mStatus.master.startTime;
  mStatus.appName = agent().config.appName;
  mStatus.agentVersion = agentVersion;
  mStatus.debuggerVersion = debuggerVersion;
  mStatus.nodeVersion = process.version;
  mStatus.osVersion = osVersion;
  return mStatus;
}
