// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../lib/agent');
var tap = require('tap');
var w = require('./watcher');

var Master = w.Master;
var Worker = w.Worker;
var ParentCtl = w.ParentCtl;
var watcher = w.watcher;

tap.test('agent-trace', {skip: 'FIXME appmetrics'}, function(t) {
  w.select('agent-trace');

  t.test('in worker', function(tt) {
    var CALLS = {
      httpCalls: {},
    };
    var parentCtl = null;
    var cluster = Worker(send);
    watcher.start(parentCtl, cluster, cluster);

    setImmediate(function() {
      agent().emit('topCalls', CALLS);
    });

    function send(msg, type) {
      tt.equal(type, 'emit');
      tt.equal(msg.cmd, 'agent:trace');
      tt.equal(msg.processId, process.pid);
      tt.equal(msg.trace, CALLS.httpCalls);
      tt.end();
    }
  });

  t.test('in master', function(tt) {
    var parentCtl = ParentCtl(notify);
    var cluster = Master();
    watcher.start(parentCtl, cluster, cluster);

    var worker = cluster.fork().queueEmit({
      cmd: 'agent:trace',
      processId: 1234,
    });

    function notify(msg) {
      tt.equal(msg.cmd, 'agent:trace');
      tt.equal(msg.processId, 1234);
      tt.equal(msg.pst, worker.startTime);
      tt.equal(msg.workerId, worker.id);
      tt.end();
    }
  });

  t.end();
});
