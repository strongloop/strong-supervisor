// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../lib/agent')();
var tap = require('tap');
var w = require('./watcher');
var cpu = require('../lib/watcher/cpu-profile');

var Master = w.Master;
var Worker = w.Worker;
var ParentCtl = w.ParentCtl;
var watcher = w.watcher;

var skipUnlessWatchdog = agent.internal.supports.watchdog
                       ? false
                       : {skip: 'watchdog not supported'};

function stall(count) {
  agent.emit('watchdogActivationCount', count);
}

tap.test('cpu-profile', skipUnlessWatchdog || function(t) {
  w.select('cpu-profile');

  t.test('in worker', function(tt) {
    var parentCtl = null;
    var cluster = Worker(send);
    var hook;

    watcher.start(parentCtl, cluster, cluster);

    tt.test('inactive', function(ttt) {
      ttt.plan(1);
      hook = function() {
        ttt.fail('should not occur');
        ttt.end();
      };
      stall(1000);
      setImmediate(function() {
        ttt.pass();
        ttt.end();
      });
    });

    tt.test('active', function(ttt) {
      hook = function(msg, type) {
        ttt.equal(type, 'emit');
        ttt.equal(msg.cmd, 'cpu:profile-data');
        ttt.equal(msg.stalls, 3);
        ttt.equal(msg.stallout, 2);
        ttt.assert(msg.profile);
        ttt.end();
      };
      agent.metrics.startCpuProfiling(1000);
      cpu.stallout(2);
      stall(1);
      stall(2);
    });

    tt.end();

    function send(msg, type) {
      if (hook) hook(msg, type);
    }
  });

  t.test('in master', function(tt) {
    var parentCtl = ParentCtl(notify);
    var cluster = Master();
    watcher.start(parentCtl, cluster, cluster);

    var worker = cluster.fork().queueEmit({
      cmd: 'cpu:profile-data',
      profile: {},
      stallout: 2,
      stalls: 3,
    });

    tt.plan(11);

    function notify(msg) {
      if (msg.cmd === 'cpu:profile-data') {
        tt.assert(msg.profile);
        tt.equal(msg.pid, worker.process.pid);
        tt.equal(msg.pst, worker.startTime);
        tt.equal(msg.stallout, 2);
        tt.equal(msg.stalls, 3);
        tt.equal(msg.wid, worker.id);
      } else {
        tt.equal(msg.cmd, 'cpu-profiling');
        tt.equal(msg.wid, worker.id);
        tt.equal(msg.isRunning, false);
        tt.equal(msg.pid, worker.process.pid);
        tt.equal(msg.pst, worker.startTime);
      }
    }
  });

  t.end();
});
