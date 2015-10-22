'use strict';

var debug = require('./debug')('start-command');
var fs = require('fs');
var path = require('path');

module.exports = exports = resolveArgs;

// for tests
exports.resolvePath = resolvePath;
exports.resolvePackageFromPath = resolvePackageFromPath;
exports.resolveDir = resolveDir;
exports.fromStart = fromStart;

// We want to be in the directory of the file we are running so we can pick up
// configuration stored in it's working directory, so part of resolving the path
// of the script is also resolving what directory the script should be run from.
function resolveArgs(pwd, argv) {
  var replacer = symlinkReplacer(pwd);
  var cwd = fs.realpathSync(pwd);
  var script = argv[2] || '.';
  debug('resolving CWD: %j, path: %j', cwd, script);
  var app = resolvePath(cwd, script);
  var stat = app.stat;
  if (app.error) {
    return app;
  }

  if (stat.isFile()) {
    // given path was either foo/app.js that exists or foo/app that doesn't
    // exist but which node would treat ass foo/app.js, so we'll just find the
    // the package's root directory and use that as the CWD when running the
    // specified script.
    return replacer(resolvePackageFromPath(app.cwd, app.path));
  }

  if (stat.isDirectory()) {
    // The given path is a directory, so now we want to find the nearest
    // package.json, use it as the CWD, and then perform an `npm start` like
    // script resolution.
    var absolutePath = path.resolve(app.cwd, app.path);
    var pkgApp = resolvePackageFromPath(absolutePath);

    // 1. try parsing scripts.start from the package.json
    var pkgStart = resolvePackageStart(pkgApp.cwd);
    if (!pkgStart.error) {
      return replacer(pkgStart);
    }

    // 2. try server.js, app.js, index.js**, then default module resolution
    // ** We explicitly check for index.js even though it will be checked by
    //    the node module resolver because we prefer it over the package's main
    //    in cases where they are different.
    pkgApp.path = ifExists(pkgApp.cwd, 'server.js') ||
                  ifExists(pkgApp.cwd, 'app.js') ||
                  ifExists(pkgApp.cwd, 'index.js') ||
                  requireable(pkgApp.cwd, pkgApp.path);
    if (pkgApp.path) {
      return replacer(pkgApp);
    }
  }

  // The package.json doesn't say how to run it, and node can't decide.. time
  // to error out and let the user know they need to be more specific.
  return {error: Error('app is not a file or a directory ')};
}

function resolvePath(cwd, script) {
  var app = {
    cwd: cwd,
    path: script,
  };

  try {
    app.stat = fs.statSync(path.resolve(app.cwd, app.path));
  } catch (er) {
    // app.path isn't accessible, it may be a JS file given without the .js
    // extension, which is something that `node` and require() both honour.
    try {
      app.path = require.resolve(path.resolve(app.cwd, app.path));
      app.stat = fs.statSync(app.path);
    } catch (er) {
      // nope, it's just plain not there, giving up.
      app.error = er;
    }
  }

  return app;
}

function ifExists(base, file) {
  return fs.existsSync(path.resolve(base, file)) ? file : null;
}

function requireable(cwd, script) {
  try {
    var absolutePath = path.resolve(cwd, script);
    var requirePath = require.resolve(absolutePath);
    // it is important to return a relative path in case there are symlinks in
    // the path, otherwise we are returning the absolute "real" path, because
    // that's what node does when it resolves module paths. In other words, it
    // would totally mess up supervisor's CWD/PWD/chdir efforts.
    return path.relative(cwd, requirePath);
  } catch (e) {
    return null;
  }
}

function resolvePackageFromPath(cwd, relative) {
  var absolute = path.resolve(cwd, relative || '');
  var dir = path.dirname(absolute);
  var file = path.basename(absolute);
  if (!relative) {
    dir = absolute;
    file = '';
  }
  // walk up the path until we find the package.json nearest to the app
  while (!ifExists(dir, 'package.json')) {
    file = path.join(path.basename(dir), file);
    // hit root, return the fallback to running the script in its directory
    if (dir === path.dirname(dir)) {
      file = path.basename(absolute);
      dir = path.dirname(absolute);
      break;
    }
    dir = path.dirname(dir);
  }
  return {cwd: dir, path: file, error: null};
}

function resolveDir(cwd, dir) {
  var app = {
    cwd: path.resolve(cwd, dir),
    path: ifExists(cwd, 'server.js') || ifExists(cwd, 'app.js') || '.',
    error: null,
  };
  return app;
}

function resolvePackageStart(cwd) {
  var pkgJSON = path.resolve(cwd, 'package.json');
  var pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJSON, 'utf8'));
  } catch (e) {
    return {error: Error('Could not read ' + pkgJSON)};
  }
  return fromStart(cwd, pkg.scripts && pkg.scripts.start);
}

function fromStart(cwd, script) {
  var scriptRegexp = /^(\S+)((?:\s+-\S+)*)?(?:\s+(\S+))(\s.*)?$/;
  // use same default as npm
  var parts = scriptRegexp.exec(script || 'node server.js');
  // TODO: support extracting node options like --expose_gc and --harmony and
  // alternative executors, like coffee.
  // app.execPath = parts[1];
  // app.execArgs = parts[2];
  var resolved = ifExists(cwd, parts[3]) || requireable(cwd, parts[3]);
  debug('script: [%j] %j => %j => %j via: ',
        cwd, script, parts[3], resolved,
        parts);
  if (!resolved) {
    return {error: Error('Could not resolve start script ' + script)};
  }
  return {cwd: cwd, path: resolved};
}

function symlinkReplacer(link) {
  var real = fs.realpathSync(link);
  if (real === link) {
    return passThrough;
  }
  return replace;
  function replace(app) {
    if (app.cwd) {
      app.cwd = app.cwd.replace(real, link);
    }
    return app;
  }
  function passThrough(app) {
    return app;
  }
}
