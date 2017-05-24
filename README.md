# strong-supervisor

Supervise a node application package, seperating deployment concerns (logging,
monitoring, run-time control) from the application source.

*NOTE:* strong-supervisor@5 has dropped support for some legacy features that
are no longer relevant to its main use-cases.

- running detached: this mode existed to provide a kindof light weight daemon,
  but didn't include the generation of the init.d/systemd/upstart scripts required
  for production usage, and those system startup tools already take care of
  daemonization, so the feature is being removed. Use
  start-stop-daemon or https://www.npmjs.com/package/strong-service-install with
  the strong-supervisor.
- running unclustered: this mode disabled most features of strong-supervisor
  but still started the agent, originally intended to report to the StrongOps
  service even when running apps on dev laptops, the service no longer exists,
  so the feature is no longer supported and needs no replacement.


## Installation

`sl-run` and `sl-runctl` can be installed with:

    npm install -g strong-supervisor


## Features

### Appmetrics Monitoring

Supervisor and its workers are monitored using
[appmetrics](https://github.com/RuntimeTools/appmetrics), which is open source
and free for use under the Apache 2.0 license.

*Note:* applications wanting to use appmetrics programatically must use
supervisor's builtin appmetrics, like so:

    var appmetrics = global.APPMETRICS || require('appmetrics');

*Note:* strong-supervisor 4.x and below use strong-agent, which required a
StrongLoop license. With 5.x we use appmetrics and this restriction is removed.

Appmetrics can be explicitly disabled using the `--no-profile` option.

### Appmetrics Dashboard

The [appmetrics dashboard](https://github.com/RuntimeTools/appmetrics-dash) can
be enabled by setting the `STRONGLOOP_DASHBOARD` environment variable to `'on'`.

See the dashboard documentation for more information.

### Metrics

Metrics can be published to a thirdparty collector, in addition to
[Strongloop Arc](https://github.com/strongloop/strong-arc). For information on
supported collectors and URL formats, see
[strong-statsd](https://github.com/strongloop/strong-statsd).

### Profiling control

Expensive profiling (such as object tracking or call tracing) can by dynamically
started and stopped using the CLI (by worker ID or by process ID). The object
count and size information is reported as a metric.

### Heap snapshot

A heap snapshot can be generated for the master or any worker from the CLI (by
worker ID or by process ID). It is written to a file that can be opened in the
Chrome Dev Tools.

### CPU profiling

CPU profiling can be initiated on the master or any workers from the CLI (by
worker ID or by process ID), and the CPU profile when stopped is written into a
file that can be opened in the Chrome Dev Tools.

### Clustering

Supervisor will run the application clustered, by default, maintaining a worker
per CPU. It does this using
[strong-cluster-control](https://github.com/strongloop/strong-cluster-control).

Clustering can be disabled using the `--cluster=off` option, or the size can be
explicitly set to any numeric value (including `0`), or to `--cluster=cpus` to
run a worker per CPU.

Note that a number of features are unavailable when clustering is disabled.

### Environment

Supervisor will load environment variable settings from a `.env` file in the
applications root directory, if it exists (see
[dotenv](https://www.npmjs.org/package/dotenv) for more information).

### Daemonization

`sl-run can be useful when launching from a shell, but is not recommended for
production use. For production use it is best to run the supervisor from an init
script and let the init system handle daemonization.

### Logging

Supervisor collects the stdout and stderr of itself and its workers, and writes
it to stdout, by default. It is possible to specify a log file with the `--log`
option.

Logging is most effective in cluster mode as it allows for complete capture of
the application's stdout and stderr. If the application is not "cluster safe"
but logging is still desired we recommend using `--cluster 1` to gain all of the
logging and process supervision benefits without the potential problems of
running multiple instances of your application code.

#### Filename Expansions

It is possible to specify per-process log files by using `%p` (process ID) and
`%w` (worker ID) expansions in the file name. It is also possible to specify a
command to pipe log messages to by prefixing the log name with a `|`.

For example, the following will create a cluster and direct each process's logs
to a separate instance of `logger`:

```sh
slr --cluster 4 --log '| logger -t "myApp worker:%w pid:%p"' myApp
```

#### Timestamps

Each log line captured from a worker's stdout/stderr is prefixed with a
timestamp, the process ID, and the worker ID. If the application's logs are
already prefixed with timestamps, the timestamping can be disabled with the
`--no-timestamp-workers`.

The supervisor log messages are prefixed with a timestamp, the supervisor's
process ID, and a worker ID of `supervisor`. If the supervisor is logging to
stdout and is being captured by a logger that adds its own timestamps, these
supervisor log timestamps can be disabled with the `--no-timestamp-supervisor`
option.

#### Syslog

On platforms where syslog is supported, and when the optional strong-fork-syslog
dependency has been successfully compiled, a `--syslog` option is available.
When enabled, each log line from worker stdout/stderr and the supervisor is
logged via a `syslog(3)` system call. In this mode, the supervisor does **NOT**
timestamp the log entries, but **DOES** prepend process ID and worker ID since
the system call is performed by the supervisor, preventing the standard syslog
PID stamping from being accurate.

#### Log Rotation

The log file can be rotated with `SIGUSR2`, see Signal Handling below.

### PID file

Supervisor can optionally write a PID file with the master's PID. This could be
useful to send signals to a detached process from within system startup scripts
as used by `init` or `upstart`.

### Signal Handling

The supervisor will attempt a clean shutdown of the cluster before exiting if it
is signalled with SIGINT or SIGTERM, see
[control.stop()](http://apidocs.strongloop.com/strong-cluster-control/#controlstopcallback).

If the supervisor is logging to file, it will reopen those files when
signalled with SIGUSR2. This is useful in conjunction with tools like
[logrotate](http://manpages.ubuntu.com/manpages/jaunty/man8/logrotate.8.html).

If the supervisor is clustered, it will attempt a restart of the cluster if it is
signalled with SIGHUP, see
[control.restart()](http://apidocs.strongloop.com/strong-cluster-control/#controlrestart).


## Usage

### sl-run

``` text
usage: sl-run [options] [app [app-options...]]

Run an app, allowing it to be profiled (using StrongOps) and supervised.

`app` can be a node file to run or a package directory. The default value is
".", the current working directory. Packages will be run by requiring the first
that is found of:
  1. javascript file mentioned in `scripts.start` of package.json
    *** NOTE: the script is not run and arguments are not preserved, only the
        path of the script is used, eg:
          `node --nodearg script.js --scriptarg` => 'script.js'
          `node bin/www` => `bin/www`
        The parser is simple, so options that accept arguments `--flag value`
        will cause problems.
  2. server.js
  3. app.js
  4. result of require(app)
    1. `main` property of app package.json
    2. `app`.js
    3. `app`/index.js


Options:
  -h,--help          Print this message and exit.
  -v,--version       Print runner version and exit.
  -l,--log FILE      Write supervisor and worker output to FILE
                       (defaults to "-", meaning log to stdout).
  --no-timestamp-workers
                     Disable timestamping of worker log lines by supervisor.
  --no-timestamp-supervisor
                     Disable timestamping of supervisor log messages.
  --no-log-decoration
                     Disable decorating supervisor/worker log messages with
                       cluster id/pid
  --syslog           Send supervisor and collected worker logs to syslog,
                       unsupported on Windows.
  --metrics BACKEND  Report metrics to custom backend. Implies `--profile`.
  -p,--pid FILE      Write supervisor's pid to FILE, failing if FILE already
                       has a valid pid in it (default is no pid file).
  --cluster N        Set the cluster size (default is 'cpu', but see below).
  --profile          Inject node instrumentation, the default.
  --no-profile       Do not inject node instrumentation.
  -C,--control CTL   Listen for control messages on CTL (default `runctl`).
  --no-control       Do not listen for control messages.

Log FILE is a path relative to the app's working directory if it is not
absolute. To create a log file per process, FILE supports simple substitutions
of %p for process ID and %w for worker ID.

Supported metrics backends are:

- `statsd://[<host>][:<port>]`
- `graphite://[<host>][:<port>]`
- `syslog:[?[application=<application>][&priority=<priority>]` (syslog is the
  Unix logging framework, it doesn't exist on Windows)
- `splunk://[<host>]:<port>`
- `log:[<file>]`
- `debug:[?pretty[=<true|false>]]`

It is possible to use multiple backends simultaneously.

Cluster size N is one of:

- A number of workers to run
- A string containing "cpu" to run a worker per CPU
```

### sl-runctl

```
usage: sl-runctl [options] [command]

Options:

  -h,--help           Print this message and exit.
  -v,--version        Print version and exit.
  -C,--control <CTL>  Control endpoint for process runner (default `runctl`).

Commands:

  status                     Report status of cluster workers, the default.
  set-size <N>               Set cluster size to N workers.
  stop                       Stop, shutdown all workers and stop controller.
  restart                    Restart, restart all workers.
  ls [DEPTH]                 List application dependencies.
  objects-start <ID>         Start tracking objects on ID.
  objects-stop <ID>          Stop tracking objects on ID.
      Object metrics are published, see the `--metrics` option to `sl-run`.

  cpu-start <ID> [TIMEOUT]   Start CPU profiling on ID.
      TIMEOUT is the optional watchdog timeout, in milliseconds.  In watchdog
      mode, the profiler is suspended until an event loop stall is detected;
      i.e. when a script is running for too long.  Only supported on Linux.

  cpu-stop <ID> [NAME]       Stop CPU profiling on ID, save as "NAME.cpuprofile".
      CPU profiles must be loaded into Chrome Dev Tools. The NAME is optional,
      profiles default to being named `node.<PID>.cpuprofile`.

  heap-snapshot <ID> [NAME]  Snapshot heap objects for ID, save as
                             "NAME.heapsnapshot".
      Heap snapshots must be loaded into Chrome Dev Tools. The NAME is
      optional, snapshots default to being named `node.<PID>.heapshapshot`.

  patch <ID> <FILE>          Apply patch FILE to ID.

  env-get [ID]               Get the complete environment of the specified
                             process. If no target is specified the default is 0,
                             the cluster master process.

  env-set <K1=V1...>         Set environment variables in master and worker.
                             Changes are live without process restart.

  env-unset <KEYS...>        Unset environment variables in master and workers.
                             Changes are live without process restart.

Commands specific to a worker ID accept either a process ID or cluster worker
ID, and use an ID of `0` to mean the cluster master.
```


## License

strong-supervisor uses a dual license model.

You may use this library under the terms of the [Artistic 2.0 license][].

[Artistic 2.0 license]: http://opensource.org/licenses/Artistic-2.0
