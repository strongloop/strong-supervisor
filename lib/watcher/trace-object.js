'use strict';

var cluster = require('cluster');
var tracer = require('../tracer');

exports.worker = function(handle) {
  var config = handle.config;

  if (!config.enableTracing) {
    handle.debug('tracing is disabled');
    return;
  }

  if (!tracer()) {
    console.error('Did not start trace object on worker %d, license missing?',
      cluster.worker.id);
    return;
  }

  tracer().on('trace:object', function(record) {
    handle.send({
      cmd: 'trace:object',
      record: JSON.stringify(record),
    });
  });
};
