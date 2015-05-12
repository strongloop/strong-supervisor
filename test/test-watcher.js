'use strict';

var tap = require('tap');
var watcher = require('../lib/watcher');

tap.test('load watcher', function(t) {
  t.assert(watcher._watchers.length > 0, 'loaded watchers');
  t.end();
});

// TODO test .send and .emit?
