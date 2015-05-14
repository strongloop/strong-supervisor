var agent = require('./agent');

exports = module.exports = tracer;
exports.tracerOptions = tracerOptions;

var TRACER = null;

function tracer(options) {
  if (!TRACER && options) {
    TRACER = require('strong-trace')(options);
  }
  return TRACER;
}

function tracerOptions() {
  return {
    archiveInterval: 20000,
    accountKey: agent().config.appName,
    useHttp: false,
    lrtime: agent().internal.lrtime,
  };
}
