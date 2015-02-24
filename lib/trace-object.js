var tracer = require('./tracer');
var cluster = require('cluster');
var debug = require('./debug')('trace-object');

module.exports = function sendTraceObject(parentCtl) {

  if (cluster.isWorker) {
    tracer().on('trace:object', forwardTraceToMaster);
    return;
  }

  if (!parentCtl) {
    debug('parentCtl not available, all trace objects will be discarded.');
    return;
  }

  cluster.on('fork', function(worker) {
    worker.on('message', function forwardToParentIfTraceObject(msg) {
      if (msg.cmd !== 'trace:object') return;
      debug('master received', debug.json(msg.record));
      parentCtl.notify(msg);
    });
  });
};

function forwardTraceToMaster(record) {
  debug('received %j', debug.json(record));
  process.send({
    cmd: 'trace:object',
    record: record,
  });
}
