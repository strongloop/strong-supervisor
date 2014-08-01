'use strict';

var printfReplacer = require('./printf-replacer');

exports.expand = function(str, worker) {
  return printfReplacer(str || '', {
    w: worker.id,
    p: worker.pid
  });
}
