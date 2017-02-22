// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

exports.ExitError = function ExitError(message, code) {
  var self = new Error(message);
  self.code = code == null ? 1 : code;
  self.name = 'ExitError';
  return self;
};
