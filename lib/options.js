// XXX(sam) I feel a bit bad about not using an options parsing module, but I
// was going in circles searching npmjs.org for one which would parse options in
// order up to the first non-option (as getopt_long could do), and failing. I'll
// keep looking, but in the meantime, this works fine.
var fs = require('fs');
var metrics = require('./metrics');
var syslogAvailable = false;

try { syslogAvailable = !! require('strong-fork-syslog'); } catch (e) { }

exports.NAME = process.env.SLC_COMMAND ?
  'slc ' + process.env.SLC_COMMAND :
  'slr';
exports.HELP = fs.readFileSync(require.resolve('../bin/sl-run.txt'), 'utf-8')
  .replace(/%MAIN%/g, exports.NAME)
  .trim()
  ;

// Parse argv into options (for runner), and split off the args (for the app).
exports.parse = function parse(argv) {
  var options = {
    NAME: exports.NAME,
    HELP: exports.HELP,
    argv: argv,         // process.argv stripped of command...
    args: [ '.' ],      // app app-options...
    profile: true,
    channel: 'runctl',
    log: false,
    metrics: null,
    timeStampWorkerLogs: true,
    timeStampSupervisorLogs: true,
    syslog: false,
  };
  for(var i = 2; i < argv.length; i++) {
    var option = argv[i];
    if(option === '-h') {
      options.help = true;
    }
    else if(option === '--help') {
      options.help = true;
    }
    else if(option === '-v') {
      options.version = true;
    }
    else if(option === '--version') {
      options.version = true;
    }
    else if(option === '--detach') {
      options.detach = true;
    }
    else if(option === '-d') {
      options.detach = true;
    }
    else if(option === '--no-detach') {
      options.detach = false;
    }
    else if(option === '--log' || option === '-l') {
      i++;
      options.log = argv[i];
    }
    else if(/^--log=/.test(option)) {
      // '--log=' is the same as option not present
      (function() {
        var arg = /^--log=(.*)/.exec(option)[1];
        if(arg != '') {
          options.log = arg;
        }
      })();
    }
    else if(option === '--syslog') {
      options.syslog = syslogAvailable;
    }
    else if(option === '--metrics' || option === '-m') {
      i++;
      options.metrics = options.metrics || []
      options.metrics.push(argv[i]);
    }
    else if(/^--metrics=/.test(option)) {
      // '--metrics=' is the same as option not present
      (function() {
        var arg = /^--metrics=(.*)/.exec(option)[1];
        if(arg != '') {
          options.metrics = options.metrics || []
          options.metrics.push(arg);
        }
      })();
    }
    else if(option === '--pid' || option === '-p') {
      i++;
      options.pid = argv[i];
    }
    else if(/^--pid=/.test(option)) {
      // '--pid=' is the same as option not present
      (function() {
        var file = /^--pid=(.*)/.exec(option)[1];
        if(file != '') {
          options.pid = file;
        }
      })();
    }
    else if(option === '--profile') {
      options.profile = true;
    }
    else if(option === '--no-profile') {
      options.profile = false;
    }
    else if(option === '--no-channel') {
      options.channel = false;
    }
    else if({'--cluster':1,'--port':1,'--addr':1,'--path':1}[option]) {
      i++; // Consume the option's argument
    }
    else if(/^--(cluster|port|addr|path)=/.test(option)) {
    }
    else if(option === '--no-cluster') {
    }
    else if (option === '--no-timestamp-workers') {
      options.timeStampWorkerLogs = false;
    }
    else if (option === '--no-timestamp-supervisor') {
      options.timeStampSupervisorLogs = false;
    }
    else {
      options.argv = argv.slice(0,i);
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

  return options;
}
