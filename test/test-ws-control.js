'use strict';

var Central = require('strong-control-channel/test/mock-server');
var debug = require('./debug');
var fork = require('child_process').fork;
var run = require.resolve('../bin/sl-run.js');
var tap = require('tap');

// Get rid of licenses to avoid metrics noise
process.env.HOME = '/no/home/dir';
process.env.STRONGLOOP_LICENSE = '';

var appPath = require.resolve('./module-app');

test('with --control', function(control) {
  var child = fork(run, [
    '--control', control,
    '--no-profile',
    '--cluster=0',
    appPath
  ]);
  return child;
});

test('with env', function(control) {
  var child = fork(run, [
    '--no-profile',
    '--cluster=0',
    appPath
  ], {
    env: {
      STRONGLOOP_CONTROL: control,
    },
  });
  return child;
});

function test(name, fork) {
  tap.test(name, function(t) {
    var central = new Central('test-control', onRequest, onListening);
    t.on('end', central.stop.bind(central));

    function onListening(control) {
      var child = fork(control);

      child.on('exit', function(code, signal) {
        debug('run exit: %j', signal || code);
        t.equal(code, 0);
        t.end();
      });
    }

    function onRequest(req, callback) {
      debug('onRequest: %j', req);
      callback({});

      central.request({cmd: 'stop'}, function(rsp) {
        debug('stop => %j', rsp);
      });
    }
  });
}
