var spawn = require('child_process').spawn;

module.exports = function detach(argv) {
  console.error('detach argv:', argv);
  var child = spawn(
    argv[0],
    argv.slice(1),
    {
      detached: true,
      env: process.env,
      stdio: process.env.SUPERVISOR_ENV === 'dev' ? 'inherit' : 'ignore',
    }
  );
  child.unref();
  return child;
};
