// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var path = require('path');
var supervise = require('./supervise');

module.exports = setup;

function setup(t, args) {
  var app = require.resolve('./module-app');
  var run = supervise(app, args);

  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(signal || code, 0);
    t.end();
  });

  process.chdir(path.dirname(app));
}
