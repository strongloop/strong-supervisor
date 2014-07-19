var helper = require('./helper');

if (helper.skip()) return;

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
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
expect('set-size 2');
waiton('status', /worker count: 2/);
expect('status', /worker id 2:/);
expect('restart');
waiton('status', /worker id 4:/);
expect('status', /worker count: 2/);
expect('disconnect');
waiton('status', /worker id 6:/);
expect('status', /worker count: 2/);
expect('stop');

helper.pass = true;
