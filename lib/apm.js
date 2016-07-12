// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var path = require('path');

// Default paths for APM installation
var apmLinuxPath = '/opt/ibm/apm/agent';
var apmWindowsPath = 'C:\\IBM\\APM';

module.exports = function enablePerformanceMetrics() {
  var defaultApmPath = (process.platform === 'win32') ? apmWindowsPath :
    apmLinuxPath;
  var apmPath = process.env.STRONGLOOP_APM_PATH || defaultApmPath;
  var knj = path.resolve(apmPath, 'lx8266', 'nj', 'bin', 'plugin',
    'knj_methodtrace');
  require(knj);
  return knj;
};
