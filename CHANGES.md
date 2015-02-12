2015-02-12, Version 1.4.1
=========================

 * Fix log tagging of statsd (Ryan Graham)


2015-01-21, Version 1.4.0
=========================

 * snapshot: remove extra .heapsnapshot in msg (Sam Roberts)

 * run: support cluster_size env for backwards compat (Sam Roberts)

 * run: allow uncontrolled clustering (Sam Roberts)

 * run: stop using cluster-control.loadOptions (Sam Roberts)

 * run,runctl: control options consistent with pm (Sam Roberts)

 * run: remove debug code introduced by c4082951774 (Sam Roberts)

 * Fix bad CLA URL in CONTRIBUTING.md (Ryan Graham)

 * Add Watchdog timeout to cpu-start notification (Krishna Raman)


2014-12-15, Version 1.3.0
=========================

 * package: strong-statsd update to ^2.x (Sam Roberts)


2014-12-12, Version 1.2.2
=========================

 * package: use debug v2.x in all strongloop deps (Sam Roberts)


2014-12-05, Version 1.2.1
=========================

 * package: need latest strong-agent, strong-statsd (Sam Roberts)


2014-12-05, Version 1.2.0
=========================

 * run: syslog URL uses `&`, not `,`, fix docs (Sam Roberts)

 * syslog: replace node-syslog with strong-fork-syslog (Ryan Graham)

 * package: .gitignore .heapdump files (Sam Roberts)

 * run: fix appname when not profiling (Sam Roberts)

 * run: support multiple --metrics backends (Sam Roberts)

 * bin: rename .usage files to .txt (Sam Roberts)

 * run: metrics scope is no longer configurable (Sam Roberts)

 * run: make statsd flush interval configurable (Sam Roberts)

 * test: always print exit status (Sam Roberts)

 * test: print SL env vars from module-app (Sam Roberts)

 * test: remove extra strong-supervisor from message (Sam Roberts)

 * test: check cpu hit counts >= 1 (Sam Roberts)

 * Support running app.js as 'sl-run app' (Ryan Graham)

 * test: more explicit argument parsing (Ryan Graham)

 * Look for package.json to determine app root (Ryan Graham)

 * runctl: add timeout arg to start-cpu-profiling (Ben Noordhuis)

 * metrics: deal with app and host names with a `.` (Sam Roberts)

 * Add IPC notifications for tracking and profiling (Krishna Raman)

 * metrics: forward internal metrics to parent (Sam Roberts)

 * package: strong-agent-statsd is not directly used (Sam Roberts)

 * test: cpu profiling now works on v0.10 (Sam Roberts)

 * run: exit if metrics URL is invalid (Sam Roberts)

 * Use --log mechanism for statsd process (Ryan Graham)

 * Expose worker log transformer/wrapper via config (Ryan Graham)

 * run: directly support statsd backends (Sam Roberts)

 * test: delete STRONGLOOP_METRICS after each test (Sam Roberts)

 * run: refactor usage into a text file (Sam Roberts)

 * package: cluster-control and log-transformer 1.x (Sam Roberts)

 * Make cpu-stop consistent with heap-snapshot (Krishna Raman)

 * runctl: notify parent process of worker status (Sam Roberts)


2014-10-02, Version 1.1.0
=========================

 * runctl: replace commander with getopt (Sam Roberts)

 * test: fix test, it must set `pass` before exit (Sam Roberts)

 * Update contribution guidelines (Ryan Graham)

 * test: disable loopback 1.0 tests, which never pass (Sam Roberts)

 * patch: print OK on succesful patch (Sam Roberts)

 * patch: report failure to find script name (Sam Roberts)

 * package: document STRONGLOOP_METRICS (Sam Roberts)

 * package: describe how to get a metrics license (Sam Roberts)

 * package: depend on strong-agent ^1.0.0 (Sam Roberts)

 * runctl: support patching metrics in dynamically (Sam Roberts)


2014-09-11, Version 1.0.1
=========================

 * Make heapdump an optional dependency (Krishna Raman)

 * test: mark test as TAP only (Ryan Graham)

 * package: add keywords (Sam Roberts)


2014-09-08, Version 1.0.0
=========================

 * test: fix skipping of tap helper by mocha (Sam Roberts)

 * runctl: add npm ls-like package listing (Sam Roberts)


2014-09-02, Version 0.3.4
=========================

 * test: skip object tracking test (Sam Roberts)

 * Allow --metrics and --no-profile at the same time (Ryan Graham)


2014-08-26, Version 0.3.3
=========================

 * Make cpu and heap profiling file names consistent (Sam Roberts)

 * Add *.heapsnapshot to .gitignore (Krishna Raman)

 * runctl: don't attach runctl server in workers (Sam Roberts)

 * runctl: add heap-snapshot command (Krishna Raman)

 * run: support control and exit via node ipc (Sam Roberts)

 * run: fix --no-channel option (Sam Roberts)

 * control: refactor control channel naming (Sam Roberts)

 * runctl: clarify fork response and usage (Sam Roberts)

 * Allow master logging in --metrics mode (Ryan Graham)

 * Export supervisor's logger in worker processes (Ryan Graham)

 * cluster: use 0 as cluster master's worker id (Ryan Graham)

 * logger: only use log transformer in clustered mode (Ryan Graham)

 * cpu-start/stop: command line CPU profiling (Sam Roberts)

 * test: use a common debug wrapper (Sam Roberts)

 * debug: introduce a debug wrapper (Sam Roberts)

 * Generate useful default scope for statsd metrics (Ryan Graham)

 * Add %a and %h to core string expander (Ryan Graham)

 * Rename logname.generate to expander.expand (Ryan Graham)


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

 * test: git ignore _test-link (Sam Roberts)

 * Update strong-control-channel dependency to 0.2.0 (Sam Roberts)

 * run: fix missing require in lib/channel (Sam Roberts)

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


2014-07-03, Version 0.2.4
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


2014-02-19, Version 0.2.0
=========================

 * Depend on strong-cluster-control 0.4.0 (Sam Roberts)

 * Describe command as 'slc run' when run by slc (Sam Roberts)

 * Prefer cluster to size in command line and config (Sam Roberts)

 * Apply Dual MIT/StrongLoop license (Sam Roberts)

 * Fix malformed URLs in README (Sam Roberts)


2014-02-13, Version 0.1.2
=========================



2014-02-13, Version finish
==========================

 * Depend on 0.3 branch of strong-agent (Sam Roberts)

 * Fix heading indentation mismatches (Sam Roberts)


2014-01-27, Version 0.1.1
=========================

 * Change lb-app to private, in package.json (Sam Roberts)

 * Install test dependencies in pretest (Sam Roberts)

 * Use a --size of 'off' to get no clustering (Sam Roberts)


2014-01-25, Version 0.1.0
=========================

 * Update strong-cluster-control dependency to ~0.3.0 (Sam Roberts)

 * Review and tweak README and sl-run help message (Sam Roberts)

 * Add sl-run as a CLI name (Sam Roberts)

 * Update README to describe the supervisor features (Sam Roberts)

 * Log supervisor master pid on startup (Sam Roberts)

 * Log changes in size setting (Sam Roberts)

 * Quote the control path in log output (Sam Roberts)

 * Use strong-agent quiet option in workers (Sam Roberts)

 * Cluster size defaults to number of CPUs (Sam Roberts)

 * use standard signals to shutdown or restart (Sam Roberts)

 * Increase test timeouts, CI is slow (Sam Roberts)

 * update readme with module usage information (Sam Roberts)

 * MIT license (Sam Roberts)

 * write pid to a file if requested (Sam Roberts)

 * detached children redirect output to a file (Sam Roberts)

 * supervisor can run detached (as a daemon) (Sam Roberts)

 * Print the port that will be listened to (Sam Roberts)

 * StrongOps profiling can optionally be disabled (Sam Roberts)

 * Log supervisor and worker activity to console (Sam Roberts)

 * cleanup whitespace in generated files (Sam Roberts)

 * require application as if it was the main module (Sam Roberts)

 * test help and version arguments (Sam Roberts)

 * fix test assumptions about truth and arguments (Sam Roberts)

 * arguments should be passed thru to app (Sam Roberts)

 * test runner with module app (Sam Roberts)

 * install test dependencies (Sam Roberts)

 * express module app for testing runner (Sam Roberts)

 * test runner with express app (Sam Roberts)

 * test supervisor with loopback (Sam Roberts)

 * pull config evaluation into its own module (Sam Roberts)

 * sort package.json properties meaningfully (Sam Roberts)

 * refactor options processing to cluster master (Sam Roberts)

 * clusterctl utility installed as peer dep of slr (Sam Roberts)

 * runner supports options, and app arguments (Sam Roberts)

 * default cluster size to 1 so app is supervised (Sam Roberts)

 * basic run of a package in current working directory (Sam Roberts)

 * express app for testing runner (Sam Roberts)

 * loopback test app, add strong-agent profiling (Sam Roberts)

 * loopback test app, doesn't run when clustered (Sam Roberts)

 * loopback test app, remove broken cookie middleware (Sam Roberts)

 * loopback test app, remove agent and cluster-control (Sam Roberts)

 * loopback test app, removed optional dependencies (Sam Roberts)

 * default loopback project for testing runner (Sam Roberts)

 * npm package meta-data (Sam Roberts)


2013-12-23, Version INITIAL
===========================

 * First release!
