var debug = require('./debug');
var helper = require('./helper');
var http = require('http');
var run = helper.runWithControlChannel;
var tap = require('tap');

var skipIfNoLicense = process.env.STRONGLOOP_LICENSE
                    ? false
                    : {skip: 'tested feature requires license'};

tap.test('traces are forwarded via parentCtl', skipIfNoLicense, function(t) {
  t.plan(2);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control', '--trace'],
    function(data) {
      debug('received: cmd %s: %j', data.cmd, data);
      switch (data.cmd) {
        case 'trace:object':
          var record = JSON.parse(data.record);
          t.ok(!!record.version, 'Record version should exist');
          t.ok(!!record.packet.metadata, 'Record metadata should exist');
          app.kill();
          break;
      }
    }
  );
  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

tap.test('traces can be turned on', skipIfNoLicense, function(t) {
  t.plan(6);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control'], messageHandler);
  var tracingEnabled = false;

  function messageHandler(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'status:wd':
        if (data.id === 0) {
          t.assert(!data.isTracing);
        } else {
          t.equal(data.isTracing, tracingEnabled);
          if (!tracingEnabled) {
            tracingEnabled = true;
            app.control.request({cmd: 'tracing', enabled: true}, function(res){
              t.assert(!res.error);
            });
          } else {
            app.kill();
          }
        }
        break;
      case 'trace:object':
        t.assert(tracingEnabled);
        var record = JSON.parse(data.record);
        t.ok(!!record.version, 'Record version should exist');
        t.ok(!!record.packet.metadata, 'Record metadata should exist');
        break;
    }
  }

  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

tap.test('traces hostname can be overridden', skipIfNoLicense, function(t) {
  t.plan(7);

  var expressApp = require.resolve('./express-app');
  process.env.STRONGLOOP_TRACES_ID = '1234';
  var app = run([expressApp], ['--cluster=1', '--no-control'], messageHandler);
  var tracingEnabled = false;

  function messageHandler(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'status:wd':
        if (data.id === 0) {
          t.assert(!data.isTracing);
        } else {
          t.equal(data.isTracing, tracingEnabled);
          if (!tracingEnabled) {
            tracingEnabled = true;
            app.control.request({cmd: 'tracing', enabled: true}, function(res){
              t.assert(!res.error);
            });
          } else {
            app.kill();
          }
        }
        break;
      case 'trace:object':
        t.assert(tracingEnabled);
        var record = JSON.parse(data.record);
        t.ok(!!record.version, 'Record version should exist');
        t.ok(!!record.packet.metadata, 'Record metadata should exist');
        t.equal(record.packet.monitoring.system_info.hostname, '1234',
          'Record hostname should match');
        break;
    }
  }

  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});

tap.test('traces can be turned off', skipIfNoLicense, function(t) {
  t.plan(6);

  var expressApp = require.resolve('./express-app');
  var app = run([expressApp], ['--cluster=1', '--no-control', '--trace'], messageHandler);
  var tracingEnabled = true;

  function messageHandler(data) {
    debug('received: cmd %s: %j', data.cmd, data);
    switch (data.cmd) {
      case 'status:wd':
        if (data.id === 0) {
          t.assert(!data.isTracing);
        } else {
          t.equal(data.isTracing, tracingEnabled);
          if (tracingEnabled) {
            tracingEnabled = false;
            app.control.request({cmd: 'tracing', enabled: false}, function(res){
              t.assert(!res.error);
            });
          } else {
            app.kill();
          }
        }
        break;
      case 'trace:object':
        t.assert(tracingEnabled);
        var record = JSON.parse(data.record);
        t.ok(!!record.version, 'Record version should exist');
        t.ok(!!record.packet.metadata, 'Record metadata should exist');
        break;
    }
  }

  app.ref();
  app.on('exit', function(code, signal) {
    debug('supervisor exit: %s', signal || code);
    t.end();
  });
});


