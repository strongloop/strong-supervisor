// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

// test globals
/* global assert,util,exec */
/* eslint-disable */
global.assert = require('assert');
global.debug = require('./debug');
global.fs = require('fs');
global.path = require('path');
global.util = require('util');
/* eslint-enable */

require('shelljs/global');

// module locals
var supervise = require('./supervise');

exports.runCtl = {
  supervise: supervise,
  waiton: waiton,
  expect: expect,
  failon: failon,
};

// Wait on cmd to write specific output
function waiton(cmd, output) {
  while (true) {
    try {
      expect(cmd, output);
      return;
    } catch (er) {
      pause();
    }
  }
}

// Expect cmd to succeed and write specific output
function expect(cmd, output) {
  var out = runctl(cmd);

  assert.equal(out.code, 0);

  if (output) {
    assert(output.test(out.output), output);
  }
}

// Expect cmd to fail and write specific output
function failon(cmd, output) {
  var out = runctl(cmd);

  assert.notEqual(out.code, 0);

  if (output) {
    assert(output.test(out.output), out.output);
  }
}

function runctl(cmd) {
  var out = exec(util.format(
    '%s %s',
    require.resolve('../bin/sl-runctl'),
    cmd || ''
  ));
  console.log('# runctl %s =>', cmd, out.output.split('\n').join('\n # '));
  return out;
}

function pause(secs) {
  secs = secs || 1;
  var start = process.hrtime();
  while (process.hrtime(start)[0] < secs) {
  }
}

global.pause = pause;
