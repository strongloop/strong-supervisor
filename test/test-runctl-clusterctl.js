var helper = require('./helper');
var os = require('os');
var tap = require('tap');

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');
var CPUS = os.cpus().length;

process.env.SL_RUN_SKIP_IPCCTL =
  'We have to disable ipcctl in master because its parent is a bunch of' +
  ' synchronous tests, which means the parent never reads from the IPC' +
  ' channel node has set up for us. And since it never drains the buffer' +
  ' it eventually fills up and process.send() becomes blocking. So now' +
  ' the supervisor cluster master is blocked which basically causes' +
  ' everything to go to hell. Now someone owes me a cider because I spent' +
  ' a whole afternoon trying to figure out why this test started hanging' +
  ' on the last command if I added more than 3 bytes to the status message.';

tap.test('runctl via clusterctl', function(t) {
  var run = supervise(APP);

  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0, 'supervisor exits with 0');
    t.end();
  });

  t.doesNotThrow(function() {
    cd(path.dirname(APP));
  }, 'cd');

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  }, 'status');

  t.doesNotThrow(function() {
    expect('set-size 1');
  }, 'set-size');

  t.doesNotThrow(function() {
    waiton('status', /worker count: 1/);
  }, 'status count 1');

  t.doesNotThrow(function() {
    expect('status', /worker id 1:/);
  }, 'status worker id 1');

  t.doesNotThrow(function() {
    expect('set-size 2');
  }, 'set-size 2');

  t.doesNotThrow(function() {
    waiton('status', /worker count: 2/);
  }, 'status count 2');

  t.doesNotThrow(function() {
    expect('status', /worker id 2:/);
  }, 'status worker id 1');

  t.doesNotThrow(function() {
    expect('restart');
  }, 'restart');

  t.doesNotThrow(function() {
    waiton('status', /worker id 4:/);
  }, 'status worker id 4');

  // cluster restart is start/kill, not kill/start, so we need
  // to wait for the cluster size to be 2 instead of assuming it is
  // 2 after we see worker 4, because that will happen before the
  // restart is completely finished
  t.doesNotThrow(function() {
    waiton('status', /worker count: 2/);
  }, 'status worker count 2');

  t.doesNotThrow(function() {
    expect('fork', /workerID: 5/);
  }, 'fork worker id 5');

  // XXX(sam) racy... whether we see the 3 or not is just a matter of
  // luck
  // t.doesNotThrow(function() {
  // waiton('status', /worker count: 3/);
  // }, 'status worker count 3');
  //

  // cluster control kills off the extra worker
  t.doesNotThrow(function() {
    waiton('status', /worker count: 2/);
  }, 'status worker count 2');

  t.doesNotThrow(function() {
    expect('disconnect');
  }, 'disconnect');

  t.doesNotThrow(function() {
    waiton('status', /worker count: 2/);
  }, 'status worker count 2');

  t.doesNotThrow(function() {
    expect('status', /worker id 6:/);
  }, 'status worker id 6');

  t.doesNotThrow(function() {
    expect('set-size 0');
  }, 'set-size 0');

  t.doesNotThrow(function() {
    waiton('status', RegExp('worker count: 0'));
  }, 'status count 0');

  t.doesNotThrow(function() {
    expect('set-size CPUs');
  }, 'set-size CPUs');

  t.doesNotThrow(function() {
    waiton('status', RegExp('worker count: ' + CPUS));
  }, 'status count CPUs');

  t.doesNotThrow(function() {
    expect('stop');
  }, 'stop');
});
