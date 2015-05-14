'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('assert');
var watcher = require('../lib/watcher');
var watchers = Object.create(null);

exports = module.exports = select;
exports.Master = Master;
exports.ParentCtl = ParentCtl;
exports.Worker = Worker;
exports.select = select;
exports.watcher = watcher;

watcher._watchers.forEach(function(watcher) {
  watchers[watcher.name] = watcher;
});

function select(name) {
  watcher._watchers = [watchers[name]];
  return exports;
}

function ParentCtl(notify) {
  return {
    notify: notify
  };
}

function Worker(send) {
  global.cluster = {
    isWorker: true,
    isMaster: false,
    worker: {
      id: 9,
      send: split,
    },
    /* TBD */
  };
  function split(msg) {
    switch (msg.cmd) {
      case 'watcher:emit': send(msg.msg, 'emit'); break;
      case 'watcher:send': send(msg.msg, 'send'); break;
      default: break;
    }
  }

  return global.cluster;
}

// Cheat: use the same object for cluster mock and strong-cluster-control
// mock... mostly they have different APIs, though .on('fork') collides.

function Master() {
  var cluster = new EventEmitter;
  cluster.isWorker = false;
  cluster.isMaster = true;
  cluster.fork = fork;

  var id = 8;

  function fork(msg) {
    var worker = {
      id: ++id,
      startTime: Date.now(),
      on: on,
      process: {pid: 2010},
      _msg: msg,
      queueSend: queueSend,
      queueEmit: queueEmit,
    };
    setImmediate(function() {
      cluster.emit('fork', worker);
    });
    function on(event, listener) {
      assert.equal(event, 'message');
      if (worker._msg) {
        setImmediate(function() {
          listener(worker._msg);
        });
      }
    }
    function queueSend(msg) {
      return queue('send', msg);
    }
    function queueEmit(msg) {
      return queue('emit', msg);
    }

    function queue(type, msg) {
      worker._msg = {
        cmd: 'watcher:' + type,
        msg: msg,
      };
      return worker;
    }
    return worker;
  }

  return cluster;
}
