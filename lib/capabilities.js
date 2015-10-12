'use strict';

var _ = require('lodash');
var agent = require('./agent');
var async = require('async');
var license = require('strongloop-license');

/*
 * List of capabilities that can be queries through the capabilities API.
 *
 * Check functions callback takes two arguments:
 *
 * {boolean} status Whether the check was successful.
 * {string} reason A user friendly explination of the reason the check failed.
 *
 * Reason messages should state what feature they are in reference to, and
 * must be properly formatted. Capitalize the first word of each sentence, and
 * terminate with a period.
 *
 * eg: 'Tracing license is missing or expired.'
 */

/* 7/2/2015
 * The heap and CPU profilers are supported on all platforms and
 * architectures.  CPU profiling in watchdog mode is only supported on
 * Linux (and soon OS X) on x86 and x64.
 */

var capabilities = {
  watchdog: {
    name: 'Smart profiling',
    checks: [
      {
        check: function(cb) {
          if (license('agent:watchdog')) {
            cb(true);
          } else {
            cb(false, 'Smart profiling license is missing or expired.');
          }
        }
      },
      {
        check: function(cb) {
          if (agent().internal.supports.watchdog) {
            cb(true);
          } else {
            cb(false, 'Host platform does not support smart profiling.');
          }
        }
      },
      {
        check: function(cb) {
          var addon = require('strong-agent/lib/addon');
          if (addon) {
            cb(true);
          } else {
            cb(false, 'Strong-agent addon not compiled.');
          }
        }
      }
    ]
  },
  tracing: {
    name: 'Tracing',
    checks: [
      {
        check: function(cb) {
          if (license('agent:tracing')) {
            cb(true);
          } else {
            cb(false, 'Tracing license is missing or expired.');
          }
        }
      },
      {
        check: function(cb) {
          if (process.env.STRONGLOOP_TRACING) {
            cb(true);
          } else {
            cb(false, 'Tracing is disabled.');
          }
        }
      }
    ]
  },
  metrics: {
    name: 'Metrics',
    checks: [
      {
        check: function(cb) {
          if (license('agent:metrics')) {
            cb(true);
          } else {
            cb(false, 'Metrics license is missing or expired.');
          }
        }
      },
      {
        check: function(cb) {
          if (agent().metrics) {
            cb(true);
          } else {
            cb(false, 'Metrics is disabled.');
          }
        }
      },
      {
        check: function(cb) {
          var addon = require('strong-agent/lib/addon');
          if (addon) {
            cb(true);
          } else {
            cb(false, 'Strong-agent addon not compiled.');
          }
        }
      }
    ]
  },
  cpuprofile: {
    name: 'CPU profiling',
    checks: [
      {
        check: function(cb) {
          var addon = require('strong-agent/lib/addon');
          if (addon) {
            cb(true);
          } else {
            cb(false, 'Strong-agent addon not compiled.');
          }
        }
      }
    ]
  },
  heapsnapshot: {
    name: 'Heap snapshot',
    checks: [
      {
        check: function(cb) {
          var heapdump = require('heapdump');
          if (heapdump) {
            cb(true);
          } else {
            cb(false, 'Heap snapshot not compiled.');
          }
        }
      }
    ]
  },
  patch: {
    name: 'patch',
    checks: [
      {
        check: function(cb) {
          if (agent().dyninst.metrics) {
            cb(true);
          } else {
            cb(false,
              'Agent is not configured to support dynamic instrumentation.');
          }
        }
      }
    ]
  },
  debugger: {
    name: 'debugger',
    checks: [
      {
        check: function(cb) {
          var dbg = require('./debugger');
          if (dbg) {
            cb(true);
          } else {
            cb(false, 'Strong-debugger not compiled.');
          }
        }
      }
    ]
  },
};

function listCapabilities() {
  return Object.keys(capabilities);
}

function queryCapabilities(featureName, callback) {
  var feature = capabilities[featureName];

  if (feature == null) {
    callback(false, ['Unknown capability.']);
    return;
  }

  var status = true;

  async.map(feature.checks, function(check, callback) {
    check.check(function(result, reason) {
      status = status && result;
      callback(null, reason);
    });
  }, function(err, reasons) {
    if (err) {
      callback(false, ['Could not verify support.']);
      return;
    }

    callback(status, _.compact(reasons));
  });
}

module.exports = {
  list: listCapabilities,
  query: queryCapabilities
};
