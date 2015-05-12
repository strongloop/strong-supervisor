var helper = require('./helper');
var tap = require('tap');

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var failon = rc.failon;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');
var name = 'foo-' + Date.now();

var run = supervise(APP);

tap.test('runctl heap snapshot', function(t) {
  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.doesNotThrow(function() {
    cd(path.dirname(APP));
  });

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  });
  t.doesNotThrow(function() {
    expect('set-size 1');
  });
  t.doesNotThrow(function() {
    waiton('status', /worker count: 1/);
  });
  t.doesNotThrow(function() {
    expect('status', /worker id 1:/);
  });

  t.doesNotThrow(function() {
    expect('heap-snapshot 0', /node\.0.*\.heapsnapshot/);
  });
  t.doesNotThrow(function() {
    expect('heap-snapshot 1', /node\.1.*\.heapsnapshot/);
  });

  t.doesNotThrow(function() {
    expect('heap-snapshot 1 ' + name, /foo.*\.heapsnapshot/);
  });
  t.doesNotThrow(function() {
    failon('heap-snapshot 1 /does/not/exist', /ENOENT/);
  });
  t.doesNotThrow(function() {
    expect('stop');
  });
});
