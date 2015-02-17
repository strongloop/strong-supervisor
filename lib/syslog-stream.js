var util = require('util');
var stream = require('stream');
var syslog = require('strong-fork-syslog');

var initialized = false;

module.exports = SysLogStream;

function SysLogStream(options) {
  if (!(this instanceof SysLogStream)) return new SysLogStream(options);

  stream.Writable.call(this);

  this.level = syslog.LOG_NOTICE;

  if (typeof options.level === 'number') {
    this.level = options.level;
  } else if (typeof options.level === 'string') {
    if (options.level.toUpperCase() in syslog) {
      this.level = syslog[options.level];
    } else if ('LOG_' + options.level.toUpperCase() in syslog) {
      this.level = syslog['LOG_' + options.level.toUpperCase()];
    }
  }

  if (!initialized) {
    // XXX(rmg): would be nice to use the same name as strong-agent does,
    //           ideally without duplicating the logic for deriving it.
    syslog.init(process.title,
                syslog.LOG_PID | syslog.LOG_ODELAY,
                syslog.LOG_USER);
    initialized = true;
  }
}

util.inherits(SysLogStream, stream.Writable);

SysLogStream.prototype.reOpen = function SysLogStreamReOpen() {
  // no-op!
};

SysLogStream.prototype._write = function _write(chunk, encoding, callback) {
  syslog.log(this.level, chunk.toString().trim());
  setImmediate(callback);
  return true;
};
