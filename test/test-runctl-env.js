var byline = require('byline');
var child = require('child_process');
var debug = require('debug')('runctl-test');
var helper = require('./helper');
var path = require('path');
var test = require('tap').test;

test('environment controls', function(t) {
  var app = path.resolve(__dirname, 'env-app');
  var run = supervise(app, ['SL_T1', 'SL_T2', 'SL_T3']);

  // supervisor should exit with 0 after we stop it
  run.on('exit', function(code, signal) {
    t.equal(code, 0);
    t.end();
  });

  t.test('initial', function(tt) {
    run.says(tt, /^SL_T1=undefined SL_T2=undefined SL_T3=undefined$/);
  });

  t.test('env-set single', function(tt) {
    run.ctl(tt, 'env-set', ['SL_T1=hereIam']);
    run.says(tt, /^SL_T1=hereIam SL_T2=undefined SL_T3=undefined$/);
  });

  t.test('env-set multiple', function(tt) {
    run.ctl(tt, 'env-set', ['SL_T1=newVal', 'SL_T2=2ndVal', 'SL_T3=three']);
    run.says(tt, /^SL_T1=newVal SL_T2=2ndVal SL_T3=three$/);
  });

  t.test('env-unset single', function(tt) {
    run.ctl(tt, 'env-unset', ['SL_T1']);
    run.says(tt, /^SL_T1=undefined SL_T2=2ndVal SL_T3=three$/);
  });

  t.test('env-unset multiple', function(tt) {
    run.ctl(tt, 'env-unset', ['SL_T2', 'SL_T3']);
    run.says(tt, /^SL_T1=undefined SL_T2=undefined SL_T3=undefined$/);
  });

  t.test('env-get default', function(tt) {
    run.ctl(tt, 'env-get', [], function(err, stdout, stderr) {
      tt.ifError(err, 'env-get should not fail');
      tt.assert(!/SL_T1/.test(stdout), 'Should not contain unset variables');
      tt.assert(/PATH=/.test(stdout), 'Should contain known variables');
      tt.end();
    });
  });

  t.test('env-get master', function(tt) {
    run.ctl(tt, 'env-get', [0], function(err, stdout, stderr) {
      tt.ifError(err, 'env-get should not fail');
      tt.assert(!/ENV_TEST_APP/.test(stdout), 'Worker-only variable missing');
      tt.end();
    });
  });

  t.test('env-get worker', function(tt) {
    run.ctl(tt, 'env-get', [1], function(err, stdout, stderr) {
      tt.ifError(err, 'env-get should not fail');
      tt.assert(/ENV_TEST_APP=/.test(stdout), 'Worker-only variable present');
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
  var appAndArgs = [app].concat(vars);
  var args = ['--control', ctl, '--cluster=1'].concat(cleanLogArgs);
  try {
    fs.unlinkSync(ctl);
  } catch (er) {
    console.log('no `%s` to cleanup: %s', ctl, er);
  }

  console.log('# supervise %s with %j', run, args);

  var c = child.fork(run, args.concat(appAndArgs), {silent: true});

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
      t.ifError(err, ['sl-runctl', cmd].concat(cmdArgs).join(' '));
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
