// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

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
