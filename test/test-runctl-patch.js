var helper = require('./helper');
var tap = require('tap');

var rc = helper.runCtl;
var expect = rc.expect;
var failon = rc.failon;
var supervise = rc.supervise;
var waiton = rc.waiton;

var app = require.resolve('./module-app');

var run = supervise(app);

tap.test('runctl patch', function(t) {
  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.doesNotThrow(function() {
    cd(path.dirname(app));
  });

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  });

// Just test the patch command communication, particularly what happens when
// `--metrics` was not provided as an option to `slc run` (the actual behaviour
// of applied patches is tested in strong-agent).
  t.doesNotThrow(function() {
    fs.writeFileSync('_patch.json', '{"no-such-file-anywhere-i-hope":[]}');
  });

/*
XXX(sam) Metrics can't be disabled ATM, not if you have a parent process, so
this will require a different way of spawning the child process to trigger.

failon('patch 0 _patch.json', /not configured to report metrics/);
*/

  t.doesNotThrow(function() {
    expect('stop');
  });
});
