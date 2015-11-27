var appmetrics = require('appmetrics');
var monitoring = appmetrics.monitor();
monitoring.on('initialized', function (env) {
  var env = monitoring.getEnvironment();
  for (var k in env) {
    //console.log('env %s=%s', k, env[k]);
  }
});

monitoring.on('cpu', function (x) {
  console.log('cpu %s: %j', new Date(x.time), x);
});

monitoring.on('memory', function (x) {
  console.log('memory %s: %j', new Date(x.time), x);
});

var options = require('optimist').argv;
var express = require('express');
var metrics = require('strong-express-metrics');

var app = express();
app.use(metrics());

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
  console.log('express-app listening on http://localhost:%d',
              server.address().port);
});
