var helper = require('./helper');

if (helper.skip()) return;

var rc = helper.runCtl;
var expect = rc.expect;
var failon = rc.failon;
var supervise = rc.supervise;
var waiton = rc.waiton;

var app = require.resolve('./module-app');

var run = supervise(app);

// supervisor should exit with 0 after we stop it
run.on('exit', function(code, signal) {
  assert.equal(code, 0);
});

cd(path.dirname(app));

waiton('', /worker count: 0/);

// Just test the patch command communication, particularly what happens when
// `--metrics` was not provided as an option to `slc run` (the actual behaviour
// of applied patches is tested in strong-agent).
fs.writeFileSync('_patch.json', '{"no-such-file-anywhere-i-hope":[]}');

/*
XXX(sam) Metrics can't be disabled ATM, not if you have a parent process, so
this will require a different way of spawning the child process to trigger.

failon('patch 0 _patch.json', /not configured to report metrics/);
*/

expect('stop');

helper.pass = true;
