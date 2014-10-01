var helper = require('./helper');

if (helper.skip()) return;

var assert = require('assert');
var async = require('async');
var control = require('strong-control-channel/process');
var cp = require('child_process');
var debug = require('./debug');

var options = {stdio: [0, 1, 2, 'ipc']};
var run = require.resolve('../bin/sl-run');
var yes = require.resolve('./yes-app');
var args = [
  run,
  '--cluster=0',
  '--no-profile',
  yes
];
var run = cp.spawn(process.execPath, args, options);
var ctl = control.attach(function(){}, run);

async.series([
  status,
  setSize,
  disconnect,
], function(er) {
  assert.ifError(er);
  helper.pass = true;
  process.exit(0);
});

function status(done) {
  ctl.request({cmd: 'status'}, function(rsp) {
    debug('status: %j', rsp);

    assert.equal(rsp.workers.length, 0);
    return done();
  });
}

function setSize(done) {
  ctl.request({cmd: 'set-size', size: 1}, function(rsp) {
    debug('set-size: %j', rsp);

    return checkSize(done);
  });
}

function checkSize(done) {
  ctl.request({cmd: 'status'}, function(rsp) {
    debug('status: %j', rsp);

    assert.equal(rsp.workers.length, 1);
    return done();
  });
}

function disconnect(done) {
  run.disconnect();
  run.on('exit', function(status) {
    assert.equal(status, 2);
    return done();
  });
}
