'use strict';

var fs = require('fs');
var path = require('path');
var tap = require('tap');
var startCmd = require('../lib/start-command');

var envApp = path.resolve(__dirname, 'env-app');
var yesApp = path.resolve(__dirname, 'yes-app');
var expressApp = path.resolve(__dirname, 'express-app');
var expressApp2 = path.resolve(__dirname, 'express-app-2');
var yesAppIndex = require.resolve('./yes-app');
var moduleApp = path.resolve(__dirname, 'module-app');
var deepPath = path.resolve(moduleApp, 'path/to/deep.js');
var parentDir = path.resolve(__dirname, '../../');

tap.test('resolve wrapper', function(t) {
  t.match(startCmd(yesApp, slRun('index.js')),
          {cwd: yesApp, path: 'index.js'},
          'preserves file path relative to cwd');
  t.match(startCmd(yesApp, slRun('.')),
          {cwd: yesApp, path: 'index.js'},
          'preserves valid relative directory path');
  t.match(startCmd(yesApp, slRun()),
          {cwd: yesApp, path: 'index.js'},
          'preserves valid relative directory path');
  t.match(startCmd(__dirname, slRun('yes-app')),
          {cwd: yesApp, path: 'index.js'},
          'changes cwd to app root, given relative path to real app');
  t.match(startCmd(__dirname, slRun('yes-app/index')),
          {cwd: yesApp, path: 'index.js'},
          'changes cwd to app root, given relative path to real app');
  t.match(startCmd(__dirname, slRun('yes-app/index.js')),
          {cwd: yesApp, path: 'index.js'},
          'changes cwd to app root, given relative path to real app');
  t.match(startCmd(__dirname, slRun('env-app')),
          {cwd: envApp, path: 'start.js'},
          'handles a simple start script');
  t.match(startCmd(parentDir, slRun(deepPath)),
          {cwd: moduleApp, path: 'path/to/deep.js'},
          'handles a deep path with multiple package roots');
  t.match(startCmd(__dirname, slRun('express-app-2')),
          {cwd: expressApp2, path: 'server/server.js'},
          'handles a nested server.js');
  t.end();
});

tap.test('symlinks - simple', function(t) {
  var expresslink = symlink(expressApp);
  t.match(startCmd(expresslink, slRun()),
          {cwd: expresslink, path: 'server.js'},
          'maintains simple symlink paths');
  t.end();
});

tap.test('symlinks - relative', function(t) {
  var express2link = symlink('test/express-app-2');
  t.match(startCmd(express2link, slRun()),
          {cwd: express2link, path: 'server/server.js'},
          'maintains deeper symlink main path');
  t.end();
});

tap.test('symlinks - deep', function(t) {
  var modLink = symlink(moduleApp);
  t.match(startCmd(modLink, slRun('path/to/deep.js')),
          {cwd: modLink, path: 'path/to/deep.js'},
          'maintains deeper symlink given path');
  t.end();
});

tap.test('fromPath, given valid file paths', function(t) {
  t.match(startCmd.resolvePath(yesApp, 'index.js'),
          {cwd: yesApp, path: 'index.js'},
          'preserves file path relative to cwd');
  t.match(startCmd.resolvePath(yesApp, yesAppIndex),
          {cwd: yesApp, path: yesAppIndex},
          'forces absolute file path to be relative to cwd');
  t.end();
});

tap.test('fromPath, given valid directory paths', function(t) {
  t.match(startCmd.resolvePath(yesApp, '.'),
          {cwd: yesApp, path: '.'},
          'preserves valid relative directory path');
  t.match(startCmd.resolvePath(yesApp, yesApp),
          {cwd: yesApp, path: yesApp},
          'preserves valid absolute path to be relative to cwd');
  t.match(startCmd.resolvePath(__dirname, yesApp),
          {cwd: __dirname, path: yesApp},
          'preserves cwd, given absolute path');
  t.match(startCmd.resolvePath(__dirname, 'yes-app'),
          {cwd: __dirname, path: 'yes-app'},
          'preserves cwd, given relative path to real app');
  t.end();
});

tap.test('fromPath, given invalid paths', function(t) {
  t.match(startCmd.resolvePath(yesApp, 'no-way.js'),
          {error: Error('some error')},
          'fails when relative path does not exist');
  t.match(startCmd.resolvePath(yesApp, path.join(yesApp, 'no-way.js')),
          {error: Error()},
          'fails when absolute path does not exist');
  t.end();
});

tap.test('resolvePackageFromFile', function(t) {
  var fn = startCmd.resolvePackageFromPath;
  var deepBase = path.resolve(__dirname, 'module-app');
  var deep = path.resolve(deepBase, 'path/to/deep.js');
  t.match(fn('.', yesAppIndex), {cwd: yesApp, path: 'index.js'},
          'split yesApp at package.json path location');
  t.match(fn('.', deep), {cwd: deepBase, path: 'path/to/deep.js'},
          'splits deep module-app path at package.json location');
  t.end();
});

tap.test('fromStart, given empty or missing strings', function(t) {
  var fn = startCmd.fromStart;
  t.match(fn(yesApp, undefined), {error: Error()}, 'should give null');
  t.match(fn(yesApp, null), {error: Error()}, 'should give null');
  t.match(fn(yesApp, ''), {error: Error()}, 'should give null');
  t.match(fn(expressApp, undefined),
          {cwd: expressApp, path: 'server.js'},
          'same as "node server.js"');
  t.match(fn(expressApp, null),
          {cwd: expressApp, path: 'server.js'},
          'same as "node server.js"');
  t.match(fn(expressApp, ''),
          {cwd: expressApp, path: 'server.js'},
          'same as "node server.js"');
  t.end();
});

tap.test('fromStart, given simple script', function(t) {
  t.match(startCmd.fromStart(yesApp, 'node index.js'),
          {cwd: yesApp, path: 'index.js'},
          'should give relative path');
  t.match(startCmd.fromStart(envApp, 'node start.js'),
          {cwd: envApp, path: 'start.js'},
          'should give relative path');
  t.match(startCmd.fromStart(yesApp, 'node .'),
          {cwd: yesApp, path: '.'},
          'should give relative path');
  t.end();
});

tap.test('fromStart, given script with extra args', function(t) {
  var fn = startCmd.fromStart;
  var cwd = __dirname;
  t.match(fn(cwd, 'node express-app/server.js --port $PORT'),
          {cwd: __dirname, path: 'express-app/server.js'},
          'should give relative path');
  t.match(fn(cwd, 'node lb-app/app.js $PORT'),
          {cwd: __dirname, path: 'lb-app/app.js'},
          'should give relative path');
  t.end();
});

tap.test('fromStart, corner cases', {todo: true}, function(t) {
  var fn = startCmd.fromStart;
  var cwd = yesApp;
  t.match(fn(cwd, 'node --harmony server/server.js --port $PORT'),
          {cwd: yesApp, path: 'server/server.js'},
          'should find correct path');
  t.match(fn(cwd, 'coffee --harmony server/server.coffee --port $PORT'),
          {cwd: yesApp, path: 'server/server.js'},
          'should find correct path');
  t.match(fn(cwd, 'node --harmony --expose_gc bin/app $PORT'),
          {cwd: yesApp, path: 'server/server.js'},
          'should find correct path');
  t.match(fn(cwd, 'node .'),
          {cwd: yesApp, path: 'server/server.js'},
          'should find correct path');
  t.end();
});

tap.test('fromStart extract node execArgv', {todo: true}, function(t) {
  var fn = startCmd.fromStart;
  var cwd = yesApp;
  t.match(fn(cwd, 'node --harmony server/server.js --port $PORT'),
          {cwd: yesApp, path: 'server/server.js',
           execArgv: ['--harmony']},
          'extracts simple args');
  t.match(fn(cwd, 'node --harmony --expose_gc bin/app.js $PORT'),
          {cwd: yesApp, path: 'server/server.js',
           execArgv: ['--harmony', '--expose_gc']},
          'extracts multiple args');
  t.match(fn(cwd, 'node --logfile v9.log --harmony --expose_gc bin/app.js'),
          {cwd: yesApp, path: 'bin/app.js',
           execArgv: ['--logfile', 'v9.log', '--harmony']},
          'extracts compound args');
  t.end();
});

function slRun() {
  var args = Array.prototype.slice.apply(arguments);
  return [process.execPath, 'sl-run'].concat(args);
}

function symlink(fromPath) {
  if (/^test\//.test(fromPath)) {
    fromPath = path.relative('test', fromPath);
  }
  // Delete last symlink, if it exists
  try {
    fs.unlinkSync('test/sx-app');
  } catch (er) {
    // ignore
  }
  fs.symlinkSync(fromPath, 'test/sx-app');
  return 'test/sx-app';
}
