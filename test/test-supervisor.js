// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var fs = require('fs');
var spawn = require('child_process').spawn;
var tap = require('tap');

var slr = require.resolve('../bin/sl-run');
var cwd = process.cwd();

function once(fn) {
  return function() {
    if (fn) {
      fn.apply(null, arguments);
      fn = null;
    }
  };
}

tap.test('supervisor', function(t) {
  var child;

  function afterEach(done) {
    process.chdir(cwd);
    if (!child || child.exitCode != null || child.signalCode) {
      return done();
    }
    child.on('exit', function() {
      done();
    }).kill('SIGKILL');
  }

  function runSlr(dir, args, expectations, done) {
    done = once(done);
    process.chdir(dir);
    child = spawn(slr, args).on('error', done);

    child.stdout.on('data', data);
    child.stderr.on('data', data);

    return child;

    function data(data) {
      debug('> ' + data);
      expectations = expectations.filter(function(expect) {
        return !expect.test(data);
      });
      if (expectations.length === 0) {
        return done();
      }
    }
  }

  function run(t, dir, args, expectations) {
    t.test('should run [' + args.join(',') + '] from ' + dir, function(t) {
      runSlr(dir, args, expectations, function() {
        afterEach(t.end);
      });
    });
  }

  t.test('loopback', function(t) {
    var EXPECT = [
      /LoopBack server listening/,
      /profiling/
    ];

    run(t, '.', ['test/lb-app'], EXPECT);
    run(t, '.', ['test/lb-app/.'], EXPECT);
    run(t, '.', ['test/lb-app/app'], EXPECT);
    run(t, '.', ['test/lb-app/app.js'], EXPECT);
    run(t, 'test/lb-app', [], EXPECT);
    run(t, 'test/lb-app', ['.'], EXPECT);
    run(t, 'test/lb-app', ['app'], EXPECT);
    run(t, 'test/lb-app', ['app.js'], EXPECT);

    t.end();
  });

  t.test('express', function(t) {
    var EXPECT = [
      /express-app listening/
    ];

    run(t, '.', ['test/express-app'], EXPECT);
    run(t, '.', ['test/express-app/.'], EXPECT);
    run(t, '.', ['test/express-app/server'], EXPECT);
    run(t, '.', ['test/express-app/server.js'], EXPECT);
    run(t, 'test', ['express-app/server'], EXPECT);
    run(t, 'test/express-app', [], EXPECT);
    run(t, 'test/express-app', ['.'], EXPECT);
    run(t, 'test/express-app', ['server'], EXPECT);
    run(t, 'test/express-app', ['server.js'], EXPECT);

    t.end();
  });

  t.test('module', function(t) {
    var EXPECT = [
      /module-app listening/,
      /VAR=.this var./,
    ];

    run(t, '.', ['test/module-app'], EXPECT);
    run(t, '.', ['test/module-app/.'], EXPECT);
    run(t, '.', ['test/module-app/index.js'], EXPECT);
    run(t, 'test/module-app', [], EXPECT);
    run(t, 'test/module-app', ['.'], EXPECT);
    run(t, 'test/module-app', ['index.js'], EXPECT);

    t.end();
  });

  t.test('argument processing', function(t) {
    var EXPECT = [
      /module-app listening/,
      /argv 1:.*index.js/,
      /argv 2: --cluster=10/,
    ];

    run(t, '.', ['--no-cluster', 'test/module-app/index.js', '--cluster=10'],
        [ /Invalid cluster option: no/ ]);
    run(t, '.',
        [ '--cluster', 'off', 'test/module-app/index.js', '--cluster=10' ],
        [ /Invalid cluster option: off/ ]);
    run(t, '.', ['--cluster', '1', 'test/module-app/index.js', '--cluster=10'],
        EXPECT);

    run(t, '.', ['--help', 'help-option'], [/usage: slr/]);
    run(t, '.', ['-h', 'h-option'], [/usage: slr/]);

    var VERSION = RegExp('v' + require('../package.json').version);

    run(t, '.', ['--version', 'version-option'], [VERSION]);
    run(t, '.', ['-v', 'v-option'], [VERSION]);

    t.end();
  });

  t.test('timestamping', function(t) {
    var TS_WORKER = /^\d+-\d+-\d+T\d+:\d+:\d+.\d+Z pid:\d+ worker:\d+ .+/;
    var TS_SUPER = /^\d+-\d+-\d+T\d+:\d+:\d+.\d+Z pid:\d+ worker:0 .+/;
    var NO_TS_WORKER = /^pid:\d+ worker:\d+ .+/;
    var NO_TS_SUPER = /^pid:\d+ worker:0 .+/;

    t.test('worker logs', function(t) {
      var EXPECT_TIMESTAMPS = [ TS_WORKER, TS_SUPER ];
      var EXPECT_NO_TIMESTAMPS = [ NO_TS_WORKER, TS_SUPER ];

      run(t, '.', ['--cluster', '1', 'test/yes-app'], EXPECT_TIMESTAMPS);
      run(t, '.', ['--cluster', '1', '--no-timestamp-workers', 'test/yes-app'],
          EXPECT_NO_TIMESTAMPS);

      t.end();
    });

    t.test('supervisor logs', function(t) {
      var EXPECT_TIMESTAMPS = [ TS_WORKER, TS_SUPER ];
      var EXPECT_NO_TIMESTAMPS = [ TS_WORKER, NO_TS_SUPER ];

      run(t, '.', ['--cluster', '1', 'test/yes-app'], EXPECT_TIMESTAMPS);
      run(t, '.',
          ['--cluster', '1', '--no-timestamp-supervisor', 'test/yes-app'],
          EXPECT_NO_TIMESTAMPS);

      t.end();
    });

    t.end();
  });

  t.test('log decoration', function(t) {
    var TAGS_WORKER = /^pid:\d+ worker:1 .+/;
    var TAGS_SUPER = /^pid:\d+ worker:0 .+/;
    var NO_TAGS = /^yes/;

    t.test('tag logs', function(t) {
      var EXPECT_TAGS = [ TAGS_WORKER, TAGS_SUPER ];
      var EXPECT_NO_TAGS = [ NO_TAGS, NO_TAGS ];

      run(t, '.', ['--cluster', '1',
                '--no-timestamp-supervisor', '--no-timestamp-workers',
                'test/yes-app'],
          EXPECT_TAGS);
      run(t, '.', ['--cluster', '1',
                '--no-timestamp-supervisor', '--no-timestamp-workers',
                '--no-log-decoration',
                'test/yes-app'],
          EXPECT_NO_TAGS);

      t.end();
    });

    t.end();
  });

  t.test('SIGHUP of supervisor', function(t) {
    t.test('should chdir into PWD before restarting', function(t) {
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
        } catch (er) {
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

      function done() {
        afterEach(t.end);
      }
    });

    t.end();
  });

  t.test('chdir behaviour', function(t) {
    var EXPECT = [
      /deep-app listening/,
      /argv 1:.*path\/to\/deep.js/,
    ];

    run(t, '.', ['test/module-app/path/to/deep.js'], EXPECT);

    t.end();
  });

  t.end();
});
