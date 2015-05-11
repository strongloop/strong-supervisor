var helper = require('./helper');
var tap = require('tap');

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var failon = rc.failon;
var waiton = rc.waiton;

var APP = require.resolve('./module-app');

// Cause metrics to be emitted 30 times faster, so we don't have to
// wait minutes for object metrics.
process.env.STRONGAGENT_INTERVAL_MULTIPLIER = 30;

var run;
var statsd;

tap.test('start statsd', skipIfNoLicense || function(t) {
  helper.statsd(function(_statsd) {
    t.ok(_statsd, 'started');
    statsd = _statsd;
    t.end();
  });
});

tap.test('start app', skipIfNoLicense || function(t) {
  var url = util.format('statsd://:%d', statsd.port);
  run = supervise(APP, ['--metrics', url]);
  t.pass('app started');
  t.end();
});

tap.test('runctl commands', skipIfNoLicense || function(t) {
  cd(path.dirname(APP));

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
    failon('objects-start', /missing argument/);
  });
  t.doesNotThrow(function() {
    failon('objects-stop', /missing argument/);
  });

  t.doesNotThrow(function() {
    expect('objects-start 0');
  });
  t.doesNotThrow(function() {
    expect('objects-start 1');
  });
  t.doesNotThrow(function() {
    failon('objects-start 6', /6 not found/);
  });

  t.end();
});

tap.test('stop statsd', skipIfNoLicense || function(t) {
  statsd.waitfor(/object.*count:/, function() {
    statsd.close();
    t.pass('stopped');
    t.end();
  });
});

tap.test('runctl commands', skipIfNoLicense || function(t) {
  t.doesNotThrow(function() {
    expect('objects-stop 0');
  });
  t.doesNotThrow(function() {
    expect('objects-stop 1');
  });
  t.doesNotThrow(function() {
    failon('objects-stop 6', /6 not found/);
  });
  t.doesNotThrow(function() {
    expect('stop');
  });
  t.end();
});
