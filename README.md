# strong-supervisor

Supervise a node application package, seperating deployment concerns (logging,
monitoring, run-time control) from the application source.

The supervisor is used by [strong-pm](https://github.com/strongloop/strong-pm)
to run node applications, but it can also be used standalone.

For more details, see http://strong-pm.io.


## Installation

`sl-run` and `sl-runctl` are made available through the
[strongloop](https://github.com/strongloop/strongloop) tool as `slc run` and
`slc runctl`.

`sl-run` and `sl-runctl` can be installed standalone with:

    npm install -g strong-supervisor


## Features

### Monitoring with StrongOps agent

Supervisor and its workers are monitored using
[strong-agent](https://github.com/strongloop/strong-agent).

This requires a `strongloop.json` configuration file, which can be generated
using the `slc strongops` command from
[strongloop](https://github.com/strongloop/strongloop) after
[registration](https://strongloop.com/register/).

Profiling does not occur if the application is not registered, and it can be
explicitly disabled using the `--no-profile` option.

### Metrics

Metrics can be published to an alternate collector, instead of StrongOps. For
information on supported collectors and URL formats, see
[strong-statsd](https://github.com/strongloop/strong-statsd).

### Dynamic Metrics Injection

Custom metrics can be patched dynamically into running code to report counts or
timers using the `patch` command. See
[strong-agent](https://github.com/strongloop/strong-agent#custom-metrics)
for a description of the patch format.

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

Supervisor can detach the master from the controlling terminal, allowing to run
as a daemon. This behaviour is optional, see the `--detach` option.

This can be useful when launching from a shell, but is not recommended for
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

### slc run

``` text
usage: slr [options] [app [app-options...]]

Run an app, allowing it to be profiled (using StrongOps) and supervised.

`app` can be a node file to run or a package directory. The default value is
".", the current working directory. Packages will be run by requiring the first
that is found of:
  1. JS file mentioned in `scripts.start` of package.json
    *** NOTE: the script is no run and arguments are not preserved, only the
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
  -d,--detach        Detach master from terminal to run as a daemon (default is
		       to not detach). When detaching, the --log option
		       defaults to supervisor.log
  -l,--log FILE      When clustered, write supervisor and worker output to FILE
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
  --cluster N        Set the cluster size (default is off, but see below).
  --profile          Start the agent. Report to StrongOps if registration data
                       is found (this is the default).
  --no-profile       Do not start the agent, do not report to StrongOps,
                       do not report metrics.
  -C,--control CTL   Listen for control messages on CTL (default `runctl`),
                       only supported when clustered.
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
- The string "off" to run unclustered, in which case the app will *NOT* be
  supervisable or controllable, but will be monitored.

Clustering defaults to off unless `NODE_ENV` is "production", in which case it
defaults to "CPUs".
```

### slc runctl

```
usage: slc runctl [options] [command ...]
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
      Object metrics are published, see the `--metrics` option to `slc run`.

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

You may use this library under the terms of the [Artistic 2.0 license][],
or under the terms of the [StrongLoop Subscription Agreement][].

[Artistic 2.0 license]: http://opensource.org/licenses/Artistic-2.0
[StrongLoop Subscription Agreement]: http://strongloop.com/license
