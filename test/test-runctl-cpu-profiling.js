// test sl-runctl start/stop cpu profiling
//
// Profiling is not supported on node < v0.11, so this test checks it works,
// or does not work, as would be expected with the current node version.
var helper = require('./helper');
var supported = require('semver').gt(process.version, '0.11.0');

if (helper.skip()) return;

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var failon = rc.failon;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');

var run = supervise(APP);

// supervisor should exit with 0 after we stop it
run.on('exit', function(code, signal) {
  assert.equal(code, 0);
});


cd(path.dirname(APP));

waiton('', /worker count: 0/);
expect('set-size 1');
waiton('status', /worker count: 1/);
expect('status', /worker id 1:/);

if (supported) {
  expect('cpu-start 0', /Profiler started/);
  expect('cpu-start 1', /Profiler started/);
} else {
  failon('cpu-start 0', /CPU profiler unavailable/);
  failon('cpu-start 1', /CPU profiler unavailable/);
}
failon('cpu-start 6', /6 not found/);

pause(2);

if (supported) {
  expect('cpu-stop 0 file-name', /CPU profile.*file-name.cpuprofile/);
  expect('cpu-stop 1', /CPU profile.*node.1.cpuprofile/);
} else {
  failon('cpu-stop 0 file-name', /CPU profiler unavailable/);
  failon('cpu-stop 1', /CPU profiler unavailable/);
}
failon('cpu-stop 6', /6 not found/);

expect('stop');

helper.pass = true;
