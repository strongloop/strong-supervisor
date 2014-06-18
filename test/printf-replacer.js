'use strict';

var assert = require('assert');
var util = require('util');

var printfReplacer = require('../lib/printf-replacer');

describe('printfReplacer', function() {
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
  examples.forEach(function (example) {
    var description = util.format('transforms %j into %j',
                                  example.given[0], example.expect);
    it(description, function() {
      var result = printfReplacer.apply(null, example.given);
      assert.equal(result, example.expect);
    });
  });
});
