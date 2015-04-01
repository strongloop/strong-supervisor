var fs = require('fs');

// Stale files are readable, but don't have the pid of a currently existing
// process in them.
function isStale(file) {
  try {
    var pid = fs.readFileSync(file) | 0; // Coerce non-numerics to 0
  } catch (er) {
    // File doesn't exist, or can't be accessed, not stale
    return false;
  }

  if (pid < 1) {
    // Pid's less than 1 do not exist, it is stale
    return true;
  }

  try {
    process.kill(pid, 0);
  } catch (er) {
    if (er.code === 'ESRCH') {
      // Pid does not exist, it is stale
      return true;
    }
  }

  return false;
}

// Unlink if possible, ignore if not
function unlink(file) {
  try {
    fs.unlinkSync(file);
  } catch (er) {
    /* eslint no-empty:0 */
  }
}

// Write pidfile, errors on failure, including pre-existence of file
function write(file, pid) {
  fs.writeFileSync(file, pid, {flag: 'wx'});
}

function create(file) {
  if (isStale(file)) {
    unlink(file);
  }
  write(file, process.pid);

  process.on('exit', unlink.bind(null, file));

  // We don't unlink on SIGINT or SIGTERM, because those could be handled and
  // recovered from, 'exit' is absolutely final.
}

function exists(file) {
  return !isStale(file);
}

module.exports = create;
module.exports.create = create;
module.exports.exists = exists;
