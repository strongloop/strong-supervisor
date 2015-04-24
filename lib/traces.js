var agent = require('./agent');
var cluster = require('cluster');
var master = require('strong-cluster-control');
var debug = require('./debug')('traces');

// Trace format:
//
//   https://github.com/strongloop/strongops/pull/245#issue-53570095
//
// Only httpCalls is of interest, the other properties are either duplicates of
// httpCalls, or sub-trees of httpCalls.
module.exports = function sendTraces(parentCtl) {
  if (cluster.isWorker) {
    agent().on('topCalls', function(trace) {
      debug('worker sending: %j', debug.json(trace));
      if (trace.httpCalls) {
        process.send({
          cmd: 'agent:trace',
          workerId: cluster.worker.id,
          processId: process.pid,
          trace: trace.httpCalls,
        });
      }
    });
    return;
  }

  if (!parentCtl) {
    debug('parentCtl not available, all traces will be discarded.');
    return;
  }

  master.on('fork', function(worker) {
    worker.on('message', function(msg) {
      if (msg.cmd !== 'agent:trace') return;
      debug('master received: %j', debug.json(msg.trace));
      msg.pst = worker.startTime;
      parentCtl.notify(msg);
    });
  });
};
