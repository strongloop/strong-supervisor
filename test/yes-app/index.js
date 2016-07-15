// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var explitive = process.argv.length > 2
              ? process.argv.slice(2).join(' ')
              : 'yes';

var i = setInterval(console.log.bind(console, explitive), 500);

process.on('internalMessage', function(msg) {
  if (msg && msg.cmd === 'NODE_CLUSTER_disconnect') {
    // v0.10
    clearInterval(i);
  }
  if (msg && msg.cmd === 'NODE_CLUSTER' && msg.act === 'disconnect') {
    // v0.11
    clearInterval(i);
  }
});
