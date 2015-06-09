var EE = require('events').EventEmitter;
var cluster = require('cluster');
var helper = require('./helper');
var tap = require('tap');
var yes = require.resolve('./yes-app');

var msg = new EE;
process.send = function send(_) {
  msg.emit('send', _.data);
};

// After process.send is assigned, or runctl won't send notifications.
var runctl = require('../lib/runctl');

require('strong-cluster-control').start();

cluster.setupMaster({exec: yes});

tap.comment('forking...');

var w1, w2;

tap.test('fork1', function(t) {
  msg.on('send', function onFork1(data) {
    t.comment('fork1:', data);
    if (data.cmd === 'fork') {
      assertFork(data, t, 1);
      msg.removeListener('send', onFork1);
    }
  });
  w1 = cluster.fork();
});

tap.test('fork2', function(t) {
  msg.on('send', function onFork2(data) {
    t.comment('fork2:', data);
    if (data.cmd === 'fork') {
      assertFork(data, t, 2);
      msg.removeListener('send', onFork2);
    }
    t.comment('fork2, done');
  });
  w2 = cluster.fork();
});

function assertFork(data, t, id) {
  t.equal(data.cmd, 'fork');
  t.equal(data.wid, id);
  t.assert(data.pid > 0, 'pid');
  t.assert(data.pst > 0, 'pst');
  t.end();
}

tap.test('status', function(t) {
  msg.on('send', function onStatus(data) {
    if (data.cmd !== 'status') return;
    t.comment('status: %j', data);
    t.equal(data.master.pid, process.pid);
    t.assert(data.master.pst > 0);
    t.equal(data.workers.count, cluster.workers.count);
    if (data.workers.count > 0) {
      t.equal(data.workers[0].pid, w1.process.pid);
      t.equal(data.workers[0].pst, w1.startTime);
    }
    if (data.workers.count > 1) {
      t.equal(data.workers[1].pid, w2.process.pid);
      t.equal(data.workers[1].pst, w2.startTime);
    }
    t.end();
    msg.removeListener('send', onStatus);
  });
});

tap.test('exit2', function(t) {
  msg.on('send', function onExit2(data) {
    t.comment('exit2: %j', data);
    if (data.cmd !== 'exit') {
      return;
    }
    assertExit(data, t, false, 2, w2.process.pid, 'SIGHUP');
    msg.removeListener('send', onExit2);
  });
  w2.process.kill('SIGHUP');
});

tap.test('exit1', function(t) {
  msg.on('send', function onExit1(data) {
    t.comment('exit1:', data);
    if (data.cmd !== 'exit') {
      return;
    }
    assertExit(data, t, true, 1, w1.process.pid, 0);
    msg.removeListener('send', onExit1);
  });
  w1.disconnect();
});

function assertExit(data, t, suicide, id, pid, reason) {
  t.equal(data.cmd, 'exit', 'cmd');
  t.equal(data.suicide, suicide, 'suicide');
  t.equal(data.pid, pid, 'pid');
  t.assert(data.pst > 0, 'pst');
  t.equal(data.reason, reason, 'reason');
  t.end();
}
