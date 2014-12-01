// run-time control channel
var agent = require('./agent');
var cluster = require('cluster');
var debug = require('./debug')('runctl');
var fs = require('fs');
var master = require('strong-cluster-control');
var npmls = require('strong-npm-ls');
var path = require('path');
var targetctl = require('./targetctl');
var util = require('util');

exports.start = start;
exports.onRequest = onRequest; // For testing

// Expose runctl using local domain server
var server = require('strong-control-channel/server').create(onRequest);

// Expose runctl using node IPC only in the master/supervisor (workers
// attach targetctl to the master).

if (cluster.isMaster && process.send) {
  var ipcctl = require('strong-control-channel/process').attach(onRequest);
  var cluster = require('cluster');
  var agentVersion = require('strong-agent/package.json').version;

  // Must not be done synchronously in the require, we don't know the app name
  // until after run has found the app, and change to its directory.
  process.nextTick(function() {
    ipcctl.notify({
      cmd: 'started',
      pid: process.pid,
      appName: agent().config.appName,
      agentVersion: agentVersion,
    });
  });

  cluster.on('listening', function(worker, address) {
    debug('listening');

    ipcctl.notify({
      cmd: 'listening',
      id: worker.id,
      pid: worker.process.pid,
      address: address,
    });
  });

  exports.parentCtl = ipcctl;

  cluster.on('fork', function(worker) {
    debug('fork');

    ipcctl.notify({
      cmd: 'fork',
      id: worker.id,
      pid: worker.process.pid,
    });
    notifyStatus();
  });

  cluster.on('exit', function(worker, code, signal) {
    ipcctl.notify({
      cmd: 'exit',
      id: worker.id,
      pid: worker.process.pid,
      suicide: worker.suicide,
      reason: signal || code,
    });
    notifyStatus();
  });

  function notifyStatus() {
    var status = master.status();
    status.cmd = 'status';

    ipcctl.notify(status);
  }
}

function start(options) {
  var logger = options.logger;

  // XXX(sam) I don't like this 'last one wins' approach, but its impossible to
  // prevent the channel outliving sl-run under all conditions, this is the only
  // robust way I've found.
  try {
    fs.unlinkSync(options.channel);
  } catch(er) {
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
};

function onRequest(req, callback) {
  debug('request %s', debug.json(req));

  var cmd = req.cmd;
  var rsp = {
  };

  if(cmd === 'status') {
    rsp = master.status();
  } else if(cmd === 'npm-ls') {
    rsp = null;
    npmls.read('.', function(er, data) {
      return callback(er ? {error: er.message} : data);
    });
  } else if(cmd === 'set-size') {
    try {
      master.setSize(req.size);
    } catch(er) {
      rsp.error = er.message;
    }

  } else if(cmd === 'stop') {
    try {
      master.stop();
    } catch(er) {
      rsp.error = er.message;
    }

  } else if(cmd === 'restart') {
    try {
      master.restart();
    } catch(er) {
      rsp.error = er.message;
    }

  } else if(cmd === 'disconnect') {
    cluster.disconnect();

  } else if(cmd === 'fork') {
    cluster.fork();
    var child = cluster.fork();
    rsp.workerID = child.workerID;
    rsp.processID = child.process.pid;

  } else {
    // Pass any others off to the target
    rsp = requestOfTarget(req, rsp, callback);
  }

  if(callback && rsp) {
    process.nextTick(callback.bind(null, rsp));
  }
}

function requestOfTarget(req, rsp, callback) {
  if (targetctl.request(+req.target, req, wrapCallback)) {
    rsp = null;
  } else {
    rsp.error = util.format('target %s not found', req.target);
  }

  return rsp;

  function wrapCallback(rsp) {
    if (ipcctl && rsp.notify) {
      ipcctl.notify(rsp.notify);
    }
    delete rsp.notify;

    callback(rsp);
  }
}
