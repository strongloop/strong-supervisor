var assert = require('assert');
var debug = require('debug')('supervisor:test');
var dgram = require('dgram');
var send = require('../lib/metrics');

var logger = {
  info: debug.bind(null, 'INFO'),
  warn: debug.bind(null, 'WARN'),
};

var metrics = {
  send: send,
  logger: logger,
};

describe('metrics', function() {
  it('returns false when STRONGLOOP_METRICS not in env', function() {
    assert.equal(metrics.send(), false);
  });
  it('returns false when STRONGLOOP_METRICS not a URL', function() {
    process.env.STRONGLOOP_METRICS = 'statsd';
    assert.equal(metrics.send(), false);
  });
  it('returns false when STRONGLOOP_METRICS not supported', function() {
    process.env.STRONGLOOP_METRICS = 'some-protocol://localhost:80/path';
    assert.equal(metrics.send(), false);
  });

  it('returns true when STRONGLOOP_METRICS is statsd', function() {
    process.env.STRONGLOOP_METRICS = 'statsd:/agent.%w.%p';
    var statsd = metrics.send();
    assert(statsd);
    assert(!statsd.publisher.host);
    assert(!statsd.publisher.port);
    assert.equal(statsd.publisher.scope, 'agent.supervisor.' + process.pid);
  });
});
