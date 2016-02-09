// Don't require agent until needed, early require causes its configuration to
// be loaded from the CWD, and the CWD isn't the directory of the application
// until run has had a chance to chdir() into it.

module.exports = agent;

function agent() {
  // FIXME(bajtos) this stub should be eventually removed and we should
  // use appmetrics instead
  return {
    config: {},
    use: function() {},
  };
}
