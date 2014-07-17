if ('describe' in global) {
  describe('runctl cli', function() {
    it.skip('must be tested with tap, not with mocha', function(){});
  });
  return;
}

var assert = require('assert');
var child = require('child_process');
var debug = require('debug')('strong-supervisor:test');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs/global');
var util = require('util');

var ok;

process.on('exit', function(status) {
  if (status === 0) {
    assert(ok);
    console.log('PASS');
  }
});

var RUN = require.resolve('../bin/slr');
var APP = require.resolve('./module-app');

// run supervisor as master with zero workers

var run = supervise(require.resolve('./module-app'));

run.on('exit', function(code, signal) {
  assert.equal(code, 0);
});

cd(path.dirname(APP));

/*
    status                 report status of cluster workers, the default command
    set-size               set-size N, set cluster size to N workers
    stop                   stop, shutdown all workers and stop controller
    restart                restart, restart all workers
    disconnect             disconnect all workers
    fork                   fork one worker

    -h, --help               output usage information
    -V, --version            output the version number
    -p,--path,--port <path>  name of control socket, defaults to runctl
*/

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

ok = true;

// Utility functions

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

function pause() {
  var start = process.hrtime();
  while (true) {
    var ts = process.hrtime(start);
    if (ts[0])
      return; // wait at least a second
  }
}

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
