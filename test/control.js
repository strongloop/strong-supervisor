// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var assert = require('assert');
var async = require('async');
var debug = require('./debug');
var exec = require('child_process').execFile;

exports.waiton = waiton;
exports.expect = expect;
exports.failon = failon;

// Wait on cmd to write specific output
function waiton(t, cmd, output) {
  t.test(cmd, function(t) {
    async.doUntil(run, test, done);

    function run(callback) {
      runctl(cmd, callback);
    }

    function test(code, text) {
      debug('TEST');
      return code === 0 &&
        (output ? output.test(text) : true);
    }

    function done(err, code, text) {
      assert.ifError(err); // Can't happen.
      t.equal(code, 0);

      if (output) {
        t.assert(output.test(text), output);
      }
      t.end();
    }
  });
}

// Expect cmd to succeed and write specific output
function expect(t, cmd, output) {
  t.test(cmd, function(t) {
    runctl(cmd, function(err, code, text) {
      assert.ifError(err);
      t.equal(code, 0);

      if (output) {
        t.assert(output.test(text), output);
      }
      t.end();
    });
  });
}

// Expect cmd to fail and write specific output
function failon(t, cmd, output) {
  t.test(cmd, function(t) {
    runctl(cmd, function(err, code, text) {
      assert.ifError(err);
      t.notEqual(code, 0);

      if (output) {
        t.assert(output.test(text), output);
      }
      t.end();
    });
  });
}

function runctl(cmd, callback) {
  var args = (cmd || '').split(' ');

  args.unshift(require.resolve('../bin/sl-runctl'));

  debug('exec %j', args);

  exec(process.execPath, args, function(err, stdout, stderr) {
    var code = err ? (err.signal || err.code) : 0;
    var output = stdout + '\n' + stderr;
    debug('cmd %j code: %d\nout <\n%s>\nerr <\n%s>', cmd, code, stdout, stderr);
    callback(null, code, output);
  }).on('error', function(err) {
    // Only happens on low level system failures that prevent fork/exec,
    // consider fatal, the system or this test is unrecoverable.
    assert.isError(err);
  });
}
