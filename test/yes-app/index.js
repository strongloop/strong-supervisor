var explitive = process.argv.length > 2
              ? process.argv.slice(2).join(' ')
              : 'yes';

var i = setInterval(console.log.bind(console, explitive), 500);

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
