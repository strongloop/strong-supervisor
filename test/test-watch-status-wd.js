'use strict';

var tap = require('tap');
var w = require('./watcher');

var Master = w.Master;
var Worker = w.Worker;
var ParentCtl = w.ParentCtl;
var watcher = w.watcher;

tap.test('status-wd', function(t) {
  w.select('status-wd');

  t.test('in worker', function(tt) {
    var parentCtl = null;
    var cluster = Worker(send);
    watcher.start(parentCtl, cluster, cluster);

    function send(msg, type) {
      tt.equal(type, 'emit');
      tt.equal(msg.cmd, 'status:wd');
      tt.equal(msg.pwd, process.env.PWD);
      tt.equal(msg.cwd, process.cwd());
      tt.equal(msg.pid, process.pid);
      tt.end();
    }
  });

  t.test('in master', function(tt) {
    var parentCtl = ParentCtl(notify);
    var cluster = Master();
    watcher.start(parentCtl, cluster, cluster);

    var worker = cluster.fork().queueEmit({
      cmd: 'status:wd',
      pwd: 'PWD',
      cwd: 'CWD',
      pid: 1234,
      appName: 'express-app',
    });

    function notify(msg) {
      tt.equal(msg.cmd, 'status:wd');
      tt.equal(msg.pwd, 'PWD');
      tt.equal(msg.cwd, 'CWD');
      tt.equal(msg.pid, 1234);
      tt.equal(msg.appName, 'express-app');
      tt.equal(msg.pst, worker.startTime);
      tt.equal(msg.wid, worker.id);
      tt.end();
    }
  });

  t.end();
});
