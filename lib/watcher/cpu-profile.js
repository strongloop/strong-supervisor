// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var agent = require('../agent')();
var debug = console.log; // Will be re-assigned during initialization

var stallout;
var stalls;

exports.stallout = function(_stallout) {
  debug('set stallout %j (was %j stalls %j)', _stallout, stallout, stalls);

  stallout = _stallout;
  stalls = 0;
};

exports.agent = agent;

exports.worker = function(handle) {
  debug = handle.debug;

  agent.on('watchdogActivationCount', function(count) {
    if (!stallout) return;
    if (!count) return; // It's 0 if no stalls have occurred.

    stalls += count;

    handle.debug('stallout %j stalls %j (new %j)', stallout, stalls, count);

    if (stalls < stallout)
      return;

    agent.metrics.stopCpuProfiling(function(profile) {
      if (profile.error) {
        console.error('stop cpu profiler on stalls %j failed: %s',
          stalls, profile.error);
      } else {
        handle.emit({
          cmd: 'cpu:profile-data',
          stalls: stalls,
          stallout: stallout,
          profile: profile,
          // stopTime: Date.now(), XXX could be useful, but doesn't have a user
        });
      }
      stallout = 0;
    });
  });
};

exports.master = function(handle) {
  exports.worker(handle); // Masters can be watchdogged.

  handle.on('cpu:profile-data', function(msg, worker) {
    msg.pst = worker.startTime;
    msg.wid = worker.id;
    msg.pid = worker.process.pid;
    handle.send(msg);

    handle.send({
      cmd: 'cpu-profiling',
      wid: worker.id,
      isRunning: false,
      pid: worker.process.pid,
      pst: worker.startTime,
    });
  });
};
