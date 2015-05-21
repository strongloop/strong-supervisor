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

var appName = configure(null, null, {}, process.env).appName;
var lrtime = addon ? addon.lrtime : undefined;
var options = {
  archiveInterval: 20000,
  accountKey: appName,
  useHttp: false,
  lrtime: lrtime,
};

function tracer() {
  return TRACER;
}

function start() {
  assert(!TRACER);
  if (options.accountKey)
    TRACER = require('strong-trace')(options);
  return TRACER;
}
