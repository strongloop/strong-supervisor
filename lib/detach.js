var open = require('fs').openSync;
var spawn = require('child_process').spawn;

module.exports = function detach(argv, log) {
  var stdio = (function() {
    if (log === '-') {
      return 'inherit';
    }
    // output file must be opened once for each target descriptor
    // see https://github.com/joyent/libuv/issues/1074
    var out = open(log, 'a');
    var err = open(log, 'a');
    return ['ignore', out, err];
  }());

  var child = spawn(
    argv[0],
    argv.slice(1),
    {
      detached: true,
      env: process.env,
      stdio: stdio,
    }
  );
  child.unref();
  return child;
};
