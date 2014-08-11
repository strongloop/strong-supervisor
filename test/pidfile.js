var assert = require('assert');
var fs = require('fs');
var debug = require('./debug');
var pidfile = require('../lib/pidfile');

var FILE = 'test.pid';

function create() {
  pidfile(FILE);
}

function assertValid() {
  assert.equal(process.pid, +fs.readFileSync(FILE));
}

function unlink() {
  debug('unlink', FILE);
  try {
    fs.unlinkSync(FILE);
  } catch(er) {
    debug('unlink', er);
  }
}

function noSuchPid() {
  var pid = 0xffffffff;

  while(pid > 1) {
    try {
      process.kill(pid, 0);
    } catch(er) {
      if(er.code == 'ESRCH') {
        return pid;
      }
    }
    pid = pid - 1;
  }
  fail('could not find invalid pid?');
}

describe('pidfile', function() {
  beforeEach(unlink);
  
  it('should create a pidfile', function() {
    create();
    assertValid();
  });

  it('should fail if a pidfile exists', function() {
    create();
    try {
      create();
    } catch(er) {
      assert.equal('EEXIST', er.code);
    }
  });

  it('should succeed if pidfile has garbage', function() {
    fs.writeFileSync(FILE, 'garbage');
    create();
    assertValid();
  });

  it('should succeed if pidfile has non-existent pid', function() {
    fs.writeFileSync(FILE, noSuchPid());
    create();
    assertValid();
  });
});
