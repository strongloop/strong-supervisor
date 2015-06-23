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

tap.test('fromArgs, given valid file paths', function(t) {
  t.match(startCmd.fromArgs(yesApp, slRun('index.js')),
          {cwd: yesApp, path: 'index.js', error: null},
          'preserves file path relative to cwd');
  t.match(startCmd.fromArgs(yesApp, slRun(yesAppIndex)),
          {cwd: yesApp, path: 'index.js', error: null},
          'forces absolute file path to be relative to cwd');
  t.end();
});

tap.test('fromArgs, given valid directory paths', function(t) {
  t.match(startCmd.fromArgs(yesApp, slRun('.')),
          {cwd: yesApp, path: '.', error: null},
          'preserves valid relative directory path');
  t.match(startCmd.fromArgs(yesApp, slRun(yesApp)),
          {cwd: yesApp, path: '.', error: null},
          'forces valid absolute path to be relative to cwd');
  t.match(startCmd.fromArgs(__dirname, slRun(yesApp)),
          {cwd: yesApp, path: '.', error: null},
          'changes cwd to app root, given absolute path');
  t.match(startCmd.fromArgs(__dirname, slRun('yes-app')),
          {cwd: yesApp, path: '.', error: null},
          'changes cwd to app root, given relative path to real app');
  t.end();
});

tap.test('fromArgs, given invalid paths', function(t) {
  t.match(startCmd.fromArgs(yesApp, slRun('no-way.js')),
          {error: Error('some error')},
          'fails when relative path does not exist');
  t.match(startCmd.fromArgs(yesApp, slRun(path.join(yesApp, 'no-way.js'))),
          {error: Error()},
          'fails when absolute path does not exist');
  t.end();
});

function slRun() {
  var args = Array.prototype.slice.apply(arguments);
  return [process.execPath, 'sl-run'].concat(args);
}
