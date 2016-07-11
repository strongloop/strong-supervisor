// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../lib/agent');
var tap = require('tap');
var w = require('./watcher');

var Worker = w.Worker;
var watcher = w.watcher;

// FIXME(toby) agent was an EventEmitter, and it emitted an
// 'express:usage-record'. The implementation is in
// https://github.com/strongloop/strongops, in
// lib/probes/strong-express-metrics.js
//
// The probe is basically dynamically detecting the presence of
// https://www.npmjs.com/package/strong-express-metrics in the application, and
// when its found, emitting what it observes on the agent. the supervisor
// transports the data up to strong-pm, arc queries it, and Voila, information
// about all the HTTP API calls is available in arc.
tap.test('express-records', {skip: 'FIXME appmetrics'}, function(t) {
  w.select('express-records');

  t.test('in worker', function(tt) {
    var RECORD = {record: 'record'};
    var parentCtl = null;
    var cluster = Worker(send);

    watcher.start(parentCtl, cluster, cluster);

    setImmediate(function() {
      agent().emit('express:usage-record', RECORD);
    });

    function send(msg, type) {
      tt.equal(type, 'send');
      tt.equal(msg.cmd, 'express:usage-record');
      tt.equal(msg.record, RECORD);
      tt.end();
    }
  });

  t.end();
});
