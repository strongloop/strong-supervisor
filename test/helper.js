// test globals
assert = require('assert');
debug = require('./debug');
fs = require('fs');
path = require('path');
shell = require('shelljs/global');
util = require('util');

// module locals
var child = require('child_process');
var dgram = require('dgram');

// Skip when run by mocha
exports.skip = function skip() {
  if ('describe' in global) {
    describe(module.parent.filename, function() {
      it.skip('run test with tap, not mocha', function(){});
    });
    return true;
  }
}

// if helper is being run directly by mocha, skip it.
if (exports.skip()) return;

// Assert if test does not explicitly say it passed, guards against accidental
// exit with `0`.
exports.pass = false;

process.on('exit', function(status) {
  console.log('EXIT:', status);
  if (status === 0) {
    assert(exports.pass);
    console.log('PASS');
  }
});

// Utility functions

exports.statsd = function statsd(callback) {
  var server = dgram.createSocket('udp4');
  server.reported = [];

  server.on('message', function(data) {
    console.log('statsd receives metric: %s', data);
    server.reported.push(data.toString());
  });

  server.bind(listening);

  server.waitfor = function(regex, callback) {
    waitForStats();

    function waitForStats() {
      function found(stat) {
        return regex.test(stat);
      }

      if (server.reported.some(found)) {
        return callback();
      }

      setTimeout(waitForStats, 2000);
    }
  };

  function listening(er) {
    console.log('statsd listening:', er || server.address());
    assert.ifError(er);
    server.port = server.address().port;
    return callback(server);
  }
}

exports.runCtl = {
  supervise: supervise,
  waiton: waiton,
  expect: expect,
  failon: failon,
};

// run supervisor
function supervise(app, args) {
  var run = require.resolve('../bin/sl-run');
  var ctl = path.join(app, '..', 'runctl');
  try {
    fs.unlinkSync(ctl);
  } catch(er) {
    console.log('no `%s` to cleanup: %s', ctl, er);
  }

  args = ['--cluster=0'].concat(args || []).concat([app]);

  console.log('supervise %s with %j', run, args);

  var c = child.fork(run, args);

  // don't let it live longer than us!
  // XXX(sam) once sl-runctl et. al. self-exit on loss of parent, we
  // won't need this, but until then...
  process.on('exit', c.kill.bind(c));
  function die() {
    c.kill();
    process.kill(process.pid, 'SIGTERM');
  }
  process.once('SIGTERM', die);
  process.once('SIGINT', die);

  return c;
}

// Wait on cmd to write specific output
function waiton(cmd, output) {
  while (true) {
    try {
      expect(cmd, output);
      return;
    } catch(er) {
      pause();
    }
  }
}

// Expect cmd to succeed and write specific output
function expect(cmd, output) {
  var out = runctl(cmd);

  assert.equal(out.code, 0);

  if (output) {
    assert(output.test(out.output), output);
  }
}

// Expect cmd to fail and write specific output
function failon(cmd, output) {
  var out = runctl(cmd);

  assert.notEqual(out.code, 0);

  if (output) {
    assert(output.test(out.output), out.output);
  }
}

function runctl(cmd) {
  var out = exec(util.format(
    '%s %s',
    require.resolve('../bin/sl-runctl'),
    cmd || ''
  ));
  console.log('runctl %s =>', cmd, out);
  return out;
}

function pause(secs) {
  var secs = secs || 1;
  var start = process.hrtime();
  while (true) {
    var ts = process.hrtime(start);
    if (ts[0] >= secs)
      return;
  }
}

global.pause = pause;
