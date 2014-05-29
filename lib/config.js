// Evaluate configuration of supervisor, based on command line options,
// strong-cluster-control configuration, and strong-agent configuration.

var cluster = require('cluster');
var control = require('strong-cluster-control');
var fs = require('fs');
var path = require('path');
var open = require('fs').openSync;
var transformer = require('strong-log-transformer');

if(cluster.isWorker) {
  module.exports = control.loadOptions();
  module.exports.profile = process.env.supervisor_profile != 'false';
  return;
}

var detach = require('./detach');
var options = require('./options').parse(process.argv);
var pidfile = require('./pidfile');
var LogWriter = require('./log-writer');
var generateLogName = require('./logname').generate;

if(options.help) {
  console.log(options.HELP, '\n');
  process.exit(0);
}

if(options.version) {
  console.log('v%s', require('../package.json').version);
  process.exit(0);
}

// Reset argv to include only the options for the runner before letting
// cluster-control look for its configuration (it examines process.argv).
process.argv = options.argv;
var config = control.loadOptions({
  cluster: process.env.NODE_ENV === 'production' ? 'CPUs' : undefined
});

// Reset argv so the runner options are not seen by app
process.argv = process.argv.slice(0, 2).concat(options.args);

// Communicate profile option to the worker using the environment, and master
// using config.
process.env.supervisor_profile = options.profile;
config.profile = options.profile;

// Communicate detach option to the master using config.
config.detach = options.detach;

var app = process.argv[2];
var dirname, basename;

try {
  var stat = fs.statSync(app);
} catch(er) {
  console.error('Invalid app (%s), try `%s --help`.\n', er, options.NAME);
  process.exit(1);
}

// We want to be in the directory of the file we are running, so we can pick up
// configuration stored in it's working directory.

if(stat.isFile()) {
  // The app is a file, we'll run it from its directory.
  process.chdir(path.dirname(app));
  app = path.basename(app);
}

if(stat.isDirectory()) {
  // The app is a directory (such as '.'), we'll look for what to run from it.
  process.chdir(app);

  // The canonical way to run is with `npm start`, but we can't do that for a
  // cluster worker, because the worker must start the runner (so it can require
  // strong-agent). Instead, we search for a runnable file, and if that fails,
  // just require the directory and let node do the right thing (which should be
  // to use package.main if it exists, index.js otherwise).
  function existing(file) {
    return fs.existsSync(file) ? file : null;
  }
  app = existing('server.js') || existing('app.js') || '.';
}

options.args[0] = app;
process.argv[2] = app;

cluster.setupMaster({
  // XXX(rmg): node 0.11.x broke compatibility with 0.10.x for when process.argv
  //           is read and loaded into cluster.settings, so we have to manually
  //           reset args, exec, and execArgv after our changes
  //           see https://github.com/joyent/node/pull/7682 for upstream fix.
  args: process.argv.slice(2),
  exec: process.argv[1],
  execArgv: process.execArgv,
  // All worker output is being processed as individual log streams, so we can't
  // just let the supervisor's stdout/stderr be inherited.
  silent: true,
});

config.start = function start() {
  var supervisorLogName = generateLogName(options.log,
                                          { id: 'supervisor',
                                            pid: process.pid });
  if(options.detach) {
    // Daemon shouldn't detach, runner does it.
    options.argv.forEach(function(v, i, a) {
      var substitute = {'-d':'--no-detach', '--detach':'--no-detach'};
      a[i] = substitute[v] || v;
    });
    try {
      process.env.supervisor_detached = true;
      var child = detach(options.argv.concat(options.args), supervisorLogName);
      console.error('supervisor %d detached process %d, output logged to \'%s\'',
        process.pid, child.pid, supervisorLogName);
      process.exit();  // XXX should not be necessary!
    } catch(er) {
      console.error('supervisor failed to start: %s', er);
      console.error('%s', er.stack);
      process.exit(1); // XXX should not be necessary!
    }
    return;
  }

  if (options.log && options.log !== '-') {
    // TODO: redirect supervisor log messages to supervisorLog
    // TODO: open supervisorLog much much earlier
    var supervisorLog = new LogWriter(process, options);
    var isPerWorker = /%/.test(options.log);
    cluster.on('fork', function(worker) {
      var tag = { pid: worker.process.pid, worker: worker.id };
      var logFile = isPerWorker
                  ? new LogWriter(worker, options)
                  : supervisorLog;
      var stdLog = transformer({ timeStamp: true, tag: tag, destination: logFile });
      var errLog = transformer({ timeStamp: true, tag: tag, destination: logFile, mergeLines: true });
      worker.process.stdout.pipe(stdLog);
      worker.process.stderr.pipe(errLog);
      worker.logFile = logFile;
    });
  }

  console.error('supervisor starting (pid %d)', process.pid);

  if(options.pid) {
    try {
      pidfile.create(options.pid);
    } catch(er) {
      console.error('supervisor failed to create pid file: %s', er.message);
      process.exit(1);
    }
  }

  // Re-require this so that strong-agent (which may be required by now)
  // notices, and attaches cluster control instrumentation.
  require('strong-cluster-control');

  control.on('start', function(addr) {
    console.error('supervisor listening on \'%s\'', addr);
  });
  control.on('setSize', function() {
    console.error('supervisor size set to', this.options.size);
  });
  control.on('resize', function() {
    console.error('supervisor resized to', this.options.size);
  });
  control.on('startWorker', function(w) {
    console.error('supervisor started worker %d (pid %d)', w.id, w.process.pid);
  });
  control.on('stopWorker', function(w) {
    console.error('supervisor stopped worker %d (pid %d)', w.id, w.process.pid);
  });
  control.on('stop', function(w) {
    console.error('supervisor stopped');
    process.exit(); // XXX should not be necessary!
  });
  cluster.on('exit', function(worker, code, signal) {
    var exit = worker.suicide ? 'expected' : 'accidental';
    console.error('supervisor worker id %s (pid %d) %s exit with %s',
                  worker.id, worker.process.pid, exit, signal || code
                 );
  });
  process.on('exit', function(code) {
    console.error('supervisor exiting with code %d', code);
  });
  process.on('SIGINT', function() {
    control.stop();
  });
  process.on('SIGTERM', function() {
    control.stop();
  });
  // If we don't have a terminal use SIGHUP to restart the workers
  if(process.env.supervisor_detached == 'true') {
    process.on('SIGHUP', function() {
      control.restart();
    });
  }
  return control.start(config);
};

module.exports = config;
