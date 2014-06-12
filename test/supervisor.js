var debug = require('debug')('supervisor:test');
var spawn = require('child_process').spawn;
var path = require('path');

var slr = path.resolve('bin/slr');
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

  function run(dir, args, expectations) {
    it('should run ['+args.join(',')+'] from '+dir, function(done) {
      done = once(done);
      process.chdir(dir);
      child = spawn(slr, args).on('error', done);

      child.stdout.on('data', data);
      child.stderr.on('data', data);

      function data(data) {
        debug('> ' + data)
        expectations = expectations.filter(function(expect) {
          return !expect.test(data);
        });
        if(expectations.length == 0) {
          return done();
        }
      }
    });
  }

  describe('loopback', function() {
    var EXPECT = [
      /LoopBack server listening/,
      /profiling/
    ];

    run('.', ['test/lb-app'], EXPECT);
    run('.', ['test/lb-app/.'], EXPECT);
    run('.', ['test/lb-app/app.js'], EXPECT);
    run('test/lb-app', [], EXPECT);
    run('test/lb-app', ['.'], EXPECT);
    run('test/lb-app', ['app.js'], EXPECT);
  });

  describe('express', function() {
    var EXPECT = [
      /express-app listening/
    ];

    run('.', ['test/express-app'], EXPECT);
    run('.', ['test/express-app/.'], EXPECT);
    run('.', ['test/express-app/server.js'], EXPECT);
    run('test/express-app', [], EXPECT);
    run('test/express-app', ['.'], EXPECT);
    run('test/express-app', ['server.js'], EXPECT);
  });

  describe('module', function() {
    var EXPECT = [
      /module-app listening/
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
      /argv:.*index.js.*cluster=10/
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
    var TS_SUPER = /^\d+-\d+-\d+T\d+:\d+:\d+.\d+Z pid:\d+ worker:supervisor .+/;
    var NO_TS_WORKER = /^pid:\d+ worker:\d+ .+/;
    var NO_TS_SUPER = /^pid:\d+ worker:supervisor .+/;

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
});
