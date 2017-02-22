// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug')('debugger');
try {
  module.exports = require('strong-debugger');
} catch (err) {
  debug('Cannot load strong-debugger: %s', err.message);
  module.exports = null;
}
