'use strict';

var os = require('os');
var path = require('path');

exports.host = host;
exports.name = name;

function name() {
  try {
    return require(path.resolve('package.json')).name;
  } catch (e) {
  }
}

function host() {
  var host = os.hostname();
  // XXX strip domain from host for uniformity?
  return host;
}
