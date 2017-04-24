var net = require('net');
var client;
var server = net.createServer().listen(0).on('listening', function() {
  client = net.connect(this.address().port);
});

process.on('message', function(msg) {
  if(msg.cmd === 'CLUSTER_CONTROL_shutdown') {
    console.log('shutting down slowly');
    setTimeout(function() {
      console.log('ok, done, close client');
      client.destroy();
    }, 15000);
  }
});
