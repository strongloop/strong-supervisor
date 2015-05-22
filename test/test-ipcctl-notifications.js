var assert = require('assert');
var async = require('async');
var control = require('strong-control-channel/process');
var cp = require('child_process');
var debug = require('./debug');
var ee = new (require('events').EventEmitter)();
var fs = require('fs');
var helper = require('./helper');
var test = require('tap').test;

var skipIfNotLinux = process.platform !== 'linux'
                   ? {skip: 'linux only feature'}
                   : false;
var options = {stdio: [0, 1, 2, 'ipc']};
var run = require.resolve('../bin/sl-run');
var yes = require.resolve('./v1-app');
var args = [
  run,
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
  function wrapped() {
    console.error('called');
    t.assert(!wrapped.called);
    wrapped.called = true;
    return fn.apply(this, arguments);
  }
}

test('start', function(t) {
  ee.once('started', function(n) {
    t.assert(typeof n.agentVersion === 'string', 'Agent version should be present');
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
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.pid > 0, 'Worker pid should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
  });

  plan += 3;
  ee.once('listening', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.address !== undefined, 'Worker endpoint should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
  });

  plan += 5*2; // inspected twice
  ee.on('status:wd', function(n) {
    debug('on %j', n);
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.pid > 0, 'Worker PID should be present');
    t.assert(n.pst > 0, 'Worker start time should be present');
    t.assert(n.pwd.length > 0, 'pwd should be present');
    t.assert(n.cwd.length > 0, 'cwd should be present');
  });
  t.on('end', function() {
    ee.removeAllListeners('status:wd');
  });

  plan += 4;
  ee.once('status', function(n) {
    debug('on %j', n);
    t.assert(n.master.pid > 0, 'Master pid should be present');
    t.assert(typeof n.appName === 'string', 'App name should be present');
    t.assert(typeof n.agentVersion === 'string', 'Agent version is present');
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
    t.assert(n.id > 0, 'Worker ID should be present');
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
    sum += node.children.map(visit).reduce(function(a, b) { return a + b }, 0);
    return sum;
  }

  var root = JSON.parse(profile);
  var count = visit(root.head);
  debug('count %d from:', count, util.inspect(root, {depth: null}));
  return count;
}

test('start cpu profiling', function(t) {
  ee.once('cpu-profiling', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
    t.assert(!n.timeout, 'Watchdog timeout value must not be set');
    t.end();
  });

  ctl.request({cmd: 'start-cpu-profiling', target: 1}, once(t, function(rsp) {
    t.assert(!rsp.error);
  }));
});

test('stop cpu profling', function(t) {
  ee.once('cpu-profiling', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
    t.end();
  });

  var req = {cmd: 'stop-cpu-profiling', target: 1};
  ctl.request(req, once(t, function(rsp) {
    t.assert(!rsp.error);
    t.assert(hitCount(rsp.profile) > 1);
  }));
});

test('start cpu profiling watchdog', skipIfNotLinux || function(t) {
  ee.once('cpu-profiling', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
    t.assert(n.timeout === 1000, 'Watchdog timeout value must be set');
    t.end();
  });

  var options = {cmd: 'start-cpu-profiling', target: 1, timeout: 1000};
  ctl.request(options, once(t, function(rsp) {
    t.assert(!rsp.error);
  }));
});

test('stop cpu profiling watchdog', skipIfNotLinux || function(t) {
  ee.once('cpu-profiling', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
    t.end();
  });

  var req = {cmd: 'stop-cpu-profiling', target: 1};
  ctl.request(req, once(t, function(rsp) {
    t.assert(!rsp.error);
    t.assert(hitCount(rsp.profile) >= 1);
  }));
});

test('start object tracking', function(t) {
  ee.once('object-tracking', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === true, 'Profiling should be running');
    t.end();
  });

  ctl.request({cmd: 'start-tracking-objects', target: 1}, once(t, function(rsp) {
    t.assert(!rsp.error);
  }));
});

test('stop object tracking', function(t) {
  ee.once('object-tracking', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Profiling should not be running');
    t.end();
  });

  ctl.request({cmd: 'stop-tracking-objects', target: 1}, once(t, function(rsp) {
    t.assert(!rsp.error);
  }));
});

test('heap snapshot', function(t) {
  ee.once('heap-snapshot', function(n) {
    t.assert(n.id > 0, 'Worker ID should be present');
    t.assert(n.isRunning === false, 'Dump should not be running');
    t.end();
  });

  var req = {cmd: 'heap-snapshot', target: 1};
  ctl.request(req, once(t, function(rsp) {
    t.assert(!rsp.error);
  }));
});

test('disconnect', function(t) {
  helper.pass = true;
  run.on('exit', function(status) {
    t.equal(status, 2);
    t.end();
  });
  run.disconnect();
});
