'use strict';

var debug = require('./debug');
var tracer = require('../lib/tracer');
var tap = require('tap');
var w = require('./watcher');

var Worker = w.Worker;
var watcher = w.watcher;

tap.test('trace-object', function(t) {
  w.select('trace-object');

  t.test('in worker, tracing disabled', function(tt) {
    var parentCtl = null;
    var cluster = Worker();
    var config = {
      enableTracing: false,
    };

    tt.doesNotThrow(function() {
      watcher.start(parentCtl, cluster, cluster, config);
    });

    tt.end();
  });

  t.test('in worker, tracing enabled', function(tt) {
    var parentCtl = null;
    var cluster = Worker(send);
    var config = {
      enableTracing: true,
    };
    process.env.STRONGLOOP_APPNAME = 'some app name';
    tt.assert(tracer.start());

    watcher.start(parentCtl, cluster, cluster, config);

    function send(msg, type) {
      debug('trace:object: %s', debug.json(msg));
      tt.equal(type, 'send');
      tt.equal(msg.cmd, 'trace:object');
      tt.equal(typeof msg.record, 'string');
      var record = JSON.parse(msg.record);
      tt.assert(record.version);
      tt.assert(record.packet);
      tt.end();
    }
  });

});
