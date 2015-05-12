var agent = require('../agent');

exports.worker = function(handle) {
  agent().on('express:usage-record', function(record) {
    handle.send({
      cmd: 'express:usage-record',
      record: record
    });
  });
};
