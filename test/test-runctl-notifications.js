// test sl-runctl heap dump
var helper = require('./helper');

if (helper.skip()) return;

helper.pass = true; // This test uses tap lib to determine success.

var EE = require('events').EventEmitter;
var cluster = require('cluster');
var msg = new EE;
var tap = require('tap');
var yes = require.resolve('./yes-app');

process.send = function send(_) {
  msg.emit('send', _.data);
};

// After process.send is assigned, or runctl won't send notifications.
var runctl = require('../lib/runctl');

cluster.setupMaster({exec: yes});

console.log('forking...');

var w1, w2;

tap.test('fork1', function(t) {
  w1 = cluster.fork();
  msg.once('send', function(data) {
    console.log('fork1:', data);
    assertFork(data, t, 1);
  });
});

tap.test('fork2', function(t) {
  w2 = cluster.fork();
  msg.once('send', function(data) {
    console.log('fork2:', data);
    assertFork(data, t, 2);
    console.log('fork2, done');
  });
});

function assertFork(data, t, id) {
  t.equal(data.cmd, 'fork');
  t.equal(data.id, id);
  t.assert(data.pid > 0, 'pid');
  t.end();
}

tap.test('exit2', function(t) {
  w2.process.kill('SIGHUP');
  msg.once('send', function(data) {
    console.log('exit2: %j', data);
    assertExit(data, t, false, 2, w2.process.pid, 'SIGHUP');
  });
});

tap.test('exit1', function(t) {
  w1.disconnect();
  msg.once('send', function(data) {
    console.log('exit1:', data);
    assertExit(data, t, true, 1, w1.process.pid, 0);
  });
});

function assertExit(data, t, suicide, id, pid, reason) {
  t.equal(data.cmd, 'exit', 'cmd');
  t.equal(data.suicide, suicide, 'suicide');
  t.equal(data.pid, pid, 'pid');
  t.equal(data.reason, reason, 'reason');
  t.end();
}

msg.on('send', function(data) {
  if (data.cmd !== 'status') return;
  console.log('status: %j', data);
  assert.equal(data.master.pid, process.pid);
  assert.equal(data.workers.count, cluster.workers.count);
  if (data.workers.count > 0) {
    assert.equal(data.workers[0].pid, w1.process.pid);
  }
  if (data.workers.count > 1) {
    assert.equal(data.workers[1].pid, w2.process.pid);
  }
});
