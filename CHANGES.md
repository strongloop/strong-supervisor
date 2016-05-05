2016-05-05, Version 3.3.3
=========================

 * package: remove strong-debugger (Sam Roberts)

 * package: ignore test output (Sam Roberts)


2016-04-11, Version 3.3.2
=========================

 * package: update to eslint@2, lint test/ (Sam Roberts)

 * Update usage in README (Sam Roberts)

 * lint: fix style warnings in lib/logger.js (Ben Noordhuis)

 * Refer to licenses with a link (Sam Roberts)


2015-10-28, Version 3.3.1
=========================

 * lint: update to eslint@1 and strongloop rules (Ryan Graham)

 * Fix incorrect handling of relative symlinks (Ryan Graham)


2015-10-14, Version 3.3.0
=========================

 * Rework debugger as an optional capability (Miroslav Bajtoš)

 * fix regression in handling of symlinked pwd (Ryan Graham)


2015-10-05, Version 3.2.2
=========================

 * runctl: only restart when tracing is changing (Sam Roberts)


2015-09-28, Version 3.2.1
=========================

 * package: make binary debugger an optional dep (Sam Roberts)

 * Use strongloop conventions for licensing (Sam Roberts)

 * Report debuggerVersion in status messages (Miroslav Bajtoš)


2015-09-15, Version 3.2.0
=========================

 * test: improve assertion messages (Miroslav Bajtoš)

 * Add a new notification: 'debugger-status' (Miroslav Bajtoš)

 * runctl: new commands dbg-start and dbg-stop (Miroslav Bajtoš)

 * runctl: re-chdir to PWD on restart (Sam Roberts)

 * test: update to tap@1.3.4 (Sam Roberts)

 * test: only test watchdog if agent says it works (Ryan Graham)

 * Use modern-syslog, not our fork of node-syslog (Sam Roberts)

 * test: adjust restart order assumption (Ryan Graham)

 * test: use worker 2 for tests (Ryan Graham)

 * test: don't require strong-fork-syslog (Ryan Graham)

 * test: replace SL_ENV usage (Ryan Graham)

 * test: test smart profiling on non-Linux (Ryan Graham)

 * test: make v1-app more interesting to profiler (Ryan Graham)

 * deps: upgrade to strong-agent@2 (Ryan Graham)


2015-07-21, Version 3.0.2
=========================

 * runctl: fork ppid should not depend on msg order (Sam Roberts)


2015-07-20, Version 3.0.1
=========================



2015-07-20, Version 3.0.0
=========================

 * fix accidental heapdump generation on log re-open (Ryan Graham)

 * test: use try-thread-sleep to speed up tests (Ryan Graham)

 * test: skip tests that require license (Ryan Graham)

 * run: print cleaner error when WS channel dies (Ryan Graham)

 * test: fix test-ipcctl-notifications (Ryan Graham)

 * runctl: ws errors are fatal in new api (Sam Roberts)

 * ws: reconnect WS ctl channel on error (Ryan Graham)

 * update dependencies (Ryan Graham)

 * run: ws endpoint now has default (Sam Roberts)

 * Implement Capabilities API (Setogit)

 * runctl: handle signal-type messages (Bert Belder)

 * fix regression in PWD/CWD handling caused by #142 (Ryan Graham)

 * run: support simple start scripts as fallback (Ryan Graham)

 * refactor: app path resolution (Ryan Graham)

 * refactor: extract app path lookup as function (Ryan Graham)

 * make status message as complete as started message (Ryan Graham)

 * disable node core timer wrapping for tracing navigation clarity (Tetsuo Seto)

 * Override hostname returned in trace packet (Krishna Raman)

 * add agent probes to the black list (Tetsuo Seto)

 * honour path in --control ws:url/path (Ryan Graham)

 * Use worker-id (wid) consistently in notifications (Krishna Raman)

 * Add new fields to started message (Krishna Raman)

 * package: use SPDX expression for license (Ryan Graham)

 * Add Capability API Support (Joseph Tary)

 * Allow WS channel in standalone mode (Krishna Raman)


2015-06-03, Version 2.0.0
=========================

 * package: depend on strong-url-defaults ^1.1.x (Sam Roberts)

 * watcher: work around trace bug in status-wd (Sam Roberts)

 * Send application name with status:wd updates (Krishna Raman)

 * Support websocket control channel (Sam Roberts)

 * test: check result of set-size, not forks (Sam Roberts)

 * trace-object: emit record as string, not object (Ben Noordhuis)

 * targetctl: return profile in response msg (Sam Roberts)

 * debug: increase size of json message dumps (Sam Roberts)

 * tracer: delay app name detection until start (Sam Roberts)

 * test: unless debug is requested, log to a file (Sam Roberts)

 * test: fix trace objects test (Krishna Raman)

 * Enabled tracing to be enabled/disabled via command (Krishna Raman)

 * tracer: seperate start from access (Sam Roberts)

 * tracer: use agent to get app name (Sam Roberts)

 * runctl: allow cluster size to be set to CPUs (Sam Roberts)

 * tracer: initialize tracer before agent (Sam Roberts)

 * lint: eslint the watcher tests (Sam Roberts)

 * Add support for watchdog stallout parameter (Sam Roberts)

 * watcher: support handle.emit in master (Sam Roberts)

 * debug: 60 chars of json isn't enough (Sam Roberts)

 * usage: control is "runctl", not "pmctl" (Sam Roberts)

 * tracer: inject link builder into agent (Sam Roberts)

 * tracer: pass fast low-res timer from agent addon (Sam Roberts)

 * fix typo (Setogit)

 * test: improve runctl-clusterctl robustness (Sam Roberts)

 * Refactor trace-object as a watcher (Sam Roberts)

 * watcher: pass config object to watchers (Sam Roberts)

 * Refactor agent:trace (slow endpoints) as a watcher (Sam Roberts)

 * Refactor express-records as a watcher (Sam Roberts)

 * Replace status-wd with a watcher-based refactor (Sam Roberts)

 * config: sort code before refactoring (Sam Roberts)

 * Move tracer options to lib/tracer (Sam Roberts)

 * eslint: new shouldn't require parens (Sam Roberts)

 * test: bump timeout for CI (Ryan Graham)

 * test: convert synchronous tests to tap tests (Ryan Graham)

 * test: convert test-runctl-notifications to tap (Ryan Graham)

 * test: fix test-runctl-env for tap@1 (Ryan Graham)

 * test: fix test-run-trace (Ryan Graham)

 * test: fix test-run-express-records for tap@1 (Ryan Graham)

 * test: fix test-run-agent-traces for tap@1 (Ryan Graham)

 * test: convert test-ipctl-notifications to tap@1 (Ryan Graham)

 * test: update test-run-metrics to work with tap@1 (Ryan Graham)

 * test: use t.spawn for mocha test wrapper (Ryan Graham)

 * test: remove helper.pass check (Ryan Graham)

 * test: ensure helpers don't confuse TAP output (Ryan Graham)

 * tests: upgrade tap to ^1.0.2 (Ryan Graham)


2015-05-08, Version 1.6.0
=========================

 * runctl: extend status message (Ryan Graham)

 * test: make test-runctl-notifications less fragile (Ryan Graham)

 * test: fix test-runctl-clusterctl (Ryan Graham)

 * refactor test-run-process-control to use tap module (Ryan Graham)

 * Make trace-object lazy-load its options (Ryan Graham)

 * don't load cluster-only features when unclustered (Ryan Graham)

 * Send notifications to connected runctl clients (Ryan Graham)

 * test: wrap mocha tests in tap (Ryan Graham)

 * attach pst (Process Start Time) to all messages (Ryan Graham)


2015-04-21, Version 1.5.2
=========================

 * set enableTracing instead of trace (Setogit)

 * lint: fix lint errors in trace-object (Ryan Graham)

 * test: including linting as pretest (Ryan Graham)

 * fix supervisor when clustered without parent IPC (Ryan Graham)

 * test: remove noise from env tests (Ryan Graham)

 * Don't send status until after control starts (Sam Roberts)

 * pass tracerOptions to the first strong-trace call only (Setogit)


2015-04-14, Version 1.5.1
=========================

 * package: make async a regular dependency (Ryan Graham)


2015-04-14, Version 1.5.0
=========================

 * XXX (Sam Roberts)

 * package: update eslint to 0.18 (Sam Roberts)

 * runctl: add a status:wd notification (Sam Roberts)

 * runctl: always send a cluster status (Sam Roberts)

 * package: lint clean (Sam Roberts)

 * Update README for strong-pm.io (Sam Roberts)

 * Enable tracing based on --trace option (Krishna Raman)

 * Add tracing support (Setogit)

 * Add runctl env-get command to dump environment (Ryan Graham)

 * add env-set and env-unset runctl commands (Ryan Graham)

 * internal: remove double fork() in debug (Ryan Graham)

 * test: test apps use ephemeral ports (Ryan Graham)

 * add --[no-]log-decoration to disable log prefixes (Ryan Graham)

 * package: use eslint from npm, not github (Sam Roberts)

 * package: single lint script (Sam Roberts)

 * test: update test to match change in #97 (Ryan Graham)

 * package: add support for jscs (Sam Roberts)

 * package: add support for eslint (Sam Roberts)

 * run: emit agent:trace event to parent (Sam Roberts)

 * test: increase coverage on test-run-express-records (Sam Roberts)

 * run: allow profiling to be explicitly started (Sam Roberts)

 * test: fix test-run-metrics after broken refactor (Sam Roberts)

 * test: do not trigger node bug with fd mapping (Sam Roberts)

 * test: don't fully load helper when skipping (Ryan Graham)

 * test: bump timeouts for some supervisor tests (Ryan Graham)

 * deps: upgrade heapdump to work with v0.12 and iojs (Ryan Graham)

 * test: fix no-such-pid lookup (Ryan Graham)

 * fixup! remove `runctl` before start (Miroslav Bajtos)

 * Forward "express:usage-record" to strong-pm (Miroslav Bajtoš)

 * Fix log tagging of statsd (Ryan Graham)

 * test: extract method helper.runWithControlChannel (Miroslav Bajtoš)


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


2014-11-03, Version 1.1.1
=========================

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
