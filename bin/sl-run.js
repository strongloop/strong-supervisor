#!/usr/bin/env node

// Exit on loss of parent process, if it had established an ipc control channel.
// We do this ASAP because we don't want child processes to leak, outliving
// their parent. If the parent has not established an 'ipc' channel to us, this
// will be a no-op, the disconnect event will never occur.
process.on('disconnect', function() {
  process.exit(2);
});

var config = require('../lib/config'); // May exit, depending on argv
var log = config.logger;

if(!config.profile) {
  if(config.isMaster) {
    log.error('supervisor running without StrongOps (unprofiled)');
  }
} else {
  require('strong-agent').profile(undefined, undefined, {
    quiet: config.isWorker, // Quiet in worker, to avoid repeated log messages
    logger: config.logger,
  });
}

if((config.clustered && config.isMaster) || config.detach){
  return config.start();
}

// starts metrics reporting if --metrics was set, or does nothing
config.sendMetrics();

if(!config.clustered) {
  console.log('supervisor running without clustering (unsupervised)');
}

// Reset argv to not include the runner (at argv[1]).
process.argv = process.argv.slice(0, 1).concat(process.argv.slice(2))

// Run as if app is the main module
require('module')._load(
  require('path').resolve(process.argv[1]),
  null, // parent
  true  // isMain
);
