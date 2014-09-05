#!/usr/bin/env node

var debug = require('../lib/debug')('runctl');
var fs = require('fs');
var npmls = require('strong-npm-ls');
var path = require('path');
var util = require('util');
var version = require('../package.json').version;

cli(process.argv, version, function(erMsg) {
  if(erMsg) {
    console.error(erMsg);
    process.exit(1);
  }
});

function cli(argv, version, cb) {
  // Modify the command name to reflect the environment, so that commander
  // reports this as being an slc sub-command (when it is).
  if(process.env.CMD) {
    process.argv[1] = process.env.CMD;
  }

  var program = require('commander');

  var ADDR = 'runctl';
  var client = require('strong-control-channel/client');

  var request = {
    cmd: 'status'
  };
  var display = displayStatusResponse;

  debug('version %s argv:', version, argv);

  if(version != null) {
    program.version(version);
  }

  program
  .option('-p,--path,--port <path>', 'name of control socket, defaults to ' + ADDR, ADDR)
  ;

  program
  .command('status')
  .description('report status of cluster workers, the default command')
  .action(function() {
    request.cmd = 'status';
    display = displayStatusResponse;
  });

  function displayStatusResponse(rsp) {
    if(rsp.master) {
      console.log('master pid: %d', rsp.master.pid);
    }
    console.log('worker count:', rsp.workers.length);
    for(var i = 0; i < rsp.workers.length; i++) {
      var worker = rsp.workers[i];
      var id = worker.id;
      delete worker.id;
      console.log('worker id', id +':', worker);
    }
  }

  program
  .command('set-size <N>')
  .description('set cluster size to N workers')
  .action(function(size) {
    request.cmd = 'set-size';
    request.size = parseInt(size, 10);
    display = function(){};
  });

  program
  .command('stop')
  .description('stop, shutdown all workers and stop controller')
  .action(function() {
    request.cmd = 'stop';
    display = function(){};
  });

  program
  .command('restart')
  .description('restart, restart all workers')
  .action(function() {
    request.cmd = 'restart';
    display = function(){};
  });

  program
  .command('disconnect')
  .description('disconnect all workers')
  .action(function() {
    request.cmd = 'disconnect';
    display = console.log;
  });

  program
  .command('fork')
  .description('fork one worker (it will be killed if size is exceeded)')
  .action(function() {
    request.cmd = 'fork';
    display = console.log;
  });

  program
  .command('objects-start <T>')
  .description('start tracking objects on T, a worker ID or process PID')
  .action(function(target) {
    request.cmd = 'start-tracking-objects';
    request.target = target;
    display = function(){};
  });

  program
  .command('objects-stop <T>')
  .description('stop tracking objects on T')
  .action(function(target) {
    request.cmd = 'stop-tracking-objects';
    request.target = target;
    display = function(){};
  });

  program
  .command('cpu-start <T>')
  .description('start CPU profiling on T, a worker ID or process PID')
  .action(function(target) {
    request.cmd = 'start-cpu-profiling';
    request.target = target;
    display = function(){
      console.log('Profiler started, use cpu-stop to get profile');
    };
  });

  program
  .command('cpu-stop <T> [NAME]')
  .description('stop CPU profiling on T, save as \"NAME.cpuprofile\"')
  .action(function(target, name) {
    if (!name)
      name = util.format('node.%s', target);
    request.cmd = 'stop-cpu-profiling';
    request.target = target;
    display = function(response){
      var filename = name + '.cpuprofile'; // Required by Chrome
      fs.writeFileSync(filename, response.profile);
      console.log('CPU profile written to `%s`, load into Chrome Dev Tools',
                  filename);
    };
  });

  program
  .command('heap-snapshot <T> [NAME]')
  .description('Snapshot heap objects for T, a worker ID or process PID, ' +
               'save as \"NAME.heapsnapshot\"')
  .action(function(target, name) {
    name = name || util.format('node.%s', target);
    name = name + '.heapsnapshot';
    var filePath = path.resolve(name);
    request.cmd = 'heap-snapshot';
    request.target = target;
    request.filePath = filePath;
    display = function(res) {
      console.log('Heap dump written to `%s`, load into Chrome Dev Tools',
                  filePath);
    };
  });

  program
  .command('ls [DEPTH]')
  .description('list application dependencies')
  .action(function(depth) {
    depth = depth == null ? Number.MAX_VALUE : +depth;
    request.cmd = 'npm-ls';
    display = function displayLsResponse(rsp) {
      console.log(npmls.printable(rsp, depth));
    }
  });


  program.on('--help', function() {
    console.log([
      '  Profiling:',
      '',
      '    Either a node cluster worker ID, or an operating system process',
      '    ID can be used to identify the node instance to target to start',
      '    profiling of objects or CPU or to generate a snapshot of the heap.',
      '    The special worker ID `0` can be used to identify the master.',
      '',
      '    Object metrics are published, see the `--metrics` option to `run`.',
      '',
      '    CPU profiles must be loaded into Chrome Dev Tools. The NAME is',
      '    optional, profiles default to being named `node.<PID>.cpuprofile`.',
      '',
      '    Heap snapshots must be loaded into Chrome Dev Tools. The NAME is',
      '    optional, snapshots default to being named ',
      '    `node.<PID>.heapshapshot`.',
    ].join('\n'));
  });

  program
  .on('*', function(name) {
    return cb('unknown command: ' + name);
  });

  program.parse(argv);

  client.request(program.path, request, response);

  function response(er, rsp) {
    if(er) {
      return cb('Communication error (' + er.message + '), check master is listening');
    }

    if(rsp.error) {
      return cb(util.format(
        'Command %s failed with: %s',
        request.cmd,
        rsp.error
      ));
    }
    display(rsp);
  }
}
