// test sl-runctl heap dump
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

expect('heap-snapshot 0', /node\.0.*\.heapsnapshot/);
expect('heap-snapshot 1', /node\.1.*\.heapsnapshot/);
var name = 'foo-' + Date.now();
expect('heap-snapshot 1 ' + name, /foo.*\.heapsnapshot/);
failon('heap-snapshot 1 /does/not/exist', /ENOENT/);
expect('stop');

helper.pass = true;
