// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var app = require('./app');
var assert = require('assert');

exports = module.exports = tracer;
exports.start = start;

var TRACER = null;

var options = {
  archiveInterval: 20000,
  accountKey: undefined, // Filled in later
  useHttp: false,
  blacklist: ['*node_modules/appmetrics/*'],
  wrap_timers: false,
  traceId: process.env.STRONGLOOP_TRACES_ID, // returned as hostname in trace
};

function tracer() {
  return TRACER;
}

function start() {
  assert(!TRACER);
  // This is delayed to allow process.env to be modified up until start time.
  options.accountKey = app.name();
  if (options.accountKey) {
    // This is delayed because requiring appmetrics causes it to monkey-patch,
    // which should not occur unless profiling or tracing is enabled.
    options.lrtime = require('appmetrics').lrtime;
    TRACER = require('strong-trace')(options);
  }
  return TRACER;
}
