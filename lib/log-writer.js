var util = require('util');
var stream = require('stream');
var fs = require('fs');

var generateLogName = require('./logname').generate;

module.exports = LogWriter;

function LogWriter(worker, options) {
  if (!(this instanceof LogWriter)) return new LogWriter(worker, options);

  stream.PassThrough.call(this);

  this.template = options.log;
  this.worker = {
    id: worker.id || 'supervisor',
    pid: worker.pid || worker.process.pid
  }
  this.name = generateLogName(this.template, this.worker);
  this.sink = fs.createWriteStream(this.name, { flags: 'a'});
  this.pipe(this.sink);
}

util.inherits(LogWriter, stream.PassThrough);

LogWriter.prototype.reOpen = function LogWriterReOpen() {
  if (this.sink instanceof fs.WriteStream) {
    this.unpipe(this.sink);
    this.sink.end();
    // lose our reference to previous stream, but it should clean itself up
    this.sink = fs.createWriteStream(this.name, { flags: 'a'});
    this.pipe(sink);
  }
}
