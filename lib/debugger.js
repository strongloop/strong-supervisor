var debug = require('./debug')('debugger');
try {
  module.exports = require('strong-debugger');
} catch (err) {
  debug('Cannot load strong-debugger: ', err);
  module.exports = null;
}
