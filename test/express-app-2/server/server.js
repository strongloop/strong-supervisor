// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var options = require('optimist').argv;
var express = require('express');
var metrics = require('strong-express-metrics');

var app = express();
app.use(metrics());

app.set('port', options.port || process.env.PORT || 0);

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
  console.log('express-app listening on http://localhost:%d',
              server.address().port);
});
