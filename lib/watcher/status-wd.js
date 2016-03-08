// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var app = require('../app');
var tracer = require('../tracer');

exports.worker = function(handle) {
  setImmediate(function() {
    var wd = {
      cmd: 'status:wd',
      pwd: process.env.PWD,
      cwd: process.cwd(),
      pid: process.pid,
      isTracing: !!tracer(),
    };

    wd.appName = app.name();

    handle.emit(wd);
  });
};

exports.master = function(handle) {
  handle.on('status:wd', function(msg, worker) {
    // Mix-in the worker identity: startTime is known only in the master, and
    // worker.id is just convenient to do here.
    msg.pst = worker.startTime;
    msg.wid = worker.id;
    handle.send(msg);
  });
};
