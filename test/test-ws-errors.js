'use strict';

var Central = require('strong-control-channel/test/mock-server');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('strong-supervisor:test');
var fork = require('child_process').fork;
var run = require.resolve('../bin/sl-run.js');
var tap = require('tap');

// Get rid of licenses to avoid metrics noise
process.env.HOME = '/no/home/dir';
process.env.STRONGLOOP_LICENSE = '';

var appPath = require.resolve('./module-app');
var central;
var control;
var supervisor;
var channel;

var monitor = new EventEmitter();

tap.test('create central', function(t) {
  central = new Central('test-control', onRequest, onListening);

  function onListening(wsURL) {
    control = wsURL;
    t.assert(control, 'central is listening at ' + control);
    t.end();
  }
  function onRequest(req, callback) {
    callback({});
    monitor.emit('request', req);
  }
});

tap.test('start supervisor', function(t) {
  supervisor = fork(run, [
    '--control', control,
    '--no-profile',
    '--cluster=0',
    appPath
  ]);

  central.client.on('new-channel', function(ch) {
    channel = ch;
  });

  t.plan(3);

  // first unsolicited messages should be 'started', and 'status'
  monitor.once('request', function(req) {
    debug('once started: %j', req);
    t.match(req, {cmd: 'started', wid: 0}, 'supervisor started');
    t.assert(channel, 'we should have gotten the channel');

    monitor.once('request', function(req) {
      debug('once status: %j', req);
      t.match(req, {master: {pid: supervisor.pid}}, 'supervisor status');
    });
  });
});

tap.test('supervisor errors on channel close', function(t) {
  central.channel.close();

  supervisor.once('exit', function(code) {
    t.notEqual(code, 0, 'supervisor exited');
    t.end();
  });

  t.on('end', function() {
    // Stop the listener
    central.stop();
  });
});
