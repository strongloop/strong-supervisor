// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var _ = require('lodash');
var agent = require('./agent');
var async = require('async');

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
          if (agent().internal.supports.watchdog) {
            cb(true);
          } else {
            cb(false, 'Host platform does not support smart profiling.');
          }
        }
      },
    ]
  },
  // This was a legacy StrongOps feature, aka 'Slow Endpoints', it is not
  // strong-trace. It was enabled via presence of env var STRONGLOOP_TRACING.
  tracing: {
    name: 'Tracing',
    checks: [
      {
        check: function(cb) {
          cb(false, 'Appmetrics does not support tracing.');
        }
      },
    ]
  },
  metrics: {
    name: 'Metrics',
    checks: [
      {
        check: function(cb) {
          if (agent().metrics) {
            cb(true);
          } else {
            cb(false, 'Metrics is disabled.');
          }
        }
      },
    ]
  },
  cpuprofile: {
    name: 'CPU profiling',
    checks: []
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
              'Appmetrics does not support dynamic instrumentation.');
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
