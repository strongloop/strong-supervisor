// XXX(sam) I feel a bit bad about not using an options parsing module, but I
// was going in circles searching npmjs.org for one which would parse options in
// order up to the first non-option (as getopt_long could do), and failing. I'll
// keep looking, but in the meantime, this works fine.
var defaults = require('strong-url-defaults');
var fs = require('fs');
var os = require('os');
var syslogAvailable = false;
var url = require('url');

try {
  syslogAvailable = !!require('strong-fork-syslog');
} catch (e) {
  /* eslint no-empty:0 */
}

exports.NAME = process.env.SLC_COMMAND ?
  'slc ' + process.env.SLC_COMMAND :
  'slr';
exports.HELP = fs.readFileSync(require.resolve('../bin/sl-run.txt'), 'utf-8')
  .replace(/%MAIN%/g, exports.NAME)
  .trim();

// Parse argv into options (for runner), and split off the args (for the app).
exports.parse = function parse(argv) {
  var options = {
    NAME: exports.NAME,
    HELP: exports.HELP,
    argv: argv,         // process.argv stripped of command...
    args: ['.'],        // app app-options...
    enableTracing: false,
    profile: process.env.STRONGLOOP_METRICS ? true : undefined,
    channel: process.env.STRONGLOOP_CONTROL || 'runctl',
    log: false,
    metrics: null,
    timeStampWorkerLogs: true,
    timeStampSupervisorLogs: true,
    logDecoration: true,
    syslog: false,
  };
  // cluster_size is for compatibility with strong-cluster-control@1.x
  var cluster = 'STRONGLOOP_CLUSTER' in process.env ?
    process.env.STRONGLOOP_CLUSTER : process.env.cluster_size;
  if (cluster == null || cluster === '') {
    cluster = process.env.NODE_ENV === 'production' ? 'CPU' : 'off';
  }
  for (var i = 2; i < argv.length; i++) {
    var option = argv[i];
    if (option === '-h') {
      options.help = true;

    } else if (option === '--help') {
      options.help = true;

    } else if (option === '-v') {
      options.version = true;

    } else if (option === '--version') {
      options.version = true;

    } else if (option === '--detach') {
      options.detach = true;

    } else if (option === '-d') {
      options.detach = true;

    } else if (option === '--no-detach') {
      options.detach = false;

    } else if (option === '--log' || option === '-l') {
      i++;
      options.log = argv[i];

    } else if (/^--log=/.test(option)) {
      options.log = value(option, options.log);

    } else if (option === '--syslog') {
      options.syslog = syslogAvailable;

    } else if (option === '--metrics' || option === '-m') {
      i++;
      options.metrics = options.metrics || [];
      options.metrics.push(argv[i]);
      options.profile = true;

    } else if (/^--metrics=/.test(option)) {
      options.metrics = options.metrics || [];
      options.metrics.push(value(option));
      options.profile = true;

    } else if (option === '--pid' || option === '-p') {
      i++;
      options.pid = argv[i];

    } else if (/^--pid=/.test(option)) {
      options.pid = value(option, options.pid);

    } else if (option === '--profile') {
      options.profile = true;

    } else if (option === '--no-profile') {
      options.profile = false;
      options.metrics = null;
      delete process.env.STRONGLOOP_METRICS;

    } else if (option === '--trace') {
      options.enableTracing = true;

    } else if (option === '--cluster') {
      i++;
      cluster = argv[i];

    } else if (/^--cluster=/.test(option)) {
      cluster = value(argv[i], cluster);

    } else if (option === '--no-cluster') {
      cluster = 'off';

    // Only -C,--control,--no-control are documented, now, to align with
    // strong-pm. The others are legacy, to be deleted sometime.
    } else if (/^--(control|port|addr|path)$/.test(option)) {
      i++;
      options.channel = argv[i];

    } else if (option === '-C') {
      i++;
      options.channel = argv[i];

    } else if (/^--(control|port|addr|path)=/.test(option)) {
      options.channel = value(option, options.channel);

    } else if (option === '--no-control') {
      options.channel = false;

    } else if (option === '--no-channel') {
      options.channel = false;

    } else if (option === '--no-timestamp-workers') {
      options.timeStampWorkerLogs = false;

    } else if (option === '--no-timestamp-supervisor') {
      options.timeStampSupervisorLogs = false;

    } else if (option === '--no-log-decoration') {
      options.logDecoration = false;

    } else {
      options.argv = argv.slice(0, i);
      options.args = argv.slice(i);
      break;
    }
  }

  if (options.syslog) {
    options.timeStampSupervisorLogs = false;
    options.timeStampWorkerLogs = false;
  }

  if (options.log === false && options.detach === true) {
    options.log = 'supervisor.log';
  }

  if (options.metrics) {
    options.metrics = JSON.stringify(options.metrics);
  }

  options.cluster = {
    isWorker: false,
    isMaster: true,
  };

  if (/cpu|on/i.test(cluster)) {
    // --cluster=on, --cluster=cpu, --cluster=CPUs
    options.cluster.size = os.cpus().length;
    options.cluster.clustered = 'master';
  } else if (/^-?[0-9]+$/.test(cluster)) {
    // --cluster=[-]N, N is 0, 1, ...
    options.cluster.size = +cluster;
    options.cluster.clustered = 'master';
  } else {
    // (no options), --no-cluster, --cluster=off
    options.cluster.size = undefined;
    options.cluster.clustered = false;
  }

  if (options.channel && url.parse(options.channel).protocol) {
    options.channel = defaults(options.channel, {
      path: 'supervisor-control'
    }, {
      protocol: 'ws'
    });
    process.env.STRONGLOOP_CONTROL = options.channel;
    options.channel = false;
  } else {
    delete process.env.STRONGLOOP_CONTROL;
  }

  return options;
};

function value(option, def) {
  // '--pid=' is the same as option not present
  var opt = /^--[^=]+=(.*)/.exec(option)[1];
  if (opt !== '') {
    return opt;
  }
  return def;
}
