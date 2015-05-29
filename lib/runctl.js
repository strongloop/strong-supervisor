// run-time control channel
var agent = require('./agent');
var agentVersion = require('strong-agent/package.json').version;
var async = require('async');
var cluster = require('cluster');
var debug = require('./debug')('runctl');
var fs = require('fs');
var master = require('strong-cluster-control');
var npmls = require('strong-npm-ls');
var os = require('os');
var targetctl = require('./targetctl');
var util = require('util');
var wsChannel = require('strong-control-channel/ws-channel').connect;
var processChannel = require('strong-control-channel/process').attach;

exports.start = start;
exports.onRequest = onRequest; // For testing

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
if (cluster.isMaster && process.send && !process.env.SL_RUN_SKIP_IPCCTL) {
  var wsUrl = process.env.STRONGLOOP_CONTROL;
  debug('runctl connect: %s', wsUrl || '<process channel>');
  ipcctl = wsUrl ? wsChannel(onRequest, wsUrl) : processChannel(onRequest);
}

if (cluster.isMaster) {
  exports.notifyStarted = function() {
    // Must not be done synchronously in the require, we don't know the app name
    // until after run has found the app, and change to its directory.
    ctlChannel.notify({
      cmd: 'started',
      pid: process.pid,
      pst: master.startTime,
      appName: agent().config.appName,
      agentVersion: agentVersion,
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
      id: worker.id,
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
      id: worker.id,
      pid: worker.process.pid,
      pst: worker.startTime,
    });
    notifyStatus();
  });

  cluster.on('exit', function(worker, code, signal) {
    ctlChannel.notify({
      cmd: 'exit',
      id: worker.id,
      pid: worker.process.pid,
      pst: worker.startTime,
      suicide: worker.suicide,
      reason: signal || code,
    });
    notifyStatus();
  });

  function notifyStatus() {
    var status = clusterStatus();
    status.cmd = 'status';
    ctlChannel.notify(status);
  }
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
    if (req.enabled) {
      process.env.STRONGLOOP_TRACING = 1;
    } else if (process.env.STRONGLOOP_TRACING !== null) {
      delete process.env.STRONGLOOP_TRACING;
    }

    try {
      master.restart();
    } catch (er) {
      rsp.error = er.message;
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
  return mStatus;
}
