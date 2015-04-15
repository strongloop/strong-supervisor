module.exports = tracer;

var TRACER = null;

function tracer(options) {
  if (!TRACER && options) {
    TRACER = require('strong-trace')(options);
  }
  return TRACER;
}
