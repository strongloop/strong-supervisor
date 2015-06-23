'use strict';

var fs = require('fs');
var path = require('path');

module.exports = exports = resolveArgs;

// for tests
exports.fromPath = fromPath;
exports.resolveFile = resolveFile;
exports.resolveDir = resolveDir;

function resolveArgs(cwd, argv) {
  var script = argv[2] || '.';
  return fromPath(cwd, script);
}

function fromPath(cwd, script) {
  var app = {
    cwd: cwd,
    path: script,
    error: null,
  };

  try {
    var stat = fs.statSync(path.resolve(app.cwd, app.path));
  } catch (er) {
    try {
      app.path = require.resolve(path.resolve(app.cwd, app.path));
      stat = fs.statSync(app.path);
    } catch (er) {
      app.error = er;
      return app;
    }
  }

  // We want to be in the directory of the file we are running, so we can pick
  // up configuration stored in it's working directory.

  if (stat.isFile()) {
    // The app is a file, we'll run it from its module's root directory.
    return resolveFile(cwd, script);
  } else if (stat.isDirectory()) {
    // The app is a directory (such as '.'), we'll look for what to run from it.
    return resolveDir(cwd, script);
  }

  return app;
}

function ifExists(base, file) {
  return fs.existsSync(path.resolve(base, file)) ? file : null;
}

function resolveFile(cwd, script) {
  var absolute = path.resolve(cwd, script);
  var dir = path.dirname(absolute);
  var file = path.basename(absolute);
  // walk up the path until we find the package.json nearest to the app
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    file = path.join(path.basename(dir), file);
    // hit root, fallback to running as-is
    if (dir === path.dirname(dir)) {
      file = path.basename(script);
      dir = path.dirname(script);
      break;
    }
    dir = path.dirname(dir);
  }
  return {cwd: dir, path: file, error: null};
}

function resolveDir(cwd, dir) {
  // The canonical way to run is with `npm start`, but we can't do that for a
  // cluster worker, because the worker must start the runner (so it can
  // require strong-agent). Instead, we search for a runnable file, and if
  // that fails, just require the directory and let node do the right thing
  // (which should be to use package.main if it exists, index.js otherwise).
  var app = {
    cwd: path.resolve(cwd, dir),
    path: ifExists(cwd, 'server.js') || ifExists(cwd, 'app.js') || '.',
    error: null,
  };
  return app;
}
