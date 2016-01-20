'use strict';

var tap = require('tap');
var w = require('./watcher');
var Worker = w.Worker;
var watcher = w.watcher;

tap.test('heart-beat', function(t) {
  w.select('heart-beat');

  t.test('in worker', function(tt) {
    var RECORD = JSON.stringify({dummyRecord: ''});
    var parentCtl = null;
    var cluster = Worker(send);

    watcher.start(parentCtl, cluster, cluster);

    function send(msg, type) {
      watcher._watchers[0].stop();
      tt.equal(type, 'send');
      tt.equal(msg.cmd, 'metrics');
      tt.equal(msg.record, RECORD);
      tt.end();
    }
  });
  t.end();
});
