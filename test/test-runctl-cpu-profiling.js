// test sl-runctl start/stop cpu profiling
var helper = require('./helper');

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

expect('cpu-start 0', /Profiler started/);
expect('cpu-start 1', /Profiler started/);
failon('cpu-start 6', /6 not found/);

pause(2);

expect('cpu-stop 0 file-name', /CPU profile.*file-name.cpuprofile/);
expect('cpu-stop 1', /CPU profile.*node.1.cpuprofile/);
failon('cpu-stop 6', /6 not found/);

expect('stop');

helper.pass = true;
