'use strict';

var Central = require('strong-control-channel/test/mock-server');
var EventEmitter = require('events').EventEmitter;
var fork = require('child_process').fork;
var run = require.resolve('../bin/sl-run.js');
var tap = require('tap');

// Get rid of licenses to avoid metrics noise
process.env.HOME = '/no/home/dir';
process.env.STRONGLOOP_LICENSE = '';

var NULL_WS_PKT = new Buffer([0, 0, 0, 0]);
var appPath = require.resolve('./module-app');
var central;
var control;
var supervisor;
var clients = [];

var monitor = new EventEmitter();

tap.test('create central', function(t) {
  central = new Central('test-control', onRequest, onListening);
  central.channel.on('connection', addClient);
  function onListening(wsURL) {
    control = wsURL;
    t.assert(control, 'central is listening at ' + control);
    t.end();
  }
  function onRequest(req, callback) {
    callback({});
    monitor.emit('request', req);
  }
  function addClient(ws) {
    if (clients.indexOf(ws) === -1) {
      t.comment('new connection from %d', ws._socket.remotePort);
      clients.push(ws);
    }
  }
});

tap.test('create supervisor', function(t) {
  supervisor = fork(run, [
    '--control', control,
    '--no-profile',
    '--cluster=0',
    appPath
  ]);
  t.assert(supervisor, 'supervisor forked');
  // first message should be a 'started' message
  monitor.once('request', function(req) {
    t.match(req, {cmd: 'started', wid: 0}, 'supervisor started');
    t.end();
  });
});

tap.test('sabotage first websocket', function(t) {
  t.equal(clients.length, 1, 'should be only one client so far');
  lightOnFire(clients[clients.length - 1]);
  central.channel.once('connection', function(ws) {
    t.assert(ws, 'supervisor reconnects');
    t.end();
  });
});

tap.test('ask the supervisor for its status', function(t) {
  central.request({cmd: 'status'}, function(status) {
    t.match(status, {master: {pid: supervisor.pid}});
    t.end();
  });
});

tap.test('sabotage second websocket', function(t) {
  t.equal(clients.length, 2, 'should be 2 connections');
  lightOnFire(clients[clients.length - 1]);
  central.channel.once('connection', function(ws) {
    t.assert(ws, 'supervisor reconnects');
    t.end();
  });
});

// The intention here is to catch any errors that might occur if the client or
// server aren't able to use the socket before it is killed. This serves as a
// regression test for the client or server side getting confused if it doesn't
// send any messages to piggyback ACK's on.

tap.test('sabotage third websocket without using the second', function(t) {
  t.equal(clients.length, 3, 'should be 3 connections');
  lightOnFire(clients[clients.length - 1]);
  central.channel.once('connection', function(ws) {
    t.assert(ws, 'supervisor reconnects');
    t.end();
  });
});

tap.test('ask the supervisor for its status', function(t) {
  central.request({cmd: 'status'}, function(status) {
    t.match(status, {master: {pid: supervisor.pid}});
    t.end();
  });
});

tap.test('shutdown supervisor via central', function(t) {
  central.request({cmd: 'stop'}, function(rsp) {
    t.ok(rsp, 'stop command acknowledged');
  });
  supervisor.once('exit', function(code, signal) {
    t.ok(!signal && !code, 'supervisor exitted');
    t.end();
  });
});

tap.test('shutdown central', function(t) {
  central.stop(function() {
    t.pass('central shut down');
    t.end();
  });
});

tap.test('count the bodies', function(t) {
  t.equal(clients.length, 4, 'should be 4 different connection attempts');
  t.end();
});

function lightOnFire(socket) {
  // throw a bad WS frame directly onto the socket to confuse the protocol's
  // state machine.... then set it on fire.
  if (socket._socket) {
    socket._socket.end(NULL_WS_PKT);
  }
  socket.terminate();
}
