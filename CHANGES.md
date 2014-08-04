2014-08-06, Version 0.3.2
=========================

 * runctl: update usage in README (Sam Roberts)

 * runctl: rename object tracking commands (Sam Roberts)

 * Update strong-cli references to strongloop (Krishna Raman)

 * test: remove options reference from lb-app (Ryan Graham)

 * test: don't let tap guard kill mocha (Ryan Graham)

 * test: fix broken references to bin/slr.js (Ryan Graham)


2014-07-23, Version 0.3.1
=========================

 * Add __module so `slc -v` can report agent version (Krishna Raman)

 * Update package license to match LICENSE.md (Sam Roberts)


2014-07-21, Version 0.3.0
=========================

 * metrics: support `--metrics X` and `--metrics=X` (Sam Roberts)

 * Allow control channel and metrics simultaneously (Sam Roberts)

 * package: cleanup, sort, and bin script rename (Sam Roberts)

 * runctl: support start and stop of object tracking (Sam Roberts)

 * package: add tap test script (Sam Roberts)

 * test: refactor runctl test into a helper module (Sam Roberts)

 * run: unlink control channel on startup (Sam Roberts)

 * test: use ephemeral ports in test servers (Sam Roberts)

 * package: update debug to 1.x (Sam Roberts)

 * runctl: run-time control of supervisor (Sam Roberts)

 * Ran file through fixjsstyle (Krishna Raman)

 * Fix clustered mode SIGINT/SIGTERM exit code (Krishna Raman)


2014-07-02, Version 0.2.4
=========================

 * metrics: fix wrong url part being used for host (Sam Roberts)

 * Move log FILE usage details to end of output (Sam Roberts)

 * Disable metrics test that causes loopback to fail (Sam Roberts)

 * Support using the statsd middleware (Sam Roberts)

 * Rename slr script to slr.js (Sam Roberts)

 * restart: follow symlinks when restarting cluster (Sam Roberts)

 * chdir: tracks PWD like shell `cd` builtin does (Sam Roberts)

 * gitignore: sort, and remove irrelevant entries (Sam Roberts)

 * test: install test dependencies in top-level (Sam Roberts)


2014-06-18, Version 0.2.3
=========================

 * version: include strong-agent, cluster-control (Sam Roberts)

 * Fix log rotation (Ryan Graham)

 * Update command usage in README.md (Ryan Graham)

 * Describe --log option as cluster mode option (Ryan Graham)

 * Advise against using --detach in production (Ryan Graham)

 * Update README with logging feature details (Ryan Graham)

 * Record supervisor start/stop/restart in log (Ryan Graham)

 * Log notice about non-clustered mode to stdout (Ryan Graham)

 * Setup logging before clustering (Ryan Graham)

 * Pass supervisor logger to strong-agent (Ryan Graham)

 * Add --syslog option for direct syslog logging (Ryan Graham)

 * Allow supervisor log timestamps to be disabled (Ryan Graham)

 * Allow worker log timestamps to be disabled (Ryan Graham)

 * Add support for '| cmd' as log name for piping (Ryan Graham)

 * Simplify LogWriter by making it a PassThrough (Ryan Graham)

 * more pipes, less mistakes (Ryan Graham)

 * Update logging documentation to current behaviour. (Sam Roberts)

 * Load environment from app's .env file, if present. (Sam Roberts)

 * Support SIGHUP cluster restarting when undetached. (Sam Roberts)

 * Remove listener limit on supervisor's log stream (Ryan Graham)

 * Log reopening of log files (Ryan Graham)

 * Use a simple logger for supervisor logs (Ryan Graham)

 * Don't close supervisor log on worker exit (Ryan Graham)

 * Make default log name work non-detached (Ryan Graham)

 * Re-open logfiles on SIGUSR2 (Ryan Graham)

 * Use strong-log-transformer for log tagging (Ryan Graham)

 * Ensure cluster uses correct args for children (Ryan Graham)

 * Support log templating for supervisor log name (Ryan Graham)

 * test: Add test for --detach option (Ryan Graham)

 * Initial logname templating (Ryan Graham)

 * Initial %i style string replacer (Ryan Graham)

 * doc: add CONTRIBUTING.md and LICENSE.md (Ben Noordhuis)

 * .gitignore: ignore strongloop.json test files (Sam Roberts)

 * readme: remove incorrect license section (Sam Roberts)


2014-04-10, Version 0.2.2
=========================

 * strong-agent update to ~0.4.0 (Sam Roberts)


2014-03-28, Version 0.2.1
=========================

 * Fix detach after chdir to an app's location (Sam Roberts)

 * Allow detach even when not clustering (Sam Roberts)

 * Re-require strong-cluster-control so agent sees it (Sam Roberts)

 * Update README with current usage information (Sam Roberts)

 * test: Use ephemeral ports for test apps (Ryan Graham)
