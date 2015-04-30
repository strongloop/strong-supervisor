var agent = require('./agent');
var cluster = require('cluster');
var debug = require('./debug')('express-records');

module.exports = function sendExpressRecords(parentCtl) {
  if (cluster.isWorker) {
    agent().on('express:usage-record', forwardRecordToMaster);
    return;
  }

  cluster.on('fork', function(worker) {
    worker.on('message', function forwardToParentIfExpressRecord(msg) {
      if (msg.cmd !== 'express:usage-record') return;
      debug('master received', msg.record);
      parentCtl.notify(msg);
    });
  });
};

function forwardRecordToMaster(record) {
  debug('received %j', record);
  process.send({
    cmd: 'express:usage-record',
    record: record
  });
}
