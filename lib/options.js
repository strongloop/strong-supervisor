// XXX(sam) I feel a bit bad about not using an options parsing module, but I
// was going in circles searching npmjs.org for one which would parse options in
// order up to the first non-option (as getopt_long could do), and failing. I'll
// keep looking, but in the meantime, this works fine.
var x = require('util').format;
exports.NAME = process.env.SLC_COMMAND ?
  'slc ' + process.env.SLC_COMMAND :
  'slr';
exports.HELP = [
  x('usage: %s [options] [app [app-options...]]', exports.NAME),
  '',
  'Run an app, allowing it to be profiled (using StrongOps) and supervised.',
  '',
  '`app` can be a node file to run or a package directory. The default',
  'value is ".", the current working directory. Packages will be run by',
  'requiring the first that is found of:',
  '  1. server.js',
  '  2. app.js',
  '  3. `main` property of package.json',
  '  4. index.js',
  '',
  'Runner options:',
  '  -h,--help          Print this message and exit.',
  '  -v,--version       Print runner version and exit.',
  '  -d,--detach        Detach master from terminal to run as a daemon (default',
  '                     is to not detach).',
  '  -l,--log FILE      When detaching, redirect terminal output to FILE, in',
  '                     the app\'s working directory if FILE path is not',
  '                     absolute (default is supervisor.log)',
  '  -p,--pid FILE      Write supervisor\'s pid to FILE, failing if FILE',
  '                     already has a valid pid in it (default is not to)',
  '  --cluster N        Set the cluster size (default is off, but see below).',
  '  --no-profile       Do not profile with StrongOps (default is to profile',
  '                     if registration data is found).',
  '',
  'Cluster size N is one of:',
  '  - A number of workers to run',
  '  - A string containing "cpu" to run a worker per CPU',
  '  - The string "off" to run unclustered, in which case the app',
  '    will *NOT* be supervisable or controllable, but will be monitored.',
  '',
  'Clustering defaults to off unless NODE_ENV is production, in which case it',
  'defaults to CPUs.'
].join('\n');

// Parse argv into options (for runner), and split off the args (for the app).
exports.parse = function parse(argv) {
  var options = {
    NAME: exports.NAME,
    HELP: exports.HELP,
    argv: argv,         // process.argv stripped of command...
    args: [ '.' ],      // app app-options...
    profile: true,
    log: 'supervisor.log',
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
        var file = /^--log=(.*)/.exec(option)[1];
        if(file != '') {
          options.log = file;
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
    else if({'--cluster':1,'--port':1,'--addr':1,'--path':1}[option]) {
      i++; // Consume the option's argument
    }
    else if(/^--(cluster|port|addr|path)=/.test(option)) {
    }
    else if(option === '--no-cluster') {
    }
    else {
      options.argv = argv.slice(0,i);
      options.args = argv.slice(i);
      break;
    }
  }
  return options;
}
