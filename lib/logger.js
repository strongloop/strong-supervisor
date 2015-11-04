var util = require('util');

module.exports = Logger;

function Logger(sink) {
  if (!(this instanceof Logger)) return new Logger(sink);

  this.sink = sink;
}

Logger.prototype.info = partial(LevelLog, 'INFO');
Logger.prototype.log = Logger.prototype.info;
Logger.prototype.warn = partial(LevelLog, 'WARN');
Logger.prototype.error = partial(LevelLog, 'ERROR');

function LevelLog(level/*, items... */) {
  var items = [].slice.call(arguments, 1);
  this.sink.write(level + ' ' +
                  util.format.apply(util, items) +
                  '\n');
}

function partial(fn/*, firstArgs... */) {
  var firstArgs = [].slice.call(arguments, 1);
  return function() {
    var args = firstArgs.concat([].slice.call(arguments));
    return fn.apply(this, args);
  };
}
