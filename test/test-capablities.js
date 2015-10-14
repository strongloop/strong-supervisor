var capabilities = require('../lib/capabilities');
var tap = require('tap');

tap.test('targetctl capabilities', function(t) {
  var caps = ['watchdog', 'tracing', 'metrics',
      'cpuprofile', 'heapsnapshot', 'patch', 'debugger'];
  var list = capabilities.list();
  t.match(list, caps, 'Capabilities are defined.');
  list.forEach(function(f) {
    t.test('Capabilities for ' + f, function(t) {
      capabilities.query(f, function(result, reasons) {
        t.comment('Feature %j: %j, %j', f, result, reasons);
        t.ok(result || reasons.length, 'returned success or list of failures');
        t.end();
      });
    });
  });

  // heapsnapshot should work everywhere these tests run
  t.test('heapsnapshot', function(t) {
    capabilities.query('heapsnapshot', function(result, reasons) {
      t.ok(result, 'heapsnapshot should be available');
      t.equal(reasons.length, 0, 'heapsnapshot should have no failure reasons');
      t.end();
    });
  });

  t.end();
});
