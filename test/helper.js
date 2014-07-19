// test globals
assert = require('assert');
debug = require('debug')('strong-supervisor:test');
fs = require('fs');
path = require('path');
shell = require('shelljs/global');
util = require('util');

// module locals
var child = require('child_process');

// Skip when run by mocha
exports.skip = function skip() {
  if ('describe' in global) {
    describe(module.parent.filename, function() {
      it.skip('run test with tap, not mocha', function(){});
    });
    return true;
  }
}

// Assert if test does not explicitly say it passed, guards against accidental
// exit with `0`.
exports.pass = false;

process.on('exit', function(status) {
  if (status === 0) {
    assert(exports.pass);
    console.log('PASS');
  }
});

// Utility functions

exports.runCtl = {
  supervise: supervise,
  waiton: waiton,
  expect: expect,
};

// run supervisor as master with zero workers
function supervise(app, args) {
  var run = require.resolve('../bin/slr');
  var ctl = path.join(app, '..', 'runctl');
  try {
    fs.unlinkSync(ctl);
  } catch(er) {
    console.log('no `%s` to cleanup: %s', ctl, er);
  }

  var c = child.fork(run, args || ['--cluster=0', '--no-profile', app]);

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

// Expect cmd to write specific output
function expect(cmd, output) {
  var out = runctl(cmd);

  assert.equal(out.code, 0);

  if (output) {
    assert(output.test(out.output), output);
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

function pause() {
  var start = process.hrtime();
  while (true) {
    var ts = process.hrtime(start);
    if (ts[0])
      return; // wait at least a second
  }
}

global.pause = pause;
