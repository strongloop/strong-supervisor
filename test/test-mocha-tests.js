// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var path = require('path');
var tap = require('tap');

// mocha tests assume they are run from package root, not test/
var cwd = path.resolve(__dirname, '../');
var mocha = require.resolve('mocha/bin/_mocha');
var args = [
  mocha, '--reporter', 'tap',
];

tap.test('mocha tests', function(t) {
  var tests = [
    'test/supervisor-detach.js',
    'test/supervisor.js',
  ];
  tests.forEach(function(test) {
    t.spawn(process.execPath, args.concat([test]), {cwd: cwd}, test);
  });
  t.end();
});
