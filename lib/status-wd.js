'use strict';

var cluster = require('cluster');
var debug = require('./debug')('status-wd');
var master = require('strong-cluster-control');

module.exports = function(parentCtl) {
  if (cluster.worker) {
    setImmediate(function() {
      var wd = {
        cmd: 'status:wd',
        pwd: process.env.PWD,
        cwd: process.cwd(),
        pid: process.pid,
        id: cluster.worker.id,
      };
      debug('sending %j', wd);
      process.send(wd);
    });
    return;
  } else if (!parentCtl) {
    return;
  }

  master.on('fork', function(worker) {
    worker.on('message', function(msg) {
      if (msg.cmd !== 'status:wd') return;
      debug('master received: %j', msg);
      msg.pst = worker.startTime;
      parentCtl.notify(msg);
    });
  });
};
