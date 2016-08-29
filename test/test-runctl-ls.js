// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var helper = require('./helper');
var tap = require('tap');

var rc = helper.runCtl;
var supervise = rc.supervise;
var expect = rc.expect;
var waiton = rc.waiton;

var app = require.resolve('./module-app');

var run = supervise(app);

tap.test('runctl ls', function(t) {
  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.doesNotThrow(function() {
    cd(path.dirname(app));
  });

  t.doesNotThrow(function() {
    waiton('', /worker count: 0/);
  });
  t.doesNotThrow(function() {
    expect('ls', /module-app@0.0.0/);
  });
  t.doesNotThrow(function() {
    expect('ls 1', /module-app@0.0.0/);
  });
  t.doesNotThrow(function() {
    expect('stop');
  });
});
