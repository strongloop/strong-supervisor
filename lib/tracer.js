var assert = require('assert');

module.exports = tracer;

var TRACER = null;

function tracer(options) {
  assert((TRACER || options), 'options can be null, but not both');
  if (!TRACER) {
    TRACER = require('strong-trace')(options);
  }
  return TRACER;
}
