// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../lib/agent')();
var control = require('strong-control-channel/process');
var cp = require('child_process');
var debug = require('./debug');
var ee = new (require('events').EventEmitter)();
var test = require('tap').test;
var util = require('util');

var skipUnlessWatchdog = agent.internal.supports.watchdog
                       ? false
                       : {skip: 'watchdog not supported'};
var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

var options = {stdio: [0, 1, 2, 'ipc']};
var yes = require.resolve('./v1-app');
var args = [
  require.resolve('../bin/sl-run'),
  '--no-timestamp-supervisor',
  '--no-timestamp-workers',
  '--cluster=0',
  '--no-profile',
  '--log', debug.enabled ? '-' : ('_test-' + process.pid + '-run.log'),
  yes
];
var run = cp.spawn(process.execPath, args, options);

function onRequest(req, cb) {
  debug('onRequest: %j', req);
  ee.emit(req.cmd, req);
  cb();
}

var ctl = control.attach(onRequest, run);

function once(t, fn) {
  return wrapped;
  function wrapped() {
    t.assert(!wrapped.called, 'not called before');
    wrapped.called = true;
    return fn.apply(this, arguments);
  }
}

test('start', function(t) {
  ee.once('started', function(n) {
    t.assert(typeof n.agentVersion === 'string',
             'Agent version should be present');
    t.assert(typeof n.debuggerVersion === 'string',
             'Debugger version should be present');
    t.assert(typeof n.appName === 'string', 'App name should be present');
    t.assert(n.pid > 0, 'Master pid should be present');
    t.assert(n.pst > 0, 'Master start time should be present');
    t.end();
  });
});

test('scaleUp', function(t) {
  var plan = 0;

  plan += 3;
  ee.once('fork', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.pid > 0, 'Worker pid should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
  });

  plan += 3;
  ee.once('listening', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.address !== undefined, 'Worker endpoint should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
  });

  plan += 5 * 2; // inspected twice
  ee.on('status:wd', function(n) {
    debug('on %j', n);
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.pid > 0, 'Worker PID should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
    t.assert(n.pwd.length > 0, 'pwd should be present');
    t.assert(n.cwd.length > 0, 'cwd should be present');
  });
  t.on('end', function() {
    ee.removeAllListeners('status:wd');
  });

  plan += 5;
  ee.once('status', function(n) {
    debug('on %j', n);
    t.assert(n.master.pid > 0, 'Master pid should be present');
    t.type(n.appName, 'string', 'App name should be present');
    t.type(n.agentVersion, 'string', 'Agent version is present');
    t.type(n.debuggerVersion, 'string', 'Debugger version is present');
    t.assert(Array.isArray(n.workers), 'workers list is present');
  });

  plan += 1;
  ctl.request({cmd: 'set-size', size: 2}, function(rsp) {
    t.false(rsp.error);
  });

  t.plan(plan);
});

test('scaleDown', function(t) {
  ee.once('exit', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.pid > 0, 'Worker pid should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
    t.assert(n.reason !== undefined, 'Worker exit reason should be present');
    t.end();
  });
  ctl.request({cmd: 'set-size', size: 1}, once(t, function(rsp) {
    t.false(rsp.err);
  }));
});

function hitCount(profile) {
  function visit(node) {
    var sum = 0;
    sum += node.hitCount | 0;
    sum += node.children.map(visit).reduce(function(a, b) { return a + b; }, 0);
    return sum;
  }

  var root = JSON.parse(profile);
  var count = visit(root.head);
  debug('count %d from:', count, util.inspect(root, {depth: null}));
  return count;
}

test('start cpu profiling', function(t) {
  t.plan(5);
  ee.once('cpu-profiling', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
    t.assert(!n.timeout, 'Watchdog timeout value must not be set');
  });

  ctl.request({cmd: 'start-cpu-profiling', target: 2}, once(t, function(rsp) {
    t.ifError(rsp.error);
  }));
});

test('let cpu profiler run', function(t) {
  // Run some code to give the CPU profiler something to see.
  t.plan(7);
  var i = setInterval(function() {
    t.pass('busy work for profile...');
  }, 1000);
  t.on('end', clearInterval.bind(null, i));
});

test('stop cpu profiling', function(t) {
  t.plan(5);
  ee.once('cpu-profiling', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
  });

  var req = {cmd: 'stop-cpu-profiling', target: 2};
  ctl.request(req, once(t, function(rsp) {
    t.ifError(rsp.error);
    debug('profile: %j', rsp.profile);
    t.assert(hitCount(rsp.profile) > 1);
  }));
});

test('start cpu profiling watchdog', skipUnlessWatchdog || function(t) {
  t.plan(5);
  ee.once('cpu-profiling', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
    t.assert(n.timeout === 1, 'Watchdog timeout value must be set');
  });

  var options = {cmd: 'start-cpu-profiling', target: 2, timeout: 1};
  ctl.request(options, once(t, function(rsp) {
    t.ifError(rsp.error);
  }));
});

test('let cpu profiler run', function(t) {
  // Run some code to give the CPU profiler something to see.
  t.plan(7);
  var i = setInterval(function() {
    t.pass('busy work for profile...');
  }, 1000);
  t.on('end', clearInterval.bind(null, i));
});

test('stop cpu profiling watchdog', skipUnlessWatchdog || function(t) {
  t.plan(5);
  ee.once('cpu-profiling', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
  });

  var req = {cmd: 'stop-cpu-profiling', target: 2};
  ctl.request(req, once(t, function(rsp) {
    t.ifError(rsp.error);
    t.assert(hitCount(rsp.profile) >= 1);
  }));
});

test('start object tracking', skipIfNoLicense, function(t) {
  t.plan(4);
  ee.once('object-tracking', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
  });

  ctl.request({
    cmd: 'start-tracking-objects',
    target: 2
  }, once(t, function(rsp) {
    t.ifError(rsp.error);
  }));
});

test('stop object tracking', skipIfNoLicense, function(t) {
  t.plan(4);
  ee.once('object-tracking', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
  });

  ctl.request({cmd: 'stop-tracking-objects', target: 2}, once(t, function(rsp) {
    t.ifError(rsp.error);
  }));
});

test('heap snapshot', function(t) {
  t.plan(4);
  ee.once('heap-snapshot', function(n) {
    t.assert(n.wid > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Dump should not be running');
  });

  var req = {cmd: 'heap-snapshot', target: 2};
  ctl.request(req, once(t, function(rsp) {
    t.ifError(rsp.error);
  }));
});

test('disconnect', function(t) {
  run.on('exit', function(status) {
    t.equal(status, 2, 'should exit with 2');
    t.end();
  });
  run.disconnect();
});
