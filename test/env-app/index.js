process.env.ENV_TEST_APP = __dirname;
var envs = process.argv.slice(2);

var i = setInterval(dump, 500);

process.on('internalMessage', function(msg) {
  if(msg && msg.cmd && msg.cmd === 'NODE_CLUSTER_disconnect') {
    // v0.10
    clearInterval(i);
  }
  if(msg && msg.cmd && msg.cmd === 'NODE_CLUSTER' && msg.act === 'disconnect') {
    // v0.11
    clearInterval(i);
  }
});

function dump() {
  var current = envs.map(function(k) { return k + '=' + process.env[k]; });
  console.log(current.join(' '));
}
