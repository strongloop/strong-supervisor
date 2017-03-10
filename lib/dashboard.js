// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var url = require('url');
var util = require('util');

exports = module.exports = function dashboard(uri, appmetrics, dashboard) {
  var options = {
    appmetrics: appmetrics,
    users: {},
  };
  util._extend(options, parse(uri));

  if (!options.path)
    return {};

  // appmetrics-dash calls the path 'url' XXX(sam) maybe it should not?
  options.url = options.path;

  options.docs = process.env.STRONGLOOP_DASHBOARD_DOCS;
  options.title = process.env.STRONGLOOP_DASHBOARD_TITLE;

  dashboard = dashboard || require('appmetrics-dash');

  dashboard.attach(options);

  return options;
};

exports._parse = parse;

// uri is:
// - ''
// - 'off'
// - 'on'
// - http://<host>:<port><path>
function parse(uri) {
  var options = {};

  if (!uri)
    return options;

  if (uri === '')
    return options;

  if (uri === 'off')
    return options;

  if (uri === 'on') {
    options.path = '/appmetrics-dash';
    return options;
  }

  uri = url.parse(uri);
  if (uri.pathname === '/')
    delete uri.pathname;

  options.path = uri.pathname || '/appmetrics-dash';

  assign('host', 'hostname');
  assign('port', 'port');

  function assign(to, from) {
    if (uri[from] != null && uri[from] !== '') {
      options[to] = uri[from];
    }
  }

  return options;
}
