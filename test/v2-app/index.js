var options = require('optimist').argv;
var express = require('express');
var app = express();

app.configure(function(){
  app.set('port', options.port || process.env.PORT || 0);
});

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
