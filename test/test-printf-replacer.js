// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var tap = require('tap');
var util = require('util');

var printfReplacer = require('../lib/printf-replacer');

tap.test('printfReplacer', function(t) {
  var examples = [
    { given: ['%a'],
      expect: '%a' },
    { given: ['%b', 1],
      expect: '%b' },
    { given: ['%c', {}],
      expect: '%c' },
    { given: ['%d', {d: 42}],
      expect: '42' },
    { given: ['%%e', {e: '%'}],
      expect: '%%e' },
    { given: ['%f.%g', {f: 'LEFT', g: 'RIGHT'}],
      expect: 'LEFT.RIGHT' },
    { given: ['%h\nmiddle\n%i', {h: 'TOP', i: 'BOTTOM'}],
      expect: 'TOP\nmiddle\nBOTTOM' },
  ];
  examples.forEach(function(example) {
    var description = util.format('transforms %j into %j',
                                  example.given[0], example.expect);
    t.test(description, function(t) {
      var result = printfReplacer.apply(null, example.given);
      t.equal(result, example.expect);
      t.end();
    });
  });

  t.end();
});
