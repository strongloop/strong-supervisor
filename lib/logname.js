'use strict';

var printfReplacer = require('./printf-replacer');

exports.generate = function(str, worker) {
  return printfReplacer(str || '', {
    w: worker.id,
    p: worker.pid
  });
}
