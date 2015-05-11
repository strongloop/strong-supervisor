var helper = require('./helper');
var tap = require('tap');

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var waiton = rc.waiton;

var app = require.resolve('./module-app');

var run = supervise(app);

tap.test('runctl ls', function(t) {
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
  t.doesNotThrow(function() {
    expect('ls', /module-app@0.0.0/);
  });
  t.doesNotThrow(function() {
    expect('ls 1', /module-app@0.0.0/);
  });
  t.doesNotThrow(function() {
    expect('stop');
  });
});
