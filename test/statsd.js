// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var assert = require('assert');
var dgram = require('dgram');

module.exports = function statsd(callback) {
  var server = dgram.createSocket('udp4');
  server.reported = [];

  server.on('message', function(data) {
    console.log('# statsd receives metric: %s', data);
    server.reported.push(data.toString());
  });

  server.bind(listening);

  server.waitfor = function(regex, callback) {
    waitForStats();

    function waitForStats() {
      if (server.reported.some(found)) {
        return callback();
      }

      setTimeout(waitForStats, 2000);

      function found(stat) {
        return regex.test(stat);
      }
    }
  };

  function listening(er) {
    console.log('# statsd listening:', er || server.address());
    assert.ifError(er);
    server.port = server.address().port;
    return callback(server);
  }
};
