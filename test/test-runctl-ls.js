var helper = require('./helper');

if (helper.skip()) return;

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var waiton = rc.waiton;

var app = require.resolve('./module-app');

var run = supervise(app);

// supervisor should exit with 0 after we stop it
run.on('exit', function(code, signal) {
  assert.equal(code, 0);
});

cd(path.dirname(app));

waiton('', /worker count: 0/);
expect('ls', /module-app@0.0.0/);
expect('ls 1', /module-app@0.0.0/);
expect('stop');

helper.pass = true;
