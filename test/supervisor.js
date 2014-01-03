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

  this.afterEach(function(done) {
    process.chdir(cwd);
    if(!child || child.exitCode || child.signalCode) {
      return done();
    }
    child.on('exit', done).kill('SIGKILL');
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
});
