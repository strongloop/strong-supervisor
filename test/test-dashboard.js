// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var dashboard = require('../lib/dashboard');
var fmt = require('util').format;
var tap = require('tap');

expect(undefined, {});

expect(null, {});

expect('', {});

expect('off', {});

expect('on', {
  path: '/appmetrics-dash',
});

expect('http:', {
  path: '/appmetrics-dash',
});

expect('http://', {
  path: '/appmetrics-dash',
});

expect('http:/path', {
  path: '/path'});

expect('http:///path', {
  path: '/path',
});

expect('http://', {
  path: '/appmetrics-dash',
});

expect('http:///path', {
  path: '/path',
});

expect('http://host:80/path', {
  path: '/path', host: 'host', port: '80',
});

expect('http://:80/path', {
  path: '/path', port: '80',
});

expect('http://host/path', {
  path: '/path', host: 'host',
});

expect('http://host:80', {
  path: '/appmetrics-dash',
  host: 'host', port: '80',
});

function expect(uri, options) {
  tap.test(fmt('%j is %j', uri, options), function(t) {
    var result = dashboard._parse(uri);
    t.same(result, options);
    t.end();
  });
}

tap.test('explicit on', function(t) {
  var appmetrics = 'AM';
  var appmetricsDash = {
    attach: function(options) {
      t.similar(options, {appmetrics: appmetrics, url: '/appmetrics-dash'});
    },
  };

  t.plan(1);

  dashboard('on', appmetrics, appmetricsDash);
});

tap.test('explicit off', function(t) {
  var appmetrics = 'AM';
  var appmetricsDash = {
    attach: function(options) {
      t.assert(false, 'should not be called');
    },
  };

  dashboard('off', appmetrics, appmetricsDash);
  t.ok(true);
  t.end();
});
