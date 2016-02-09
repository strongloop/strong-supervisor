exports.worker = function(handle) {
  /* FIXME(bajtos) rework this code to use appmetrics
  agent().on('express:usage-record', function(record) {
    handle.send({
      cmd: 'express:usage-record',
      record: record
    });
  });
  */
};
