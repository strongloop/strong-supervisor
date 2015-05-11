var agent = require('../agent');

// Trace format:
//
//   https://github.com/strongloop/strongops/pull/245#issue-53570095
//
// Only httpCalls is of interest, the other properties are either duplicates of
// httpCalls, or sub-trees of httpCalls.

exports.worker = function(handle) {
  agent().on('topCalls', function(trace) {
    if (!trace.httpCalls) return;

    handle.emit({
      cmd: 'agent:trace',
      // startTime, worker.id added in master
      processId: process.pid,
      trace: trace.httpCalls,
    });
  });
};

exports.master = function(handle) {
  handle.on('agent:trace', function(msg, worker) {
    msg.pst = worker.startTime;
    msg.workerId = worker.id;
    handle.send(msg);
  });
};
