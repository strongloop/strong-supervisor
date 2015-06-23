'use strict';

var path = require('path');
var tap = require('tap');
var startCmd = require('../lib/start-command');

var yesApp = path.resolve(__dirname, 'yes-app');
var yesAppIndex = require.resolve('./yes-app');

tap.test('resolve wrapper', function(t) {
  t.match(startCmd(yesApp, slRun('index.js')),
          {cwd: yesApp, path: 'index.js', error: null},
          'preserves file path relative to cwd');
  t.match(startCmd(yesApp, slRun('.')),
          {cwd: yesApp, path: '.', error: null},
          'preserves valid relative directory path');
  t.match(startCmd(__dirname, slRun('yes-app')),
          {cwd: yesApp, path: '.', error: null},
          'changes cwd to app root, given relative path to real app');
  t.end();
});

tap.test('fromPath, given valid file paths', function(t) {
  t.match(startCmd.fromPath(yesApp, 'index.js'),
          {cwd: yesApp, path: 'index.js', error: null},
          'preserves file path relative to cwd');
  t.match(startCmd.fromPath(yesApp, yesAppIndex),
          {cwd: yesApp, path: 'index.js', error: null},
          'forces absolute file path to be relative to cwd');
  t.end();
});

tap.test('fromPath, given valid directory paths', function(t) {
  t.match(startCmd.fromPath(yesApp, '.'),
          {cwd: yesApp, path: '.', error: null},
          'preserves valid relative directory path');
  t.match(startCmd.fromPath(yesApp, yesApp),
          {cwd: yesApp, path: '.', error: null},
          'forces valid absolute path to be relative to cwd');
  t.match(startCmd.fromPath(__dirname, yesApp),
          {cwd: yesApp, path: '.', error: null},
          'changes cwd to app root, given absolute path');
  t.match(startCmd.fromPath(__dirname, 'yes-app'),
          {cwd: yesApp, path: '.', error: null},
          'changes cwd to app root, given relative path to real app');
  t.end();
});

tap.test('fromPath, given invalid paths', function(t) {
  t.match(startCmd.fromPath(yesApp, 'no-way.js'),
          {error: Error('some error')},
          'fails when relative path does not exist');
  t.match(startCmd.fromPath(yesApp, path.join(yesApp, 'no-way.js')),
          {error: Error()},
          'fails when absolute path does not exist');
  t.end();
});

tap.test('resolveFile', function(t) {
  var fn = startCmd.resolveFile;
  var deepBase = path.resolve(__dirname, 'module-app');
  var deep = path.resolve(deepBase, 'path/to/deep.js');
  t.match(fn('.', yesAppIndex), {cwd: yesApp, path: 'index.js'},
          'split yesApp at package.json path location');
  t.match(fn('.', deep), {cwd: deepBase, path: 'path/to/deep.js'},
          'splits deep module-app path at package.json location');
  t.end();
});

function slRun() {
  var args = Array.prototype.slice.apply(arguments);
  return [process.execPath, 'sl-run'].concat(args);
}
