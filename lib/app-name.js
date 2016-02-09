module.exports = function getAppName() {
  // Note: this is a trimmed down version of code in lib/watcher/status-wd.js
  // It does not take into account application name configured via
  //    cwd + '/strongloop.json
  //    home + '/strongloop.json'
  var pkgjson;
  try {
    pkgjson = require(process.cwd() + '/package.json');
  } catch (e) {
    pkgjson = {};
  }

  var candidate = process.env.STRONGLOOP_APPNAME ||
                  process.env.SL_APP_NAME ||
                  pkgjson.name;
  return Array.isArray(candidate) ? candidate[0] : candidate;
};
