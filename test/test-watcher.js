// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var tap = require('tap');
var watcher = require('../lib/watcher');

tap.test('load watcher', function(t) {
  t.assert(watcher._watchers.length > 0, 'loaded watchers');
  t.end();
});

// TODO test .send and .emit?
