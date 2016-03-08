var os = require('os');
var path = require('path');
var appmetrics;
var appmetricsStarted = false;
var amapi;

// Global objects to store metric data
var eventLoopMetrics = {
  count: 0,
  averageRunningTotal: 0
};
var cpuMetrics = {
  system: 0,
  user: 0,
  count: 0
};
var httpMetrics = {
  count: 0
};
var probeList =
    ['leveldown', 'memcached', 'mongo', 'mysql', 'oracle', 'oracledb',
        'postgres', 'redis', 'socketio', 'strong-oracle'];
var probeMetrics = {};
var heapMetrics = {
  total: 0,
  used: 0,
  count: 0
};
var gcMetrics = {
  used: 0,
  count: 0
};
var messageMetrics = {
  sent: 0,
  received: 0
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
    var httpData = getHTTPData();
    var heapData = getHeapData();
    var usedHeap = getGCHeapData();
    var messageData = getMessageData();

    // Fire callback with data to match the strong-agent docs
    callback('loop.count', eventLoopData.count);
    callback('loop.minimum', eventLoopData.minimum);
    callback('loop.maximum', eventLoopData.maximum);
    callback('loop.average', eventLoopData.average);

    callback('cpu.system', cpuData.system);
    callback('cpu.total', cpuData.total);
    callback('cpu.user', cpuData.user);

    callback('http.connection.count', httpData.count);

    // Callback with probe data of each probe if there have been events
    var probeData;

    for (var i in probeList) {
      if (probeMetrics[probeList[i]]) {
        probeData = getProbeData(probeList[i]);
        callback(probeList[i] + '.count', probeData.count);
        callback(probeList[i] + '.average', probeData.average);
        callback(probeList[i] + '.minimum', probeData.minimum);
        callback(probeList[i] + '.maximum', probeData.maximum);
      }
    }

    if (usedHeap > 0) {
      callback('gc.heap.used', usedHeap);
    }

    callback('heap.total', heapData.total);
    callback('heap.used', heapData.used);

    if (messageData.sent > 0 || messageData.received > 0) {
      callback('messages.out.count', messageData.sent);
      callback('messages.in.count', messageData.received);
    }

  }, callbackInterval).unref();
  setInterval(function() {
    if (objectTrackingEnabled) {
      var histogram = appmetrics.getObjectHistogram();
      var objectCounts = compareHistograms(lastObjectHistogram, histogram);
      lastObjectHistogram = histogram;
      // get object stats
      for (var type in objectCounts) {
        var tuple = objectCounts[type];
        // Don't output events for no change? TODO - What's the
        // correct
        // behaviour here?
        // TODO - Should we skip "weird" object types?
        if (tuple.count !== 0 && tuple.size !== 0) {
          callback('object.' + type + '.count', tuple.count);
          callback('object.' + type + '.size', tuple.size);
        }
      }
    }

  }, objectTrackingCallbackInterval).unref();
}

function start() {
  if (!appmetricsStarted) {
    appmetrics = require('appmetrics');
    appmetrics.enable('eventloop');
    amapi = appmetrics.monitor();
    initialise();
    appmetricsStarted = true;
  }
}

function on() {

}

function internal_on() {

}
/* eslint-disable no-unused-vars */
function profile(arg1, arg2, arg3) {
}

function configure(options) {

}
/* eslint-enable no-unused-vars */

// CPU Profiling
function startCpuProfiling() {
  start();
  // If we aren't profiling already
  if (!profiling) {
    profiling = true;

    // Instruct appmetrics to return JSON formatting and enable profiling
    appmetrics.sendControlCommand('profiling_node', 'on,profiling_node_v8json');
    appmetrics.enable('profiling');

  }
}

function stopCpuProfiling(callback) {
  if (profiling) {

    // Listen for JSON coming back from appmetrics
    amapi.once('profiling', function(data) {
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
function createEventLoopListener() {
  amapi.on('eventloop', function(res) {

    var latency = res.latency;

    // Update min and max accordingly

    if (!(latency.min > eventLoopMetrics.min)) {
      eventLoopMetrics.min = latency.min;
    }

    if (!(latency.max < eventLoopMetrics.max)) {
      eventLoopMetrics.max = latency.max;
    }

    eventLoopMetrics.count++;
    eventLoopMetrics.averageRunningTotal += latency.avg;
  });
}

function createCpuListener() {
  amapi.on('cpu', function(cpu) {
    cpuMetrics.system += (cpu.system * 100);
    cpuMetrics.user += (cpu.process * 100);
    cpuMetrics.count++;
  });
}

function createHeapListener() {
  amapi.on('heap', function(res) {
    heapMetrics.total += res.total;
    heapMetrics.used += res.used;
    heapMetrics.count++;
  });
}

function createGCListener() {
  amapi.on('gc', function(res) {
    gcMetrics.used += res.used;
    gcMetrics.count++;
  });
}

function createHTTPListener() {
  /* eslint-disable no-unused-vars */
  amapi.on('http', function(args) {
    /* eslint-enable no-unused-vars */
    // All we need to do is increment the count
    httpMetrics.count++;
  });
}

function createMessageListener() {
  // Map the event types from axon and strong mq to whether they
  // were send or receive events.
  amapi.on('strong-mq', incrementCounts);
  amapi.on('axon', incrementCounts);
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
  amapi.on(probeName, function(res) {
    var duration = res.duration;

    // If no metrics object exists, create one
    if (!probeMetrics[probeName]) {
      probeMetrics[probeName] = {
        count: 0,
        runningTotal: 0
      };
    }

    // Update all metrics accordingly
    updateMetrics(probeName, duration);
  });
}

function getEventLoopData() {
  // Calculate average
  var count = eventLoopMetrics.count;
  var average = eventLoopMetrics.averageRunningTotal / count;

  // Build JSON
  var eventLoopEvent = {
    count: count,
    minimum: eventLoopMetrics.min,
    maximum: eventLoopMetrics.max,
    average: average
  };

  // Reset values
  eventLoopMetrics.count = 0;
  eventLoopMetrics.min = null;
  eventLoopMetrics.max = null;
  eventLoopMetrics.averageRunningTotal = 0;

  return eventLoopEvent;
}

function getCpuData() {
  var system = cpuMetrics.system / cpuMetrics.count;
  var user = cpuMetrics.user / cpuMetrics.count;
  var cpuEvent = {
    system: system,
    user: user,
    total: system + user
  };

  // Reset values
  cpuMetrics.system = 0;
  cpuMetrics.user = 0;
  cpuMetrics.count = 0;

  return cpuEvent;
}

function getHTTPData() {
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

function getGCHeapData() {
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
  createGCListener();
  createMessageListener();
  createHTTPListener();

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

// Export the desired functions
var metrics = {
  startCpuProfiling: startCpuProfiling,
  stopCpuProfiling: stopCpuProfiling,
  startTrackingObjects: startTrackingObjects,
  stopTrackingObjects: stopTrackingObjects
};

var config = {
  hostname: os.hostname(),
  appName: path.basename(process.argv[1]),
  key: 'testkey'
};

var internal = {
  on: internal_on
};

exports.use = use;
exports.metrics = metrics;
exports.config = config;
exports.profile = profile;
exports.start = start;
exports.configure = configure;
exports.on = on;
exports.internal = internal;
