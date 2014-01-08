// XXX(sam) I feel a bit bad about not using an options parsing module, but I
// was going in circles searching npmjs.org for one which would parse options in
// order up to the first non-option (as getopt_long could do), and failing. I'll
// keep looking, but in the meantime, this works fine.
exports.HELP = [
  'usage: slr [options] [app [app-options...]]',
  '',
  'Run an app, allowing it to be profiled (using StrongOps) and supervised.',
  '',
  'For more information, see XXX(URL).',
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
  '  --size N,--size=N  Set the cluster size (default is 1).',
  '  --no-profile       Do not profile with StrongOps (default is --profile).',
  '',
  'Cluster size is one of:',
  '  - A number of workers to run',
  '  - A string containing "cpu" to run a worker per CPU',
  '  - The number zero, to run directly in the master, in which case the app',
  '    will *NOT* be supervisable or controllable, but will be monitored.',
].join('\n');

// Parse argv into options (for runner), and split off the args (for the app).
exports.parse = function parse(argv) {
  var options = {
    HELP: exports.HELP,
    argv: argv,         // process.argv stripped of command...
    args: [ '.' ],      // app app-options...
    profile: true,
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
    else if(option === '--profile') {
      options.profile = true;
    }
    else if(option === '--no-profile') {
      options.profile = false;
    }
    else if({'--size':1,'--port':1,'--addr':1,'--path':1}[option]) {
      i++; // Consume the option's argument
    }
    else if(/^--(size|port|addr|path)=/.test(option)) {
    }
    // XXX need to pull out all other options understood by cluster-control...
    else {
      options.argv = argv.slice(0,i);
      options.args = argv.slice(i);
      break;
    }
  }
  return options;
}
