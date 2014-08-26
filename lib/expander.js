'use strict';

var printfReplacer = require('./printf-replacer');

exports.expand = function(str, worker) {
  return printfReplacer(str || '', workerParams(worker));
}

function workerParams(worker) {
  var vars = {};
  if ('id' in worker)
    vars.w = worker.id;
  if ('pid' in worker)
    vars.p = worker.pid;
  if ('appName' in worker)
    vars.a = worker.appName;
  if ('hostname' in worker)
    vars.h = worker.hostname;
  return vars;
}
