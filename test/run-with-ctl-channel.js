// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var fs = require('fs');
var path = require('path');
var util = require('util');

var child = require('child_process');
var control = require('strong-control-channel/process');

module.exports = function(appWithArgs, runArgs, onMessage) {
  if (onMessage === undefined && typeof runArgs === 'function') {
    onMessage = runArgs;
    runArgs = [];
  }

  var ctl = path.resolve(path.dirname(appWithArgs[0]), 'runctl');
  try {
    fs.unlinkSync(ctl);
  } catch (er) {
    console.log('# no `%s` to cleanup: %s', ctl, er);
  }

  var options = {
    stdio: [0, 1, 2, 'ipc'],
    env: util._extend({
      STRONGLOOP_BASE_INTERVAL: 500,
      STRONGLOOP_FLUSH_INTERVAL: 2,
    }, process.env),
  };

  var runner = require.resolve('../bin/sl-run');

  var args = [
    runner,
    '--no-timestamp-workers',
    '--no-timestamp-supervisor'
  ].concat(runArgs).concat(appWithArgs);

  debug('spawn: args=%j', args);

  var c = child.spawn(process.execPath, args, options);
  c.control = control.attach(onMessage, c);
  c.unref();
  c._channel.unref(); // There is no documented way to unref child IPC
  return c;
};
