'use strict';

exports.worker = function(handle) {
  var _heartBeatInterval = 15 * 1000;
  this.intervalObj = setInterval(function() {
    handle.send({
      cmd: 'metrics',
      record: JSON.stringify({dummyRecord: ''}),
    });
  }, _heartBeatInterval);
};

exports.stop = function() {
  clearInterval(this.intervalObj);
};
