// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var options = require('optimist').argv;
var express = require('express');
var app = express();

spin();

var i;
var j;
function spin() {
  for (i = 0, j = 1; i < 1e6; i++) {
    j = (j + i) * (j + i);
  }
  // Stop V8 from optimizing away the loop.
  global.ASSIGNMENT_FOR_SIDE_EFFECT = j;
  // recursive instead of setInterval so we don't hang a slow machine where
  // each spin may be longer than the interval
  setTimeout(spin, 5).unref();
}

app.set('port', options.port || process.env.PORT || 0);

app.get('/', (function(){
  var started = new Date();
  return function(req,res) {
    res.send({
      started: started,
      uptime: (Date.now() - Number(started)) / 1000
    });
  }
})());

var server = app.listen(app.get('port'), function() {
  console.log('module-app listening on http://localhost:%d',
              server.address().port);
  console.log('argv: ', process.argv);
  console.log('env PWD="%s"', process.env.PWD);
  console.log('process CWD="%s"', process.cwd());
  console.log('package version="%s"', require('./package.json').version);
});
