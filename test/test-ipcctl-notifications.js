var helper = require('./helper');

if (helper.skip()) return;

var assert = require('assert');
var async = require('async');
var control = require('strong-control-channel/process');
var cp = require('child_process');
var debug = require('./debug');
var ee = new (require('events').EventEmitter)();
var fs = require('fs');

var options = {stdio: [0, 1, 2, 'ipc']};
var run = require.resolve('../bin/sl-run');
var yes = require.resolve('./v1-app');
var args = [
  run,
  '--cluster=0',
  '--no-profile',
  yes
];
var run = cp.spawn(process.execPath, args, options);

function onRequest(req, cb) {
  debug(req);
  ee.emit(req.cmd, req);
  cb();
}

var ctl = control.attach(onRequest, run);

async.series([
  start,
  scaleUp,
  scaleDown,
  startCpuProfiling,
  stopCpuProfiling,
  startCpuProfilingWatchdog,
  stopCpuProfilingWatchdog,
  startObjTracking,
  stopObjTracking,
  heapDump,
  disconnect,
], function(er) {
  assert.ifError(er);
  helper.pass = true;
  process.exit(0);
});

function start(cb) {
  ee.once('started', function(n) {
    assert(typeof n.agentVersion === 'string', 'Agent version should be present');
    assert(n.pid > 0, 'Master pid should be present');
    cb();
  });
}

function scaleUp(cb) {
  ctl.request({cmd: 'set-size', size: 2}, function(rsp) {
    var forked = false;
    var listening = false;

    ee.once('fork', function(n) {
      forked = true;
      assert(n.id > 0, 'Worker ID should be present');
      assert(n.pid > 0, 'Worker pid should be present');
      if (forked && listening) cb();
    });

    ee.once('listening', function(n) {
      assert(n.id > 0, 'Worker ID should be present');
      assert(n.address !== undefined, 'Worker endpoint should be present');
      listening = true;
      if (forked && listening) cb();
    });
  });
}

function scaleDown(cb) {
  ctl.request({cmd: 'set-size', size: 1}, function(rsp) {
    ee.once('exit', function(n) {
      assert(n.id > 0, 'Worker ID should be present');
      assert(n.pid > 0, 'Worker pid should be present');
      assert(n.reason !== undefined, 'Worker exit reason should be present');
      cb();
    });
  });
}

function hitCount(filename) {
  function visit(node) {
    var sum = 0;
    sum += node.hitCount | 0;
    sum += node.children.map(visit).reduce(function(a, b) { return a + b }, 0);
    return sum;
  }

  var data = fs.readFileSync(__dirname + '/v1-app/' + filename, 'utf8');
  var root = JSON.parse(data);
  var count = visit(root.head);
  debug('count %d from:', count, util.inspect(root, {depth: null}));
  return count;
}

function startCpuProfiling(cb) {
  ee.once('cpu-profiling', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === true, 'Profiling should be running');
    assert(!n.timeout, 'Watchdog timeout value must not be set');
    setTimeout(cb, 25);
  });

  ctl.request({cmd: 'start-cpu-profiling', target: 1}, function(rsp) {
    assert(!rsp.error);
  });
}

function stopCpuProfiling(cb) {
  ee.once('cpu-profiling', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === false, 'Profiling should not be running');
    cb();
  });

  var req = {cmd: 'stop-cpu-profiling', target: 1, filePath: 'test.cpuprofile'};
  ctl.request(req, function(rsp) {
    assert(!rsp.error);
    assert(hitCount(rsp.filePath) > 1);
  });
}

function startCpuProfilingWatchdog(cb) {
  if (process.platform !== 'linux') {
    return cb();
  }

  ee.once('cpu-profiling', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === true, 'Profiling should be running');
    assert(n.timeout === 1000, 'Watchdog timeout value must be set');
    setTimeout(cb, 25);
  });

  var options = {cmd: 'start-cpu-profiling', target: 1, timeout: 1000};
  ctl.request(options, function(rsp) {
    assert(!rsp.error);
  });
}

function stopCpuProfilingWatchdog(cb) {
  if (process.platform !== 'linux') {
    return cb();
  }

  ee.once('cpu-profiling', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === false, 'Profiling should not be running');
    cb();
  });

  var req = {cmd: 'stop-cpu-profiling', target: 1, filePath: 'test.cpuprofile'};
  ctl.request(req, function(rsp) {
    assert(!rsp.error);
    assert(hitCount(rsp.filePath) >= 1);
  });
}

function startObjTracking(cb) {
  ee.once('object-tracking', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === true, 'Profiling should be running');
    cb();
  });

  ctl.request({cmd: 'start-tracking-objects', target: 1}, function(rsp) {
    assert(!rsp.error);
  });
}

function stopObjTracking(cb) {
  ee.once('object-tracking', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === false, 'Profiling should not be running');
    cb();
  });

  ctl.request({cmd: 'stop-tracking-objects', target: 1}, function(rsp) {
    assert(!rsp.error);
  });
}

function heapDump(cb) {
  ee.once('heap-snapshot', function(n) {
    assert(n.id > 0, 'Worker ID should be present');
    assert(n.isRunning === false, 'Dump should not be running');
    cb();
  });

  var req = {cmd: 'heap-snapshot', target: 1, filePath: 'test.heapsnapshot'};
  ctl.request(req, function(rsp) {
    assert(!rsp.error);
  });
}

function disconnect(done) {
  run.disconnect();
  run.on('exit', function(status) {
    assert.equal(status, 2);
    return done();
  });
}
