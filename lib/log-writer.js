var util = require('util');
var stream = require('stream');
var fs = require('fs');

var generateLogName = require('./logname').generate;

module.exports = LogWriter;

function LogWriter(worker, options) {
  if (!(this instanceof LogWriter)) return new LogWriter(worker, options);

  stream.Writable.call(this);

  this.template = options.log;
  this.worker = {
    id: worker.id || 'supervisor',
    pid: worker.pid || worker.process.pid
  }
  this.name = generateLogName(this.template, this.worker);
  this.sink = fs.createWriteStream(this.name, { flags: 'a'});
}

util.inherits(LogWriter, stream.Writable);

LogWriter.prototype.reOpen = function LogWriterReOpen() {
  if (this.sink instanceof fs.WriteStream) {
    this.sink.end();
    // lose our reference to previous stream, but it should clean itself up
    this.sink = fs.createWriteStream(this.name, { flags: 'a'});
  }
}

LogWriter.prototype._write = function LogWriter_write(chunk, encoding, callback) {
  return this.sink.write(chunk, encoding, callback);
}
