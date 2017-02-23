// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

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
