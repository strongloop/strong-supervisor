#!/usr/bin/env node
/* eslint no-process-exit:0 */

var argv = process.argv;
var client = require('strong-control-channel/client');
var debug = require('../lib/debug')('runctl');
var fs = require('fs');
var npmls = require('strong-npm-ls');
var Parser = require('posix-getopt').BasicParser;
var path = require('path');
var util = require('util');
var version = require('../package.json').version;

var $0 = process.env.CMD ? process.env.CMD : path.basename(argv[1]);
var ADDR = 'runctl';

function error() {
  console.error.apply(console, arguments);
  process.exit(1);
}

function okay() {
  console.log('OK');
  process.exit(0);
}

var HELP = fs.readFileSync(require.resolve('./sl-runctl.txt'), 'utf-8')
  .replace(/%MAIN%/g, $0)
  .replace(/%ADDR%/g, ADDR);

var parser = new Parser([
  ':v(version)',
  'h(help)',
  'p:(path)',
  'p:(port)',
  'C:(control)',
].join(''), argv);

var option;
while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'v':
      console.log(version);
      process.exit(0);
      break;
    case 'h':
      console.log(HELP);
      process.exit(0);
      break;
    case 'p':
    case 'C':
      ADDR = option.optarg;
      break;
    default:
      error('Invalid usage (near option \'%s\'), try `%s --help`.',
        option.optopt, $0);
  }
}

var optind = parser.optind();
var command = argv[optind++] || 'status';
var request = {}; // {cmd: , ...}: request to send
var display = okay; // override for command specific success message

function requiredArg() {
  var arg = argv[optind++];

  if (arg != null) return arg;

  error('Invalid usage, missing argument for `%s`, try `%s --help`.',
        command, $0);
}

function optionalArg(default_) {
  var arg = argv[optind++];

  return arg == null ? default_ : arg;
}

var commands = {
  status: requestStatus,
  'set-size': requestSetSize,
  stop: requestStop,
  restart: requestRestart,
  ls: requestLs,
  disconnect: requestDisconnect,
  fork: requestFork,
  'objects-start': requestObjectsStart,
  'objects-stop': requestObjectsStop,
  'cpu-start': requestCpuStart,
  'cpu-stop': requestCpuStop,
  'heap-snapshot': requestHeapSnapshot,
  patch: requestPatch,
  'env-get': requestEnvGet,
  'env-set': requestEnvSet,
  'env-unset': requestEnvUnSet,
  'dbg-start': requestDebuggerStart,
  'dbg-stop': requestDebuggerStop,
  'dbg-status': requestDebuggerStatus,
};

var action = commands[command] || invalidCommand;

action();

function invalidCommand() {
  error('Invalid command `%s`, try `%s --help`.', command, $0);
}

function requestStatus() {
  request.cmd = 'status';
  display = displayStatusResponse;
}

function displayStatusResponse(rsp) {
  if (rsp.master) {
    console.log('master pid: %d', rsp.master.pid);
  }
  console.log('worker count:', rsp.workers.length);
  for (var i = 0; i < rsp.workers.length; i++) {
    var worker = rsp.workers[i];
    var id = worker.id;
    delete worker.id;
    console.log('worker id', id + ':', worker);
  }
}

function requestSetSize() {
  request.cmd = 'set-size';
  request.size = requiredArg();
}

function requestStop() {
  request.cmd = 'stop';
}

function requestRestart() {
  request.cmd = 'restart';
}

function requestLs() {
  var depth = +optionalArg(Number.MAX_VALUE);
  request.cmd = 'npm-ls';
  request.depth = depth;
  display = function displayLsResponse(rsp) {
    console.log(npmls.printable(rsp, depth));
  };
}

function requestDisconnect() {
  request.cmd = 'disconnect';
}

function requestFork() {
  request.cmd = 'fork';
  display = console.log;
}

function requestObjectsStart() {
  request.cmd = 'start-tracking-objects';
  request.target = requiredArg();
}

function requestObjectsStop() {
  request.cmd = 'stop-tracking-objects';
  request.target = requiredArg();
}

function requestCpuStart() {
  request.cmd = 'start-cpu-profiling';
  request.target = requiredArg();
  request.timeout = optionalArg(0) | 0;
  request.stallout = optionalArg(0) | 0;
  display = function() {
    console.log('Profiler started, use cpu-stop to get profile.');
  };
}

function requestCpuStop() {
  var target = requiredArg();
  var name = optionalArg(util.format('node.%s', target));
  request.cmd = 'stop-cpu-profiling';
  request.target = target;
  // .cpuprofile extention Required by Chrome
  var filePath = path.resolve(name + '.cpuprofile');

  display = function(res) {
    if (!res.error) {
      try {
        fs.writeFileSync(filePath, res.profile);
      } catch (err) {
        res.error = err.message;
      }
    }

    if (res.error) {
      error('Unable to write CPU profile to `%s`: %s', filePath, res.error);
      return;
    }

    console.log('CPU profile written to `%s`, load into Chrome Dev Tools',
      filePath);
  };
}

function requestHeapSnapshot() {
  var target = requiredArg();
  var name = optionalArg(util.format('node.%s', target));
  request.cmd = 'heap-snapshot';
  request.target = target;
  var filePath = path.resolve(name + '.heapsnapshot');

  display = function(res) {
    if (!res.error) {
      try {
        fs.writeFileSync(filePath, res.profile);
      } catch (err) {
        res.error = err.message;
      }
    }

    if (res.error) {
      error('Unable to write heap to `%s`: %s', filePath, res.error);
      return;
    }

    console.log('Heap written to `%s`, load into Chrome Dev Tools',
      filePath);
  };
}

function requestPatch() {
  var target = requiredArg();
  var file = requiredArg();

  request.cmd = 'patch';
  request.target = target;
  request.patch = JSON.parse(fs.readFileSync(file));
}

function requestEnvGet() {
  request.target = optionalArg(0) | 0;
  request.cmd = 'env-get';
  display = function dumpEnv(rsp) {
    if (rsp.error || !rsp.env) {
      console.error('Unable to get env:', rsp.error || 'unknown');
    } else {
      Object.keys(rsp.env).sort().forEach(function(k) {
        console.log('%s=%s', k, rsp.env[k]);
      });
    }
  };
}

function requestEnvSet() {
  request.cmd = 'env-set';
  request.env = {};
  argv.slice(optind++).forEach(function(kv) {
    var pair = kv.split('=').map(function(p) {
      return p.trim();
    });
    if (pair[0]) {
      request.env[pair[0]] = pair[1];
    }
  });
}

function requestEnvUnSet() {
  request.cmd = 'env-unset';
  request.env = argv.slice(optind++);
}

function requestDebuggerStart() {
  request.cmd = 'dbg-start';
  request.target = requiredArg();

  display = function debuggerStarted(rsp) {
    if (rsp.error || !rsp.port) {
      console.error('Unable to start the debugger:', rsp.error || 'unknown');
    } else {
      console.log('Debugger listening on port %s', rsp.port);
    }
  };
}

function requestDebuggerStop() {
  request.cmd = 'dbg-stop';
  request.target = requiredArg();
}

function requestDebuggerStatus() {
  request.cmd = 'dbg-status';
  request.target = requiredArg();

  display = function printDebuggerStatus(rsp) {
    if (rsp.status.running) {
      console.log('Debugger listening on port %s', rsp.status.port);
    } else {
      console.log('Debugger is disabled.');
    }
  };
}

debug('addr: %j, request: %j', ADDR, request);

client.request(ADDR, request, response);

function response(er, rsp) {
  if (er) {
    error('Communication error (%s), check master is listening', er.message);
  }

  if (rsp.error) {
    error('Command %s failed with: %s', request.cmd, rsp.error);
  }
  display(rsp);
  process.exit(0);
}
