#!/usr/bin/env node

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
  .replace(/%ADDR%/g, ADDR)
  ;

var parser = new Parser([
    ':v(version)',
    'h(help)',
    'p:(path)',
    'p:(port)',
    'C:(control)',
  ].join(''), argv);

while ((option = parser.getopt()) !== undefined) {
  switch (option.option) {
    case 'v':
      console.log(version);
      process.exit(0);
    case 'h':
      console.log(HELP);
      process.exit(0);
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
var request = { /* cmd: ... */ }; // request to send
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
};

var action = commands[command] || invalidCommand;

action();

function invalidCommand() {
  error('Invalid command `%s`, try `%s --help`.', $0);
}

function requestStatus() {
  request.cmd = 'status';
  display = displayStatusResponse;
}

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

function requestSetSize() {
  request.cmd = 'set-size';
  request.size = parseInt(requiredArg(), 10);
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
  }
}

function requestDisconnect() {
  request.cmd = 'disconnect';
}

function requestFork() {
  request.cmd = 'fork';
  display = console.log;
};

function requestObjectsStart(target) {
  request.cmd = 'start-tracking-objects';
  request.target = requiredArg();
}

function requestObjectsStop(target) {
  request.cmd = 'stop-tracking-objects';
  request.target = requiredArg();
}


function requestCpuStart(target) {
  request.cmd = 'start-cpu-profiling';
  request.target = requiredArg();
  request.timeout = optionalArg(0) | 0;
  display = function(){
    console.log('Profiler started, use cpu-stop to get profile.');
  };
}

function requestCpuStop(target) {
  var target = requiredArg();
  var name = optionalArg(util.format('node.%s', target));
  request.cmd = 'stop-cpu-profiling';
  request.target = target;
  // .cpuprofile extention Required by Chrome
  request.filePath = path.resolve(name + '.cpuprofile');

  display = function(res) {
    if (res.error) {
      return console.log('Unable to write CPU profile to `%s`: %s', res.error);
    }
    console.log('CPU profile written to `%s`, load into Chrome Dev Tools',
      res.filePath);
  };
}

function requestHeapSnapshot() {
  var target = requiredArg();
  var name = optionalArg(util.format('node.%s', target));
  request.cmd = 'heap-snapshot';
  request.target = target;
  request.filePath = path.resolve(name + '.heapsnapshot');

  display = function(res) {
    if (res.error) {
      return console.log('Unable to write heap to `%s`: %s', res.error);
    }
    console.log('Heap written to `%s`, load into Chrome Dev Tools',
      res.filePath);
  };
}

function requestPatch() {
  var target = requiredArg();
  var file = requiredArg();

  request.cmd = 'patch';
  request.target = target;
  request.patch = JSON.parse(fs.readFileSync(file));
}

debug('addr: %j, request: %j', ADDR, request);

client.request(ADDR, request, response);

function response(er, rsp) {
  if(er) {
    error('Communication error (%s), check master is listening', er.message);
  }

  if(rsp.error) {
    error('Command %s failed with: %s', request.cmd, rsp.error);
  }
  display(rsp);
  process.exit(0);
}
