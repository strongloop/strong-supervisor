// Don't require agent until needed, early require causes its configuration to
// be loaded from the CWD, and the CWD isn't the directory of the application
// until run has had a chance to chdir() into it.

module.exports = agent;

function agent() {
  // XXX sl-run.js sets the agent logger, and the quiet option, that won't
  // happen if strongops isn't being used, unless we figure out a way to do it
  // here.
  return require('strong-agent');
}
