var fs = require('fs');
var byline = require('byline');
var child = require('child_process');
var debug = require('debug')('runctl-test');
var helper = require('./helper');
var client = require('strong-control-channel/client');
var path = require('path');
var test = require('tap').test;
var net = require('net');

test('debugger controls', function(t) {
  var app = path.resolve(__dirname, 'module-app');
  var run = supervise(app);

  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.test('wait for app start', function(tt) {
    run.says(tt, /^argv/);
  });

  t.test('query initial status', function(tt) {
    run.ctl(tt, 'dbg-status', 1, function(err, stdout, stderr) {
      tt.ifError(err, 'dbg-status should not fail');
      tt.match(stdout, 'Debugger is disabled.');
      tt.end();
    });
  });

  var port;
  t.test('send dbg-start', function(tt) {
    var LISTENING_PATTERN = /Debugger listening on port (\d+)/;
    run.ctl(tt, 'dbg-start', 1, function(err, stdout, stderr) {
      tt.ifError(err, 'dbg-start should not fail');
      tt.match(stdout, LISTENING_PATTERN, 'stdout should include port');
      var m = stdout.match(LISTENING_PATTERN);
      port = m && +m[1];
      tt.end();
    });
  });

  t.test('query status when started', function(tt) {
    run.ctl(tt, 'dbg-status', 1, function(err, stdout, stderr) {
      tt.ifError(err, 'dbg-status should not fail');
      tt.match(stdout, 'Debugger listening on port ' + port);
      tt.end();
    });
  });

  t.test('connect to the debugger when started', function(tt) {
    if (!port) {
      tt.fail('this test requires a successfull dbg-start');
      return tt.end();
    }

    var conn = net.connect(port);
    conn.once('error', function(err) {
      tt.threw(err);
    });
    conn.once('connect', function() {
      tt.pass('can connect to the debugger');
      conn.end();
      tt.end();
    });
  });

  t.test('stop', function(tt) {
    run.ctl(tt, 'dbg-stop', 1, function(err, stdout, stderr) {
      tt.ifError(err, 'dbg-stop should not fail');
      tt.end();
    });
  });

  t.test('query status when stopped', function(tt) {
    run.ctl(tt, 'dbg-status', 1, function(err, stdout, stderr) {
      tt.ifError(err, 'dbg-status should not fail');
      tt.match(stdout, 'Debugger is disabled.');
      tt.end();
    });
  });

  t.test('connect to the debugger when stopped', function(tt) {
    if (!port) {
      tt.fail('this test requires a successfull dbg-start');
      return tt.end();
    }

    var conn = net.connect(port);
    conn.once('error', function(err) {
      if (err.code === 'ECONNREFUSED') {
        tt.pass('cannot connect to the debugger');
        tt.end();
      } else {
        tt.threw(err);
      }
    });
    conn.once('connect', function() {
      tt.fail('connect should fail now');
      tt.end();
      conn.end();
    });
  });

  t.test('dbg-start master', function(tt) {
    run.ctl(tt, 'dbg-start', 0, function(err, stdout, stderr) {
      tt.match(stderr, /Cannot debug.*supervisor/);
      tt.end();
    });
  });

  t.test('dbg-stop master', function(tt) {
    run.ctl(tt, 'dbg-stop', 0, function(err, stdout, stderr) {
      tt.match(stderr, /Cannot debug.*supervisor/);
      tt.end();
    });
  });

  t.test('dbg-status master', function(tt) {
    run.ctl(tt, 'dbg-status', 0, function(err, stdout, stderr) {
      tt.match(stderr, /Cannot debug.*supervisor/);
      tt.end();
    });
  });

  t.test('exit', function(tt) {
    run.ctl(tt, 'stop', [], function() {
      tt.end();
    });
  });
});

// run supervisor
function supervise(app, vars) {
  var run = require.resolve('../bin/sl-run');
  var ctl = path.join(app, '..', 'runctl');
  var cleanLogArgs = [
    '--no-timestamp-workers',
    '--no-timestamp-supervisor',
    '--no-log-decoration',
  ];
  var args = ['--control', ctl, '--cluster=1'].concat(cleanLogArgs);
  try {
    fs.unlinkSync(ctl);
  } catch (er) {
    console.log('no `%s` to cleanup: %s', ctl, er);
  }

  console.log('# supervise %s with %j', run, args);

  var c = child.fork(run, args.concat([app]), {silent: true});

  // don't let it live longer than us!
  // XXX(sam) once sl-runctl et. al. self-exit on loss of parent, we
  // won't need this, but until then...
  process.on('exit', c.kill.bind(c));
  function die() {
    c.kill();
    process.kill(process.pid, 'SIGTERM');
  }
  process.once('SIGTERM', die);
  process.once('SIGINT', die);

  c.ctl = runctl;
  c.says = says;

  return c;

  function runctl(t, cmd, cmdArgs, callback) {
    var runctljs = require.resolve('../bin/sl-runctl');
    var args = [runctljs, '--control', ctl, cmd].concat(cmdArgs);
    child.execFile(process.execPath, args, function(err, stdout, stderr) {
      debug('# runctl %s %j: ', cmd, args, err, stdout, stderr);
      if (callback) {
        callback.apply(this, arguments);
      }
    });
  }

  function says(t, pat) {
    var watcher = byline.createStream();
    var found = false;
    debug('# watching for: ', pat);
    watcher.on('data', function(line) {
      if (!found && pat.test(line)) {
        found = true;
        c.stdout.unpipe(watcher);
      } else {
        debug('# > %s', line);
      }
    });
    watcher.on('unpipe', function() {
      t.ok(found, 'saw '+ pat);
      debug('# unpiped!');
      t.end();
    });
    c.stdout.pipe(watcher);
  }
}
