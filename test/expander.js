'use strict';

var assert = require('assert');

var expander = require('../lib/expander');

describe('expander.expand', function() {
  var example_worker = {
    id: 1,
    pid: 1234,
    hostname: 'always-up.some.domain',
    appName: 'totally.awesome',
  };
  var falsey_worker = { id: 0, pid: null, hostname: undefined, appName: false };
  var examples = [
    { given: ['supervisor.log', example_worker],
      expect: 'supervisor.log' },
    { given: ['myApp-%w-%p.log', example_worker],
      expect: 'myApp-1-1234.log' },
    { given: ['%h.%a.%w[%p]', example_worker],
      expect: 'always-up.totally-awesome.1[1234]' },
    { given: ['%h.%a.%w[%p]', {}],
      expect: '%h.%a.%w[%p]' },
    { given: ['%h.%a.%w[%p]', falsey_worker],
      expect: 'undefined.false.0[null]' },
  ];

  examples.forEach(function (e) {
    it('generates "' + e.expect + '" from "' + e.given + '"', function() {
      var result = expander.expand.apply(null, e.given);
      assert.equal(result, e.expect);
    });
  });
});
