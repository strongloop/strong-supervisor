// Evaluate configuration of supervisor, based on command line options,
// strong-cluster-control configuration, and strong-agent configuration.

var cluster = require('cluster');
var control = require('strong-cluster-control');
var fs = require('fs');
var path = require('path');

if(cluster.isWorker) {
  module.exports = control.loadOptions();
  return;
}

var options = require('./options').parse(process.argv);

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
  size: 1
});

// Reset argv so the runner options are not seen by app
process.argv = process.argv.slice(0, 2).concat(options.args);

var app = process.argv[2];
var dirname, basename;

try {
  var stat = fs.statSync(app);
} catch(er) {
  console.error('Invalid app (%s), see `slr --help`.\n', er);
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

process.argv[2] = app;

config.start = function start(options) {
  control.on('start', function(addr) {
    console.error('supervisor control listening on ', addr);
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
  });
  cluster.on('exit', function(worker, code, signal) {
    var exit = worker.suicide ? 'expected' : 'accidental';
    console.error('supervisor worker id %s (pid %d) %s exit with %s',
                  worker.id, worker.process.pid, exit, signal || code
                 );
  });
  return control.start(options);
};

module.exports = config;
