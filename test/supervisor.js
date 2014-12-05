var debug = require('./debug');
var fs = require('fs');
var spawn = require('child_process').spawn;

var slr = require.resolve('../bin/sl-run');
var cwd = process.cwd();

function once(fn) {
  return function() {
    if(fn) {
      fn.apply(null, arguments);
      fn = null;
    }
  }
}

describe('supervisor', function(done) {
  var child;

  this.timeout(4000); // CI machines are slow for process creation

  this.afterEach(function(done) {
    process.chdir(cwd);
    if(!child || child.exitCode != null || child.signalCode) {
      return done();
    }
    child.on('exit', function() {
      done();
    }).kill('SIGKILL');
  });

  function runSlr(dir, args, expectations, done) {
    done = once(done);
    process.chdir(dir);
    child = spawn(slr, args).on('error', done);

    child.stdout.on('data', data);
    child.stderr.on('data', data);

    return child;

    function data(data) {
      debug('> ' + data)
      expectations = expectations.filter(function(expect) {
        return !expect.test(data);
      });
      if(expectations.length == 0) {
        return done();
      }
    }
  }

  function run(dir, args, expectations) {
    it('should run ['+args.join(',')+'] from '+dir, function(done) {
      runSlr(dir, args, expectations, done);
    });
  }

  describe.skip('loopback', function() {
    var EXPECT = [
      /LoopBack server listening/,
      /profiling/
    ];

    run('.', ['test/lb-app'], EXPECT);
    run('.', ['test/lb-app/.'], EXPECT);
    run('.', ['test/lb-app/app'], EXPECT);
    run('.', ['test/lb-app/app.js'], EXPECT);
    run('test/lb-app', [], EXPECT);
    run('test/lb-app', ['.'], EXPECT);
    run('test/lb-app', ['app'], EXPECT);
    run('test/lb-app', ['app.js'], EXPECT);
  });

  describe('express', function() {
    var EXPECT = [
      /express-app listening/
    ];

    run('.', ['test/express-app'], EXPECT);
    run('.', ['test/express-app/.'], EXPECT);
    run('.', ['test/express-app/server'], EXPECT);
    run('.', ['test/express-app/server.js'], EXPECT);
    run('test', ['express-app/server'], EXPECT);
    run('test/express-app', [], EXPECT);
    run('test/express-app', ['.'], EXPECT);
    run('test/express-app', ['server'], EXPECT);
    run('test/express-app', ['server.js'], EXPECT);
  });

  describe('module', function() {
    var EXPECT = [
      /module-app listening/,
      /VAR=.this var./,
    ];

    run('.', ['test/module-app'], EXPECT);
    run('.', ['test/module-app/.'], EXPECT);
    run('.', ['test/module-app/index.js'], EXPECT);
    run('test/module-app', [], EXPECT);
    run('test/module-app', ['.'], EXPECT);
    run('test/module-app', ['index.js'], EXPECT);
  });

  describe('argument processing', function() {
    var EXPECT = [
      /module-app listening/,
      /argv 1:.*index.js/,
      /argv 2: --cluster=10/,
    ];

    run('.', ['--no-cluster', 'test/module-app/index.js', '--cluster=10'], EXPECT);
    run('.', ['--cluster', 'off', 'test/module-app/index.js', '--cluster=10'], EXPECT);
    run('.', ['--cluster', '1', 'test/module-app/index.js', '--cluster=10'], EXPECT);

    run('.', ['--help', 'help-option'], [/usage: slr/]);
    run('.', ['-h', 'h-option'], [/usage: slr/]);

    var VERSION = RegExp('v'+require('../package.json').version);

    run('.', ['--version', 'version-option'], [VERSION]);
    run('.', ['-v', 'v-option'], [VERSION]);
  });

  describe('timestamping', function() {
    var TS_WORKER = /^\d+-\d+-\d+T\d+:\d+:\d+.\d+Z pid:\d+ worker:\d+ .+/;
    var TS_SUPER = /^\d+-\d+-\d+T\d+:\d+:\d+.\d+Z pid:\d+ worker:0 .+/;
    var NO_TS_WORKER = /^pid:\d+ worker:\d+ .+/;
    var NO_TS_SUPER = /^pid:\d+ worker:0 .+/;

    describe('worker logs', function() {
      var EXPECT_TIMESTAMPS = [ TS_WORKER, TS_SUPER ];
      var EXPECT_NO_TIMESTAMPS = [ NO_TS_WORKER, TS_SUPER ];

      run('.', ['--cluster', '1', 'test/yes-app'], EXPECT_TIMESTAMPS);
      run('.', ['--cluster', '1', '--no-timestamp-workers', 'test/yes-app'], EXPECT_NO_TIMESTAMPS);
    });

    describe('supervisor logs', function() {
      var EXPECT_TIMESTAMPS = [ TS_WORKER, TS_SUPER ];
      var EXPECT_NO_TIMESTAMPS = [ TS_WORKER, NO_TS_SUPER ];

      run('.', ['--cluster', '1', 'test/yes-app'], EXPECT_TIMESTAMPS);
      run('.', ['--cluster', '1', '--no-timestamp-supervisor', 'test/yes-app'], EXPECT_NO_TIMESTAMPS);
    });
  });

  describe('SIGHUP of supervisor', function() {
    it('should chdir into PWD before restarting', function(done) {
      var EXPECT = [
        /PWD=.*.test.x-app/,
        /CWD=.*.test.v1-app/,
        /version=.0.0.0/,
        /CWD=.*.test.v2-app/,
        /version=.1.0.0/,
      ];

      function symlink(from) {
        // Delete last symlink, if it exists
        try {
          fs.unlinkSync('test/x-app');
        } catch(er) {
        };
        fs.symlinkSync(from, 'test/x-app');
      }

      symlink('v1-app');
      runSlr('.', ['--cluster=1', 'test/x-app'], EXPECT, done)
        .stdout.on('data', function(data) {
          if (!/version=/.test(data)) return;

          symlink('v2-app');
          child.kill('SIGHUP');
        });
    });
  });
  describe('chdir behaviour', function() {
    var EXPECT = [
      /deep-app listening/,
      /argv 1:.*path\/to\/deep.js/,
    ];

    run('.', ['test/module-app/path/to/deep.js'], EXPECT);
  });
});
