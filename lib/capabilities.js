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
var capabilities = {
  watchdog: {
    name: 'smart profiling',
    checks: [
      {
        check: function(cb) {
          if (agent().internal.supports.watchdog) {
            cb(true);
          } else {
            cb(false, 'Host platform does not support smart profiling.');
          }
        }
      }
    ]
  }
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

    callback(status, reasons);
  });
}

module.exports = {
  list: listCapabilities,
  query: queryCapabilities
};
