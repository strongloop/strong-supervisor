// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Don't require agent until needed, early require causes its configuration to
// be loaded from the CWD, and the CWD isn't the directory of the application
// until run has had a chance to chdir() into it.

'use strict';

module.exports = agent;

function agent() {
  // XXX sl-run.js sets the agent logger, and the quiet option, that won't
  // happen if strongops isn't being used, unless we figure out a way to do it
  // here.
  var adapter = require('./adapter');

  return adapter;
}
