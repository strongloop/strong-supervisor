// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../agent');

exports.worker = function(handle) {
  agent().on('express:usage-record', function(record) {
    handle.send({
      cmd: 'express:usage-record',
      record: record
    });
  });
};
