// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var lrtime = require('appmetrics').lrtime;
var app = require('./app');
var assert = require('assert');

exports = module.exports = tracer;
exports.start = start;

var TRACER = null;

var options = {
  archiveInterval: 20000,
  accountKey: undefined, // Filled in later
  useHttp: false,
  lrtime: lrtime,
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
  if (options.accountKey)
    TRACER = require('strong-trace')(options);
  return TRACER;
}
