// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

// Implementation of chdir, that tracks the PWD, the logical 'symlink aware'
// working directory that the shell builtin `cd` normally maintains. Note that
// the CWD is different, it's the physical working directory, process.cwd() or
// getcwd(3) returns this, and includes no symlinks.

'use strict';

var path = require('path');
var fs = require('fs');

// Ensure PWD is set, and correctly points to CWD.
if (process.env.PWD == null) {
  // PWD was never set, perhaps we weren't run by a shell. Set PWD.
  process.env.PWD = process.cwd();
} else if (process.cwd() !== fs.realpathSync(process.env.PWD)) {
  // PWD was set, but its not a logical equivalent of our CWD. Reset PWD.
  process.env.PWD = process.cwd();
}

module.exports = function chdir(directory) {
  var pwd = path.resolve(process.env.PWD, directory);
  process.chdir(pwd);
  // Note that we only set PWD if chdir was successful.
  process.env.PWD = pwd;
};
