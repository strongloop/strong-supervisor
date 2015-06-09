'use strict';

var tracer = require('../tracer');

exports.worker = function(handle) {
  setImmediate(function() {
    var wd = {
      cmd: 'status:wd',
      pwd: process.env.PWD,
      cwd: process.cwd(),
      pid: process.pid,
      isTracing: !!tracer(),
    };

    // Use agent to get the actual app name being run in this worker
    var config = configure(null, null, {}, process.env);
    wd.appName = config.appName;

    handle.emit(wd);
  });
};

exports.master = function(handle) {
  handle.on('status:wd', function(msg, worker) {
    // Mix-in the worker identity: startTime is known only in the master, and
    // worker.id is just convenient to do here.
    msg.pst = worker.startTime;
    msg.wid = worker.id;
    handle.send(msg);
  });
};

// require() of strongloop.json from this file causes Trace Sequences to not
// show up in arc Tracing for reasons unknown at this moment.
//
// This is a copy of strong-agent:lib/config.js with the offending requires
// stubbed out.
function configure(userKey, appName, options, env) {
  /* eslint no-unused-vars:0, sort-vars:0, semi:0, no-empty:0 */
  var home =
          process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  var cwd = process.cwd()
  var nfjson
  var pkgjson
  var userjson;

  // Load configs from strongloop.json and package.json
  try {
    nfjson = {} // require(cwd + '/strongloop.json');
  } catch (e) {
    nfjson = {};
  }
  try {
    pkgjson = require(cwd + '/package.json');
  } catch (e) {
    pkgjson = {};
  }
  try {
    userjson = {} // require(home + '/strongloop.json');
  } catch (e) {
    userjson = {};
  }

  var config = {
    appName: appName || env.STRONGLOOP_APPNAME || env.SL_APP_NAME ||
                 nfjson.appName || pkgjson.name || userjson.appName,
  };

  appName = config.appName;

  if (appName instanceof Array) {
    config.appName = appName.shift();
  } else {
  }

  return config;
}
