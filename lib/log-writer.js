var util = require('util');
var stream = require('stream');
var fs = require('fs');

var generateLogName = require('./logname').generate;

module.exports = LogWriter;

function LogWriter(worker, options, stdout) {
  if (!(this instanceof LogWriter)) return new LogWriter(worker, options);

  stream.Writable.call(this);

  this.template = options.log;
  this.worker = {
    id: worker.id || 'supervisor',
    pid: worker.pid || worker.process.pid
  }
  this.name = generateLogName(this.template, this.worker);

  if (!options.log || options.log === '-') {
    this.sink = stdout;
  } else if (/%/.test(options.log)) {
    this.sink = fs.createWriteStream(this.name, { flags: 'a'});
  }
}

util.inherits(LogWriter, stream.Writable);

LogWriter.prototype._write = function LogWriter_write(chunk, encoding, callback) {
  this.sink.write(chunk, encoding, callback);
}
