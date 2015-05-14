'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('assert');
var debug = require('./debug')('watcher');
var fs = require('fs');
var path = require('path');

var from = path.resolve(__dirname, 'watcher');
var files = fs.readdirSync(from);

debug('watchers:', files);

exports._watchers = files.map(function(f) {
  var watcher = require(path.resolve(from, f));
  watcher.name = f.replace('.js', '');
  return watcher;
});

exports.start = function(parentCtl, cluster, clusterControl, config) {
  var bus;

  // parentCtl is optional
  // cluster and strong-cluster-control are injected to allow mocking
  assert(cluster);
  assert(clusterControl);

  if (cluster.isMaster) {
    bus = new EventEmitter;

    clusterControl.on('fork', function(worker) {
      worker.on('message', function(msg) {
        var cmd = msg.cmd;
        msg = msg.msg;

        switch (cmd) {
          case 'watcher:emit':
            debug('emit %j: %s', msg.cmd, debug.json(msg));
            bus.emit(msg.cmd, msg, worker);
            break;
          case 'watcher:send':
            debug('notify %j: %s', msg.cmd, debug.json(msg));
            parentCtl.notify(msg);
            break;
          default:
            break;
        }
      });
    });
  }

  this._watchers.forEach(function(watcher) {
    var where = cluster.isWorker ? ':worker:' : ':master:';

    var debug = require('./debug')('watcher' + where + watcher.name);

    if (cluster.isWorker) {
      debug('init');
      watcher.worker({
        config: config,
        debug: debug,
        emit: function emit(msg) {
          debug('emit %s', debug.json(msg));
          cluster.worker.send({
            cmd: 'watcher:emit',
            msg: msg,
          });
        },
        send: function send(msg) {
          debug('send %s', debug.json(msg));
          cluster.worker.send({
            cmd: 'watcher:send',
            msg: msg,
          });
        },
      });
      return;
    }

    if (!parentCtl) {
      debug('no parentctl');
      return;
    }

    assert(cluster.isMaster);

    debug('init: master?', !!watcher.master);
    if (watcher.master) {
      watcher.master({
        config: config,
        debug: debug,
        emit: function emit(msg) {
          // This is master, so fake a Worker object.
          var worker = {
            id: 0,
            startTime: clusterControl.startTime,
            process: process,
          };
          debug('emit %j: %s', msg.cmd, debug.json(msg));
          bus.emit(msg.cmd, msg, worker);
        },
        on: function on(event, listener) {
          debug('listen on %j', event);
          bus.on(event, listener);
        },
        send: function notify(msg) {
          debug('notify %s', debug.json(msg));
          parentCtl.notify(msg);
        },
      });
    }

  });
};
