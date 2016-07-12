// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var debug = require('./debug')('debugger');
try {
  module.exports = require('strong-debugger');
} catch (err) {
  debug('Cannot load strong-debugger: ', err);
  module.exports = null;
}
