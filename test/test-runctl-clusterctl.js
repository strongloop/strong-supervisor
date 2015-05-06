var helper = require('./helper');

if (helper.skip()) return;

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');

process.env.SL_RUN_SKIP_IPCCTL =
  'We have to disable ipcctl in master because its parent is a bunch of' +
  ' synchronous tests, which means the parent never reads from the IPC' +
  ' channel node has set up for us. And since it never drains the buffer' +
  ' it eventually fills up and process.send() becomes blocking. So now' +
  ' the supervisor cluster master is blocked which basically causes' +
  ' everything to go to hell. Now someone owes me a cider because I spent' +
  ' a whole afternoon trying to figure out why this test started hanging' +
  ' on the last command if I added more than 3 bytes to the status message.';

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
expect('fork', /workerID: 5/);
waiton('status', /worker count: 3/);
// cluster control kills off the extra worker
waiton('status', /worker count: 2/);
expect('disconnect');
waiton('status', /worker id 6:/);
expect('status', /worker count: 2/);
expect('stop');

helper.pass = true;
