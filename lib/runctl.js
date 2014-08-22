// run-time control channel
var cluster = require('cluster');
var debug = require('./debug')('runctl');
var fs = require('fs');
var master = require('strong-cluster-control');
var targetctl = require('./targetctl');
var util = require('util');

exports.start = start;
exports.onRequest = onRequest; // For testing

// Expose runctl using local domain server
var server = require('strong-control-channel/server').create(onRequest);

// Expose runctl using node IPC only in the master/supervisor (workers
// attach targetctl to the master).

if (cluster.isMaster) {
  var ipcctl = require('strong-control-channel/process').attach(onRequest);
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
  if(targetctl.request(+req.target, req, function(rsp) { callback(rsp); })) {
    rsp = null;
  } else {
    rsp.error = util.format('target %s not found', req.target);
  }
  return rsp;
}
