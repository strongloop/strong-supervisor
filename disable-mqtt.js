var fs = require('fs');
// NOTE(bajtos) By default, appmetrics is configured to connect to a local
// MQTT broker. The only reliable way how to disable this behaviour is to edit
// appmetrics.properties in module's installation directory.
try {
  var propFile = require.resolve('appmetrics/appmetrics.properties');
  var content = fs.readFileSync(propFile, 'utf-8');
  content = content.replace(
    /com.ibm.diagnostics.healthcenter.mqtt\s*=\s*on/,
    'com.ibm.diagnostics.healthcenter.mqtt=off');
  fs.writeFileSync(propFile, content);
} catch (err) {
  console.warn('Cannot modify appmetrics.properties:', err.message);
}
