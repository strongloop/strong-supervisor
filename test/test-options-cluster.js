// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var CPUS = require('os').cpus().length;
var options = require('../lib/options');
var tap = require('tap');

tap.test('cluster option validation', function(t) {
  t.test('valid values', function(t) {
    check(['node', 'sl-run', '--cluster=10'], 10);
    check(['node', 'sl-run', '--cluster', '-10'], -10);
    check(['node', 'sl-run', '--cluster', 'CPU'], CPUS);
    check(['node', 'sl-run', '--cluster=cpu'], CPUS);
    t.end();

    function check(argv, expect) {
      var o = options.parse(argv);
      t.equal(o.cluster.size, expect);
    }
  });

  t.test('invalid values', function(t) {
    check('--cluster=on', 'on');
    check('--cluster=off', 'off');
    check('--no-cluster', 'no');
    t.end();

    function check(val, msg) {
      var err = {
        code: 1,
        message: 'Invalid cluster option: ' + msg,
      };
      var fn = options.parse.bind(null, ['node', 'sl-run', val]);
      t.throws(fn, err);
    }
  });

  t.end();
});
