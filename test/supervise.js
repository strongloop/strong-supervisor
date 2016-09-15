// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var debug = require('./debug');
var fork = require('child_process').fork;
var fs = require('fs');
var path = require('path');

module.exports = supervise;

function supervise(app, args) {
  var run = require.resolve('../bin/sl-run');
  var ctl = path.join(app, '..', 'runctl');
  try {
    fs.unlinkSync(ctl);
  } catch (er) {
    console.log('# no `%s` to cleanup: %s', ctl, er);
  }

  args = [
    '--cluster=0',
    '--log', debug.enabled ? '-' : ('_test-' + process.pid + '-run.log'),
  ].concat(args || []).concat([app]);

  console.log('# supervise %s with %j', run, args);

  var c = fork(run, args);

  // don't let it live longer than us!
  // XXX(sam) once sl-runctl et. al. self-exit on loss of parent, we
  // won't need this, but until then...
  process.on('exit', c.kill.bind(c));
  function die() {
    c.kill();
    process.kill(process.pid, 'SIGTERM');
  }
  process.once('SIGTERM', die);
  process.once('SIGINT', die);

  return c;
}
