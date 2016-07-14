// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var assert = require('assert');
var debug = require('./debug');
var send = require('../lib/metrics');

var logger = {
  info: debug,
  warn: debug,
};

var metrics = {
  send: send,
  logger: logger,
};

describe('metrics', function() {
  afterEach(function() {
    delete process.env.STRONGLOOP_METRICS;
  });

  it.skip('returns true when STRONGLOOP_METRICS is statsd', function() {
    // XXX(sam) This passes, but somehow pollutes the global mocha environment
    // so the supervisor/loopback tests fail. Not the supervisor/express, just
    // loopback, I've no idea how that's possible, but its a problem that would
    // not exist if we were using node-tap. After an hour of debugging, I give
    // up.
    process.env.STRONGLOOP_METRICS = 'statsd:/agent.%w.%p';
    var statsd = metrics.send();
    assert(statsd);
    assert(!statsd.publisher.host);
    assert(!statsd.publisher.port);
    assert.equal(statsd.publisher.scope, 'agent.supervisor.' + process.pid);
    require('../lib/adapter.js').stop();
    statsd.publisher.stats.close();
  });
});
