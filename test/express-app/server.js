var options = require('optimist').argv;
var express = require('express');
var app = express();

app.get('/', (function(){
  var started = new Date();
  return function(req,res) {
    res.send({
      started: started,
      uptime: (Date.now() - Number(started)) / 1000
    });
  }
})());

var server = app.listen(0);
console.log('express-app listening on http://localhost:%d',
            server.address().port);
