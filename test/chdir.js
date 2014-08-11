var assert = require('assert');
var chdir = require('../lib/chdir');
var debug = require('./debug');
var env = process.env;
var fs = require('fs');
var path = require('path');

var CWD = process.env.PWD;
var LINK = '_test-link';

function relink() {
  try {
    fs.unlinkSync(LINK);
  } catch(er) {
  }
  fs.symlinkSync('.', LINK);
}

function assertPwd() {
  var pwd = path.join.apply(path, arguments);

  assert.equal(process.env.PWD, pwd);

  // Despite all the cding through symlinks... our real CWD, according to
  // getcwd(3), never changes.
  assert.equal(process.cwd(), CWD);
}

describe('chdir', function() {
  beforeEach(relink);
  
  it('should track pwd, which is not the same as cwd', function() {
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
  });
});
