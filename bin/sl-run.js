#!/usr/bin/env node
// Copyright IBM Corp. 2014,2017. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

// Exit on loss of parent process, if it had established an ipc control channel.
// We do this ASAP because we don't want child processes to leak, outliving
// their parent. If the parent has not established an 'ipc' channel to us, this
// will be a no-op, the disconnect event will never occur.
process.on('disconnect', function() {
  process.exit(2);
});

var config = require('../lib/config'); // May exit, depending on argv
var log = config.logger;
var tracer = require('../lib/tracer');

if (config.enableTracing && config.isWorker) {
  if (!tracer.start())
    log.error('supervisor failed to enable tracing');
}

var agent = require('../lib/agent');
var agentOptions = {
  quiet: config.isWorker, // Quiet in worker, to avoid repeated log messages
  logger: config.logger,
  // XXX(sam) if appmetrics does any console writes, use the logger
  strongTracer: tracer(),
  interval: 0 | process.env.STRONGLOOP_BASE_INTERVAL || 15000,
  // XXX(sam) interval is ignored by appmetrics
};

agentOptions.dashboard = process.env.STRONGLOOP_DASHBOARD;

if (config.profile) {
  agent().start(agentOptions);
} else {
  if (config.isMaster) {
    log.error('supervisor running without profiling');
  }
}

if (config.isMaster) {
  return config.start();
}

config.sendMetrics();
config.watcher();

// Reset argv to not include the runner (at argv[1]).
process.argv = process.argv.slice(0, 1).concat(process.argv.slice(2));

// Run as if app is the main module
require('module')._load(
  require('path').resolve(process.argv[1]),
  null, // parent
  true  // isMain
);
