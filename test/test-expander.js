// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var expander = require('../lib/expander');
var tap = require('tap');

tap.test('expander.expand', function(t) {
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

  examples.forEach(function(e) {
    t.test('generates "' + e.expect + '" from "' + e.given + '"', function(t) {
      var result = expander.expand.apply(null, e.given);
      t.equal(result, e.expect);
      t.end();
    });
  });

  t.end();
});
