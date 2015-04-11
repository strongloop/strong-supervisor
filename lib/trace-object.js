var agent = require('./agent');
var tracer = require('./tracer');
var cluster = require('cluster');
var debug = require('./debug')('trace-object');

var tracerOptions = {
  archiveInterval: 20000,
  accountKey: agent().config.appName,
  useHttp: false
};
exports.tracerOptions = tracerOptions;

exports.sendTraceObject = function sendTraceObject(parentCtl) {
  if (cluster.isWorker) {
    debug('attempting to start trace object on worker %d', cluster.worker.id);
    if(tracer()) {
      debug('starting trace object on worker %d', cluster.worker.id);
      tracer().on('trace:object', forwardTraceToMaster);
    } else {
      debug('did not start trace object on worker %d.  perhaps, need license.', cluster.worker.id);
    }
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
