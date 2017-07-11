// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0


/**
 * Provides CPU, memory and gc under a set of events using the "appmetrics:"
 * prefix.
 * Primarily used by the WebSphere Liberty Profile for Node.js, but
 * can be used by any other module.
 */
'use strict';

exports.worker = function(handle) {
  if (!global.APPMETRICS_MONITOR) {
    handle.debug('legacy appmetrics watcher disabled');
    return;
  }

  var monitoring = global.APPMETRICS_MONITOR;

  monitoring.on('cpu', function(data) {
    handle.debug('appmetrics event - cpu: %j', data);
    handle.send({
      cmd: 'appmetrics:cpu',
      data: data
    });
  });

  monitoring.on('memory', function(data) {
    handle.debug('appmetrics event - memory: %j', data);
    handle.send({
      cmd: 'appmetrics:memory',
      data: data
    });
  });

  monitoring.on('gc', function(data) {
    handle.debug('appmetrics event - gc: %j', data);
    handle.send({
      cmd: 'appmetrics:gc',
      data: data
    });
  });
};

exports.master = function(handle) {
  handle.on('appmetrics:cpu', addMasterData);
  handle.on('appmetrics:memory', addMasterData);
  handle.on('appmetrics:gc', addMasterData);

  function addMasterData(msg, worker) {
    // Mix-in the worker identity: startTime is known only in the master, and
    // worker.id is just convenient to do here.
    msg.pst = worker.startTime;
    msg.wid = worker.id;
    handle.send(msg);
  }
};
