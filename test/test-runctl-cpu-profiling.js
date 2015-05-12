var helper = require('./helper');
var tap = require('tap');

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var failon = rc.failon;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');

var run = supervise(APP);

tap.test('runctl cpu profiling', function(t) {
  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.doesNotThrow(function() {
    cd(path.dirname(APP));
  });

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  });
  t.doesNotThrow(function() {
    expect('set-size 1');
  });
  t.doesNotThrow(function() {
    waiton('status', /worker count: 1/);
  });
  t.doesNotThrow(function() {
    expect('status', /worker id 1:/);
  });

  t.doesNotThrow(function() {
    expect('cpu-start 0', /Profiler started/);
  });
  t.doesNotThrow(function() {
    expect('cpu-start 1', /Profiler started/);
  });
  t.doesNotThrow(function() {
    failon('cpu-start 6', /6 not found/);
  });

  t.doesNotThrow(function() {
    pause(2);
  });

  t.doesNotThrow(function() {
    expect('cpu-stop 0 file-name', /CPU profile.*file-name.cpuprofile/);
  });
  t.doesNotThrow(function() {
    expect('cpu-stop 1', /CPU profile.*node.1.cpuprofile/);
  });
  t.doesNotThrow(function() {
    failon('cpu-stop 6', /6 not found/);
  });

  t.doesNotThrow(function() {
    expect('stop');
  });
});
