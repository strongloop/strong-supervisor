var UNUSED_PROBES = [
  'eventloop',
  'profiling',
  'http',
  'mongo',
  'socketio',
  'mqlight',
  'postgresql',
  'mqtt',
  'mysql',
  'redis',
  'memcached',
  'oracledb',
  'strong-oracle',
  'requests',
  'trace',
];

exports.worker = function(handle) {
  var appmetrics = require('appmetrics');

  UNUSED_PROBES.forEach(function(p) {
    appmetrics.disable(p);
  });

  var monitoring = appmetrics.monitor();

  monitoring.on('initialized', function(/* env */) {
    handle.debug('appmetrics initialized');
  });

  monitoring.on('cpu', function(data) {
    handle.debug('appmetrics event - cpu: %j', data);
    handle.send({
      cmd: 'appmetrics:cpu',
      data: data
    });
  });

  monitoring.on('memory', function(data) {
    handle.debug('appmetrics event - memory: %j', data);
    handle.send({
      cmd: 'appmetrics:memory',
      data: data
    });
  });

  monitoring.on('gc', function(data) {
    handle.debug('appmetrics event - gc: %j', data);
    handle.send({
      cmd: 'appmetrics:gc',
      data: data
    });
  });
};

exports.master = function(handle) {
  handle.on('appmetrics:cpu', addMasterData);
  handle.on('appmetrics:memory', addMasterData);
  handle.on('appmetrics:gc', addMasterData);

  function addMasterData(msg, worker) {
    // Mix-in the worker identity: startTime is known only in the master, and
    // worker.id is just convenient to do here.
    msg.pst = worker.startTime;
    msg.wid = worker.id;
    handle.send(msg);
  }
};
