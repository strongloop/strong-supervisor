'use strict';

var fs = require('fs');
var path = require('path');

module.exports = exports = resolveApp;

// for tests
exports.fromArgs = fromArgs;

function resolveApp(cwd, argv) {
  return fromArgs(cwd, argv);
}

function fromArgs(cwd, argv) {
  var app = {
    cwd: cwd,
    path: argv[2],
    error: null,
  };

  var appRoot;

  try {
    var stat = fs.statSync(app.path);
  } catch (er) {
    try {
      app.path = require.resolve(path.resolve(app.path));
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

    // XXX(sam) this branch causes PWD to be set to CWD, fix might be:
    //   app = path.resolve(process.env.PWD, app)
    // which should perhaps be done before the statSync above
    app.path = path.resolve(app.path);
    appRoot = path.dirname(app.path);
    app.path = path.basename(app.path);
    // walk up the path until we find the package.json nearest to the app
    while (!fs.existsSync(path.join(appRoot, 'package.json'))) {
      app.path = path.join(path.basename(appRoot), app.path);
      // hit root, fallback to running as-is
      if (appRoot === path.dirname(appRoot)) {
        app.path = path.basename(argv[2]);
        appRoot = path.dirname(argv[2]);
        break;
      }
      appRoot = path.dirname(appRoot);
    }
    chdir(appRoot);
  } else if (stat.isDirectory()) {
    // The app is a directory (such as '.'), we'll look for what to run from it.
    chdir(app.path);

    // The canonical way to run is with `npm start`, but we can't do that for a
    // cluster worker, because the worker must start the runner (so it can
    // require strong-agent). Instead, we search for a runnable file, and if
    // that fails, just require the directory and let node do the right thing
    // (which should be to use package.main if it exists, index.js otherwise).
    app.path = existing('server.js') || existing('app.js') || '.';
  }

  return app;

  function chdir(dir) {
    app.cwd = path.resolve(app.cwd, dir);
  }

  function existing(file) {
    return fs.existsSync(file) ? file : null;
  }
}
