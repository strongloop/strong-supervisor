'use strict';

var assert = require('assert');

var logname = require('../lib/logname');

describe('logname.generate', function() {
  var example_worker = { id: 1, pid: 1234 };
  var examples = [
    { given: 'supervisor.log', expect: 'supervisor.log' },
    { given: 'myApp-%w-%p.log', expect: 'myApp-1-1234.log' },
  ];
  examples.forEach(function (e) {
    it('generates "' + e.expect + '" from "' + e.given + '"', function() {
      var result = logname.generate(e.given, example_worker);
      assert.equal(result, e.expect);
    });
  });
});
