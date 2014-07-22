var cluster = require('cluster');
var ctl = require('./targetctl');
var debug = require('debug')('strong-supervisor:channel');
var fs = require('fs');
var master = require('strong-cluster-control');
var server = require('strong-control-channel/server').create(onRequest);
var util = require('util');

exports.start = start;
exports.onRequest = onRequest; // For testing

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
  debug('request', req);

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

  } else if(cmd === 'start-tracking-objects') {
    if(ctl.request(+req.target, req, function(rsp) { callback(rsp); })) {
      rsp = null;
    } else {
      rsp.error = util.format('target %s not found', req.target);
    }

  } else if(cmd === 'stop-tracking-objects') {
    if(ctl.request(+req.target, req, function(rsp) { callback(rsp); })) {
      rsp = null;
    } else {
      rsp.error = util.format('target %s not found', req.target);
    }

  } else if(cmd === 'disconnect') {
    cluster.disconnect();

  } else if(cmd === 'fork') {
    cluster.fork();

  } else {
    rsp.error = 'unsupported';
  }

  if(callback && rsp) {
    process.nextTick(callback.bind(null, rsp));
  }
}
