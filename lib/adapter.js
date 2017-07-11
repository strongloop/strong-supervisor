// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('assert');
var appmetrics; // = require('appmetrics') if started
var appmetricsStarted = false; // XXX(sam) always === !!appmetrics, can remove?
var dashboard = require('./dashboard');
var debug = require('./debug')('adapter');
var monitor;
var util = require('util');

// Export an EventEmitter

module.exports = exports = new EventEmitter;

// Export the desired functions
var metrics = {
  startCpuProfiling: startCpuProfiling,
  stopCpuProfiling: stopCpuProfiling,
  startTrackingObjects: startTrackingObjects,
  stopTrackingObjects: stopTrackingObjects
};

var internal = {
  on: internal_on, // XXX(sam) where is this used?
  supports: {watchdog: false} // XXX(sam) probably not needed
};

var dyninst = {
  metrics: false
};

exports.use = use;
exports.metrics = metrics;
exports.profile = profile;
exports.start = start;
exports.internal = internal;
exports.dyninst = dyninst;
exports.lrtime = lrtime;


// Global objects to store metric data
var eventLoopMetrics = {
  count: 0,
  minimum: 0,
  maximum: 0,
  average: 0,
};
var cpuMetrics = {
  system: 0,
  user: 0,
  count: 0,
};
var httpMetrics = {
  count: 0,
};
var probeList = [
  'leveldown',
  'memcached',
  'mongo',
  'mysql',
  'oracle',
  'oracledb',
  'postgres',
  'redis',
  'socketio',
  'strong-oracle',
  'express',
];
var probeMetrics = {};
var heapMetrics = {
  total: 0,
  used: 0,
  count: 0,
};
var gcMetrics = {
  used: 0,
  count: 0,
};
var messageMetrics = {
  sent: 0,
  received: 0,
};

// Keep track of Cpu Profiling
var profiling = false;
var objectTrackingEnabled = false;
var lastObjectHistogram = {};

// Callback interval
var callbackInterval = process.env.STRONGLOOP_BASE_INTERVAL || 60000;
var objectTrackingCallbackInterval =
  process.env.STRONGLOOP_OBJECT_TRACKING_INTERVAL || 15000;

// Public functions to be exported

// Metrics API Use function
function use(callback) {

  // The callback needs to fire every 60 seconds with data from the last 60
  // seconds
  setInterval(function() {
    // Get data from last 60 seconds
    var eventLoopData = getEventLoopData();
    var cpuData = getCpuData();
    var httpData = getHttpData();
    var heapData = getHeapData();
    var usedHeap = getGcHeapData();
    var messageData = getMessageData();

    debug('eventLoopData: %j', eventLoopData);

    if (eventLoopData.count > 0) {
      // This function can run before data collection has started, in which case
      // there is no data, and min/max/average are undefined. Skip reporting
      // until data arrives.
      callback('loop.count', assertPositive(eventLoopData.count));
      callback('loop.minimum', assertPositive(eventLoopData.minimum));
      callback('loop.maximum', assertPositive(eventLoopData.maximum));
      callback('loop.average', assertPositive(eventLoopData.average));
    }

    debug('cpuData: %j', cpuData);

    if (cpuData.count) {
      // This function can run before any CPU data has been collected. Avoid
      // reporting unknown or invalid values by just not reporting if there
      // is no data.
      callback('cpu.system', assertPositive(cpuData.system));
      callback('cpu.total', assertPositive(cpuData.total));
      callback('cpu.user', assertPositive(cpuData.user));
    }

    callback('http.connection.count', assertPositive(httpData.count));

    // Callback with probe data of each probe if there have been events
    var probeData;

    for (var i in probeList) {
      if (probeMetrics[probeList[i]]) {
        probeData = getProbeData(probeList[i]);
        callback(probeList[i] + '.count', assertPositive(probeData.count));
        callback(probeList[i] + '.average', assertPositive(probeData.average));
        callback(probeList[i] + '.minimum', assertPositive(probeData.minimum));
        callback(probeList[i] + '.maximum', assertPositive(probeData.maximum));
      }
    }

    if (usedHeap > 0) {
      callback('gc.heap.used', usedHeap);
    }

    if (heapData.total && heapData.used) {
      callback('heap.total', assertPositive(heapData.total));
      callback('heap.used', assertPositive(heapData.used));
    }

    if (messageData.sent > 0 || messageData.received > 0) {
      callback('messages.out.count', messageData.sent);
      callback('messages.in.count', messageData.received);
    }

  }, callbackInterval).unref();

  setInterval(function() {
    var version = process.version.split('v')[1];
    if (objectTrackingEnabled) {
      if (version >= '0.11') {
        var histogram = appmetrics.getObjectHistogram();
        require('fs').writeFileSync('histogram-' + Date.now() + '.json',
                                    JSON.stringify(histogram));
        var objectCounts = compareHistograms(lastObjectHistogram, histogram);
        lastObjectHistogram = histogram;
        // Get object stats
        for (var type in objectCounts) {
          var tuple = objectCounts[type];
          // Don't output events for no change?
          // XXX(toby) - What's the correct behaviour here?
          // XXX(toby) - Should we skip "weird" object types?
          // FIXME(toby) I'll have to read the strong-agent code to see how what
          // you are doing is different, but if you look at histogram.json I
          // checked in, you'll see many of the types are pure garbage. I wonder
          // if non-string things like functions are being coerced into strings?
          // The entire source code of files is showing up as 'types'!
          if (type.indexOf('\n') >= 0) {
            console.trace('%j', type);
            console.assert(type.indexOf('\n') < 0, 'INVALID');
          } else {
            if (tuple.count !== 0 && tuple.size !== 0) {
              callback('object.' + type + '.count', tuple.count);
              callback('object.' + type + '.size', tuple.size);
            }
          }
        }
      } else {
        callback('Warning',
                 'Object tracking is not supported on node v' + version);
      }
    }
  }, objectTrackingCallbackInterval).unref();
}

function start(options) {
  options = util._extend({}, options);

  if (!appmetricsStarted) {
    appmetrics = require('appmetrics');
    appmetrics.configure(options); // FIXME are the options in agentOptions OK?
    // FIXME confirm appmetrics.configure() accepts sl-run:agentOptions
    appmetrics.enable('eventloop');
    monitor = appmetrics.monitor();
    global.APPMETRICS_MONITOR = monitor;

    initialise();
    appmetricsStarted = true;
    global.APPMETRICS = appmetrics;

    var dash = dashboard(options.dashboard, appmetrics);

    if (dash.url)
      console.log('strong-supervisor attaching dashboard at %s', dash.url);

    // XXX(sam) Unimplemented features?
    // - watchdogActivationCount
    // - express:usage-record

    exports.on('newListener', function(type) {
      switch (type) {
        case 'express:usage-record':
          // turn on express usage record
          monitor.on('express:usage-record', function(record) {
            exports.emit('express:usage-record', record);
          });
          break;
      }
    });

  }
}

function internal_on() {

}

// Configuration of appmetrics/strong-agent.
//
// For backwards compatibility reasons, strong-agent had multiple APIs for
// configuring and starting it.
//
// The agentOptions includes configuration properties used by strong-agent, but
// currently ignored by appmetrics.  For definition of agentOptions, see
// agentOptions in bin/sl-run.js.
//
// XXX(sam) appmetrics has configuration, lots of it, and its probably
// worth making it possible to load configuration from disk and/or to
// configure via CLI or ENV.

// profile(unused, unused, agentOptions)
function profile() {
}

// CPU Profiling
function startCpuProfiling() {
  start();
  // If we aren't profiling already
  if (!profiling) {
    profiling = true;

    // Instruct appmetrics to return JSON formatting and enable profiling
    appmetrics.setJSONProfilingMode(true);
    appmetrics.sendControlCommand('profiling_node', 'on,profiling_node_v8json');
    appmetrics.enable('profiling');

  }
}

function stopCpuProfiling(callback) {
  if (profiling) {

    // Listen for JSON coming back from appmetrics
    monitor.once('profiling', function(data) {
      callback(JSON.stringify(data));
    });

    profiling = false;
    appmetrics.disable('profiling');
  }
}

// Object tracking
function startTrackingObjects() {
  start();
  objectTrackingEnabled = true;
}

function stopTrackingObjects() {
  objectTrackingEnabled = false;
  lastObjectHistogram = {};
}

// Private functions

// Metrics API
function isPositive(n) {
  return typeof n === 'number' && n >= 0;
}

function assertPositive(n) {
  assert(isPositive(n));
  return n;
}

function createEventLoopListener() {
  monitor.on('loop', function(res) {
    // Update min and max accordingly
    eventLoopMetrics.count = res.count;
    eventLoopMetrics.minimum = res.minimum;
    eventLoopMetrics.maximum = res.maximum;
    eventLoopMetrics.average = res.average;
  });
}

function createCpuListener() {
  monitor.on('cpu', function(cpu) {
    // CPU usage is reported periodically. The values are summed and counted, so
    // that the average can be reported over the expected (backwards compatible
    // to strong-agent) reporting period.
    cpuMetrics.system += (cpu.system * 100);
    cpuMetrics.user += (cpu.process * 100);
    cpuMetrics.count++;
  });
}

function createHeapListener() {
  monitor.on('heap', function(res) {
    heapMetrics.total += res.total;
    heapMetrics.used += res.used;
    heapMetrics.count++;
  });
}

function createGcListener() {
  monitor.on('gc', function(res) {
    gcMetrics.used += res.used;
    gcMetrics.count++;
  });
}

function createHttpListener() {
  /* eslint-disable no-unused-vars */
  monitor.on('http', function(args) {
    /* eslint-enable no-unused-vars */
    // All we need to do is increment the count
    httpMetrics.count++;
  });
}

function createMessageListener() {
  // Map the event types from axon and strong mq to whether they
  // were send or receive events.
  monitor.on('strong-mq', incrementCounts);
  monitor.on('axon', incrementCounts);
  function incrementCounts(data) {
    var types = {
      push: 'send',
      pull: 'receive',
      pub: 'send',
      sub: 'receive',
      req: 'send',
      rep: 'receive',
      'pub-emitter': 'send',
      'sub-emitter': 'receive'
    };
    if (types[data.type] === 'send') {
      messageMetrics.sent++;
    } else if (types[data.type] === 'receive') {
      messageMetrics.received++;
    }
  }
}

function createProbeListener(probeName) {
  monitor.on(probeName, function(res) {
    // If no metrics object exists, create one
    if (!probeMetrics[probeName]) {
      probeMetrics[probeName] = {
        count: 0,
        runningTotal: 0
      };
    }

    // Update all metrics accordingly
    updateMetrics(probeName, res.duration);
  });
}

function getEventLoopData() {
  // Build JSON
  var eventLoopEvent = {
    count: eventLoopMetrics.count,
    minimum: eventLoopMetrics.minimum,
    maximum: eventLoopMetrics.maximum,
    average: eventLoopMetrics.average,
  };

  // Reset values
  eventLoopMetrics.count = 0;
  eventLoopMetrics.minimum = null;
  eventLoopMetrics.maximum = null;
  eventLoopMetrics.averageRunningTotal = 0;

  return eventLoopEvent;
}

function getCpuData() {
  var count = cpuMetrics.count;
  var system = count ? cpuMetrics.system / count : 0;
  var user = count ? cpuMetrics.user / count : 0;
  var cpuEvent = {
    system: assertPositive(system),
    user: assertPositive(user),
    total: assertPositive(system + user),
    count: count,
  };

  // Reset values
  cpuMetrics.system = 0;
  cpuMetrics.user = 0;
  cpuMetrics.count = 0;

  return cpuEvent;
}

function getHttpData() {
  var httpEvent = {
    count: httpMetrics.count
  };

  // Reset Count
  httpMetrics.count = 0;

  return httpEvent;
}

function getProbeData(probeName) {

  // Get data for given probe
  var probeData = probeMetrics[probeName];
  var count = probeData.count;
  var average = count ? probeData.runningTotal / count : 0;

  var probeEvent = {
    count: count,
    minimum: probeData.min,
    maximum: probeData.max,
    average: average
  };

  // Reset values
  probeMetrics[probeName] = undefined;

  return probeEvent;
}

function getHeapData() {
  var jsonToReturn = heapMetrics;

  // Reset JSON
  heapMetrics = {};

  return jsonToReturn;
}

function getGcHeapData() {
  if (gcMetrics.count > 0) {
    var usedHeap = gcMetrics.used / gcMetrics.count;

    // Reset values
    gcMetrics.used = 0;
    gcMetrics.count = 0;
  } else {
    usedHeap = -1;
  }
  return usedHeap;
}

function getMessageData() {
  var oldMessageMetrics = messageMetrics;
  messageMetrics.sent = 0;
  messageMetrics.received = 0;
  return oldMessageMetrics;
}

function compareHistograms(oldHistogram, newHistogram) {
  var objectCounts = {};

  // Add all the instances currently in the heap.
  for (var type in newHistogram) {
    var newTuple = newHistogram[type];
    var oldTuple = oldHistogram[type];
    var diffTuple;
    if (!oldTuple) {
      diffTuple = newTuple;
    } else {
      diffTuple = {
        count: newTuple.count - oldTuple.count,
        size: newTuple.size - oldTuple.size,
      };
    }
    objectCounts[type] = diffTuple;
  }

  // Account for any types where all instances have been deleted.
  for (type in oldHistogram) {
    oldTuple = oldHistogram[type];
    diffTuple = objectCounts[type];
    if (!diffTuple) {
      diffTuple = {
        count: 0 - oldTuple.count,
        size: 0 - oldTuple.size,
      };
      objectCounts[type] = diffTuple;
    }
  }

  return objectCounts;
}

function initialise() {
  // Set up listeners for all the metrics here
  createEventLoopListener();
  createCpuListener();
  createHeapListener();
  createGcListener();
  createMessageListener();
  createHttpListener();

  for (var i in probeList) {
    // Create listeners for all probes
    createProbeListener(probeList[i]);
  }
}

function updateMetrics(probeName, value) {

  var metrics = probeMetrics[probeName];

  // update metrics accordingly (and if they haven't been defined yet)
  if (!metrics.min || value < metrics.min) {
    metrics.min = value;
  }
  if (!metrics.max || value > metrics.max) {
    metrics.max = value;
  }

  // Update other values accordingly
  metrics.runningTotal += value;
  metrics.count++;
}

function lrtime() {
  start();
  return appmetrics.lrtime();
}
