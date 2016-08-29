// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var chdir = require('../lib/chdir');
var env = process.env;
var fs = require('fs');
var path = require('path');
var tap = require('tap');

var CWD = process.env.PWD;
var LINK = '_test-link';

function relink() {
  try {
    fs.unlinkSync(LINK);
  } catch (er) {
  }
  fs.symlinkSync('.', LINK);
}

tap.test('chdir should track pwd, which is not the same as cwd', function(t) {
  function assertPwd() {
    var pwd = path.join.apply(path, arguments);

    t.equal(process.env.PWD, pwd);

    // Despite all the cding through symlinks... our real CWD, according to
    // getcwd(3), never changes.
    t.equal(process.cwd(), CWD);
  }

  relink();
  assertPwd(process.cwd());
  chdir(LINK);
  assertPwd(CWD, LINK);
  chdir(LINK);
  assertPwd(CWD, LINK, LINK);
  var _ = env.PWD;
  chdir(env.PWD);
  assertPwd(_);
  chdir('..');
  assertPwd(CWD, LINK);
  chdir(path.join('..', LINK));
  assertPwd(CWD, LINK);
  t.end();
});
