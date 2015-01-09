// Evaluate configuration of supervisor, based on command line options,
// strong-cluster-control configuration, and strong-agent configuration.

var runctl = require('./runctl');
var chdir = require('./chdir');
var cluster = require('cluster');
var control = require('strong-cluster-control');
var debug = require('./debug')('config');
var dotenv = require('dotenv');
var fs = require('fs');
var open = require('fs').openSync;
var path = require('path');
var sendMetrics = require('./metrics');
var transformer = require('strong-log-transformer');
var util = require('util');
var Logger = require('./logger');

var logger = new Logger(process.stderr);

// Attach targeted control listener to cluster, for both master and workers.
require('./targetctl');

if (cluster.isWorker) {
  module.exports = {
    isWorker: true,
    isMaster: false,
    clustered: 'worker',
    logger: logger,
    profile: process.env.supervisor_profile != 'false',
    sendMetrics: sendMetrics,
  };
  return;
}

var detach = require('./detach');
var options = require('./options').parse(process.argv);
var pidfile = require('./pidfile');
var LogWriter = require('./log-writer');
var generateLogName = require('./expander').expand;
var SysLogStream = options.syslog && require('./syslog-stream');

if (options.help) {
  console.log(options.HELP);
  process.exit(0);
}

if (options.version) {
  console.log('v%s (%s, %s)',
    V('..'), F('strong-agent'), F('strong-cluster-control'));

  function P(package) {
    return require(path.join(package, 'package.json'));
  }
  function V(package) {
    return P(package).version;
  }
  function N(package) {
    return P(package).name;
  }
  function F(package) {
    return util.format('%s v%s', N(package), V(package));
  }

  process.exit(0);
}

var config = options.cluster;

// Allow module consumers to use our logger
config.logger = logger;

// Reset argv so the runner options are not seen by app
process.argv = process.argv.slice(0, 2).concat(options.args);

// Communicate profile option to the worker using the environment, and master
// using config.
process.env.supervisor_profile = options.profile;
config.profile = options.profile;

// Communicate detach option to the master using config.
config.detach = options.detach;

var app = process.argv[2];
var appRoot;

try {
  var stat = fs.statSync(app);
} catch (er) {
  try {
    app = require.resolve(path.resolve(app));
    stat = fs.statSync(app);
  } catch (er) {
    console.error('Invalid app (%s), try `%s --help`.\n', er, options.NAME);
    process.exit(1);
  }
}

// We want to be in the directory of the file we are running, so we can pick up
// configuration stored in it's working directory.

if (stat.isFile()) {
  // The app is a file, we'll run it from its module's root directory.
  app = path.resolve(app);
  appRoot = path.dirname(app);
  app = path.basename(app);
  // walk up the path until we find the package.json nearest to the app
  while (!fs.existsSync(path.join(appRoot, 'package.json'))) {
    app = path.join(path.basename(appRoot), app);
    // hit root, fallback to running as-is
    if (appRoot === path.dirname(appRoot)) {
      app = path.basename(process.argv[2]);
      appRoot = path.dirname(process.argv[2]);
      break;
    }
    appRoot = path.dirname(appRoot);
  }
  chdir(appRoot);
}

if (stat.isDirectory()) {
  // The app is a directory (such as '.'), we'll look for what to run from it.
  chdir(app);

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

// Load the app's .env after we are in its working directory, and before
// cluster.setupMaster() snapshots the environment.
dotenv.load();

// Set the metrics URL in the environment after .env is loaded, so that the
// CLI options override environment.
if (options.metrics) {
  process.env.STRONGLOOP_METRICS = options.metrics;
}

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
  silent: true
});

var supervisorLog = process.stdout;
// If the logname doesn't change with input, the logs aren't per-worker
var isPerWorker = (generateLogName(options.log, {pid: 1, id: 1}) !==
                    generateLogName(options.log, {pid: 2, id: 2}));

if (options.syslog) {
  var errorLogger = new SysLogStream({level: 'CRIT'});
  var stdLogger = new SysLogStream({level: 'NOTICE'});
  supervisorLog = stdLogger;
  console.error('supervisor (%d) logging to syslog', process.pid);
} else if (!options.syslog && options.log && options.log !== '-') {
  supervisorLog = new LogWriter(process, options);
  console.error('supervisor (%d) logging to \'%s\'',
                process.pid, supervisorLog.name);
}

// In the recommended mode where worker logs are piped through the
// supervisor's stdout, each worker adds 6 listeners (3 per output stream)
// for piping alone. The default is 10.
supervisorLog.setMaxListeners(0);

if (config.clustered) {
  logger.sink = transformer({ tag: { pid: process.pid, worker: 0 },
                              timeStamp: options.timeStampSupervisorLogs });
  logger.sink.pipe(supervisorLog);
}

config.start = function start() {
  config.setupChildLogger = setupChildLogger;

  if (options.detach) {
    // Daemon shouldn't detach, runner does it.
    options.argv.forEach(function(v, i, a) {
      var substitute = {'-d': '--no-detach', '--detach': '--no-detach'};
      a[i] = substitute[v] || v;
    });
    try {
      var supervisorLogName = generateLogName(options.log,
                                              { id: 0,
                                                pid: process.pid });
      process.env.supervisor_detached = true;
      var child = detach(options.argv.concat(options.args), supervisorLogName);
      console.error('supervisor %d detached process %d, output logged to \'%s\'',
        process.pid, child.pid, supervisorLogName);
      process.exit();  // XXX should not be necessary!
    } catch (er) {
      console.error('supervisor failed to start: %s', er);
      console.error('%s', er.stack);
      process.exit(1); // XXX should not be necessary!
    }
    return;
  }

  cluster.on('fork', setupChildLogger);

  logger.info('supervisor starting (pid %d)', process.pid);

  if (options.pid) {
    try {
      pidfile.create(options.pid);
    } catch (er) {
      console.error('supervisor failed to create pid file: %s', er.message);
      process.exit(1);
    }
  }

  // Re-require this so that strong-agent (which may be required by now)
  // notices, and attaches cluster control instrumentation.
  require('strong-cluster-control');

  control.on('start', function() {
    if (!options.channel) return;

    logger.info('supervisor listening on \'%s\'', options.channel);

    runctl.start({
      channel: options.channel,
      logger: logger,
    });
  });
  control.on('setSize', function() {
    logger.info('supervisor size set to', this.options.size);
  });
  control.on('resize', function() {
    logger.info('supervisor resized to', this.options.size);
  });
  control.on('startWorker', function(w) {
    logger.info('supervisor started worker %d (pid %d)', w.id, w.process.pid);
  });
  control.on('stopWorker', function(w) {
    logger.info('supervisor stopped worker %d (pid %d)', w.id, w.process.pid);
  });
  control.on('stop', function(w) {
    logger.info('supervisor stopped');
    process.exit(); // XXX should not be necessary!
  });
  cluster.on('exit', function(worker, code, signal) {
    var exit = worker.suicide ? 'expected' : 'accidental';
    logger.error('supervisor worker id %s (pid %d) %s exit with %s',
                  worker.id, worker.process.pid, exit, signal || code
                 );
  });

  var lastSignal = null;
  process.on('exit', function(code) {
    if (code === 0 && lastSignal) {
      process.kill(process.pid, lastSignal);
      return;
    }
    logger.error('supervisor exiting with code %d', code);
  });

  process.once('SIGINT', function() {
    logger.warn('received SIGINT, shutting down');
    lastSignal = 'SIGINT';
    control.stop();
  });
  process.once('SIGTERM', function() {
    logger.warn('received SIGTERM, shutting down');
    lastSignal = 'SIGTERM';
    control.stop();
  });
  process.on('SIGHUP', function() {
    logger.warn('received SIGHUP, restarting workers');
    try {
      chdir(process.env.PWD);
    } catch (er) {
      logger.error('failed to chdir to \'%s\': %s', process.env.PWD, er);
    }
    control.restart();
  });

  if (supervisorLog !== process.stdout) {
    process.on('SIGUSR2', function() {
      logger.warn('received SIGUSR2, re-opening log files');
      supervisorLog.reOpen();
      for (var id in cluster.workers) {
        if (cluster.workers[id].logFile !== supervisorLog) {
          cluster.workers[id].logFile.reOpen();
        }
      }
      logger.info('log files reopened');
    });
  }

  this.sendMetrics(runctl.parentCtl, function(statsd) {
    // Wait until metrics has started before starting cluster control, because
    // the workers need to know what ephemeral port the statsd server is
    // listening on in order to send it metrics.
    debug('cluster-control size: %j', config.size);
    if (config.size < 0) {
      // Fork this number of workers... but don't restart them. Mostly used
      // as `-1` by arc.
      for (var size = 0; size > config.size; size--) {
        cluster.fork();
      }
      delete config.size;
    }
    control.start({ size: config.size });
  });

  function setupChildLogger(worker) {
    var tag = { pid: worker.process.pid, worker: worker.id };
    var logStream = isPerWorker
                  ? new LogWriter(worker, options)  // cleaned up by pipe()
                  : supervisorLog;                  // cleaned up by exit()
    var outLog = transformer({ timeStamp: options.timeStampWorkerLogs,
                               tag: tag });
    var errLog = transformer({ timeStamp: options.timeStampWorkerLogs,
                               tag: tag,
                               mergeLines: true });
    // When we have per-worker logs, each worker gets their own LogWriter, which
    // gets cleaned up when the stream piped into it emits 'end'.
    // When we don't have per-worker logs, we need to suppress the propagation
    // of 'end' from the pipe so we don't close the supervisor's log the first
    // time a worker exits.
    worker.process.stdout.pipe(outLog)
                         .pipe(stdLogger || logStream, {end: isPerWorker});
    worker.process.stderr.pipe(errLog)
                         .pipe(errorLogger || logStream, {end: isPerWorker});
    worker.logFile = logStream;
  }
};

config.sendMetrics = sendMetrics;

module.exports = config;
