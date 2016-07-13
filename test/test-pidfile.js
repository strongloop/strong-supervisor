// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var assert = require('assert');
var fs = require('fs');
var debug = require('./debug');
var pidfile = require('../lib/pidfile');
var tap = require('tap');

var FILE = 'test.pid';

function create() {
  pidfile(FILE);
}

function assertValid(t) {
  t.equal(process.pid, +fs.readFileSync(FILE));
}

function unlink() {
  debug('unlink', FILE);
  try {
    fs.unlinkSync(FILE);
  } catch (er) {
    debug('unlink', er);
  }
}

function noSuchPid() {
  var pid = 0x7fffffff;

  while (pid > 1) {
    try {
      process.kill(pid, 0);
    } catch (er) {
      if (er.code === 'ESRCH') {
        return pid;
      }
    }
    pid = pid - 1;
  }
  assert(false, 'could not find invalid pid?');
}

tap.test('pidfile', function(t) {
  t.test('should create a pidfile', function(t) {
    unlink();
    create();
    assertValid(t);
    t.end();
  });

  t.test('should fail if a pidfile exists', function(t) {
    unlink();
    create();
    try {
      create();
    } catch (er) {
      assert.equal('EEXIST', er.code);
    }
    t.end();
  });

  t.test('should succeed if pidfile has garbage', function(t) {
    unlink();
    fs.writeFileSync(FILE, 'garbage');
    create();
    assertValid(t);
    t.end();
  });

  t.test('should succeed if pidfile has non-existent pid', function(t) {
    unlink();
    fs.writeFileSync(FILE, noSuchPid());
    create();
    assertValid(t);
    t.end();
  });

  t.end();
});
