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
    'test/chdir.js',
    'test/expander.js',
    'test/metrics.js',
    'test/pidfile.js',
    'test/printf-replacer.js',
    'test/supervisor-detach.js',
    'test/supervisor.js',
  ];
  tests.forEach(function(test) {
    t.spawn(process.execPath, args.concat([test]), {cwd: cwd}, test);
  });
  t.end();
});
