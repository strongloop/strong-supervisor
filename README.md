strong-supervisor
=================

Runs an application under a supervisory master. This allows
[strong-cluster-control](https://github.com/strongloop/strong-cluster-control)
to be used to manage a cluster of workers, or even a single worker,
restarting them on failure, and allowing run-time control using the `clusterctl`
utility, or the
[StrongOps](http://strongloop.com/node-js-performance/strongops)
[dashboard](http://strongloop.com/ops/dashboard).

*NOTE*: When using strong-supervisor, it is not necessary to directly require
either strong-cluster-control or strong-agent in your application. The
supervisor will do that for you. See the example applications in `test/`.

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

Metrics can be published to an alternate collector, instead of StrongOps. The
collector must support the statsd protocol, see
[strong-agent-statsd](https://github.com/strongloop/strong-agent-statsd) for
more information.

### Profiling control

Expensive profiling (such as object tracking or call tracing) can by dynamically
started and stopped using the CLI.

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

On platforms where syslog is supported, and when the optional node-syslog
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

## Installation

    npm install -g strong-supervisor

## Usage

### slc run

``` text
usage: slc run [options] [app [app-options...]]
usage: slr [options] [app [app-options...]]

Run an app, allowing it to be profiled (using StrongOps) and supervised.

`app` can be a node file to run or a package directory. The default
value is ".", the current working directory. Packages will be run by
requiring the first that is found of:
  1. server.js
  2. app.js
  3. `main` property of package.json
  4. index.js

Runner options:
  -h,--help          Print this message and exit.
  -v,--version       Print runner version and exit.
  -d,--detach        Detach master from terminal to run as a daemon (default
                     is to not detach). When detaching, the --log option
                     defaults to supervisor.log
  -l,--log FILE      When clustered, write supervisor and worker output
                     to FILE (defaults to "-", meaning log to stdout).
  --no-timestamp-workers
                     Disable timestamping of worker log lines by supervisor.
  --no-timestamp-supervisor
                     Disable timestamping of supervisor log messages.
  --syslog           Send supervisor and collected worker logs to syslog(3).
  --metrics STATS    Send metrics to local collector (default is StrongOps)
  -p,--pid FILE      Write supervisor's pid to FILE, failing if FILE
                     already has a valid pid in it (default is not to).
  --cluster N        Set the cluster size (default is off, but see below).
  --no-profile       Do not profile with StrongOps (default is to profile
                     if registration data is found).

Log FILE is a path relative to the app's working directory if it is not
absolute. To create a log file per process, FILE supports simple
substitutions of %p for process ID and %w for worker ID.

Metrics can be sent to an alternative local collector, identified by STATS.
The format for STATS is a URL: `statsd:[//host[:port]][/scope]`. The only
supported protocol is "statsd". Host is optional, and defaults to
"localhost". Port is optional, and defaults to 8125, the standard statsd
port. Scope is optional, and defaults to none. The scope supports the same
substitutions as the log FILE, and will be prepended to the strong-agent
metrics names, see strong-agent and strong-agent-statsd for details.

Cluster size N is one of:
  - A number of workers to run
  - A string containing "cpu" to run a worker per CPU
  - The string "off" to run unclustered, in which case the app
    will *NOT* be supervisable or controllable, but will be monitored.

Clustering defaults to off unless `NODE_ENV` is production, in which case it
defaults to CPUs.
```

### slc runctl

```
  Usage: slc runctl [options] [command]
  Usage: slrc [options] [command]

  Commands:

    status                 report status of cluster workers, the default command
    set-size <N>           set cluster size to N workers
    stop                   stop, shutdown all workers and stop controller
    restart                restart, restart all workers
    objects-start <T>      start tracking objects on T, a worker ID or process PID
    objects-stop <T>       stop tracking objects on T, a worker ID or process PID
    disconnect             disconnect all workers
    fork                   fork one worker

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -p,--path,--port <path>  name of control socket, defaults to runctl
```
