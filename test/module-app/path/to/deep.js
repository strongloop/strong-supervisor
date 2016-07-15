// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var express = require('express');
var app = express();

app.set('port', 0);

app.get('/', (function(){
  var started = new Date();
  return function(req, res) {
    res.send({
      started: started,
      uptime: (Date.now() - Number(started)) / 1000
    });
  };
})());

var server = app.listen(app.get('port'), function() {
  console.log('deep-app listening on http://localhost:%d',
              server.address().port);
  process.argv.forEach(function(v, i, a) {
    console.log('argv %d: %s', i, v);
  });
});
