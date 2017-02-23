// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

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
