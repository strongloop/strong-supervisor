// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var expect = require('./control').expect;
var setup = require('./runctl-setup');
var tap = require('tap');
var waiton = require('./control').waiton;

tap.test('runctl ls', function(t) {
  setup(t);
  waiton(t, '', /worker count: 0/);
  expect(t, 'ls', /module-app@0.0.0/);
  expect(t, 'ls 1', /module-app@0.0.0/);
  expect(t, 'stop');
});
