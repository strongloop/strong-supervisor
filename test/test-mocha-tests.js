var cp = require('child_process');
var path = require('path');

// mocha tests assume they are run from package root, not test/
var cwd = path.resolve(__dirname, '../');
var args = [
  '--reporter', 'tap',
  'test/chdir.js',
  'test/debug.js',
  'test/expander.js',
  'test/metrics.js',
  'test/pidfile.js',
  'test/printf-replacer.js',
  'test/supervisor-detach.js',
  'test/supervisor.js',
];

cp.spawn('_mocha', args, {cwd: cwd, stdio: 'inherit'})
  .on('exit', function(code) {
    process.exit(code);
  });
