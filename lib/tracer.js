'use strict';

// We don't want to require strong-agent, because anything it requires will
// become untraceable. Still, we need to use its idea of the appName, and access
// lrtime from the addon, so require the agent internals.
var addon = require('strong-agent/lib/addon');
var assert = require('assert');
var configure = require('strong-agent/lib/config').configure;

exports = module.exports = tracer;
exports.start = start;

var TRACER = null;

var lrtime = addon ? addon.lrtime : undefined;
var options = {
  archiveInterval: 20000,
  accountKey: undefined, // Filled in later
  useHttp: false,
  lrtime: lrtime,
  blacklist: ['*node_modules/strong-agent/*'],
  wrap_timers: false,
  traceId: process.env.STRONGLOOP_TRACES_ID, // returned as hostname in trace
};

function tracer() {
  return TRACER;
}

function start() {
  assert(!TRACER);
  // This is delayed to allow process.env to be modified up until start time.
  var config = configure(null, null, {}, process.env);
  options.accountKey = config.appName;
  if (options.accountKey)
    TRACER = require('strong-trace')(options);
  return TRACER;
}
