var util = require('util');
var stream = require('stream');
var fs = require('fs');
var spawn = require('child_process').spawn;

var generateLogName = require('./expander').expand;

module.exports = LogWriter;

function LogWriter(worker, options) {
  if (!(this instanceof LogWriter)) return new LogWriter(worker, options);

  stream.PassThrough.call(this);

  this.template = options.log;
  this.worker = {
    id: worker.id || 0,
    pid: worker.pid || worker.process.pid
  };
  this.name = generateLogName(this.template, this.worker);
  if (/^\|[^\|]/.test(this.name)) {
    this.cmd = this.name
                .slice(1) // strip leading '|'
                .trim()
                .split(/\s+/);
    this.proc = spawn(this.cmd[0], this.cmd.slice(1),
                      {stdio: ['pipe', process.stdout, process.stderr]});
    this.sink = this.proc.stdin;
  } else {
    this.sink = fs.createWriteStream(this.name, {flags: 'a'});
  }
  this.pipe(this.sink);
}

util.inherits(LogWriter, stream.PassThrough);

LogWriter.prototype.reOpen = function LogWriterReOpen() {
  if (this.sink instanceof fs.WriteStream) {
    this.unpipe(this.sink);
    this.sink.end();
    // lose our reference to previous stream, but it should clean itself up
    this.sink = fs.createWriteStream(this.name, {flags: 'a'});
    this.pipe(this.sink);
  }
};
