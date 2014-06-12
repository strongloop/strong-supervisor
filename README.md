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

### StrongOps

Supervisor and its workers are automatically monitored using
[strong-agent](https://github.com/strongloop/strong-agent),
if the application has been registered. Registration is easy,
use the `slc strongops --register` command from
[strong-cli](https://github.com/strongloop/strong-cli).

Profiling does not occur if the application is not registered, and it can be
explicitly disabled using the `--no-profile` option.

### Clustering

Supervisor will run the application clustered, by default, maintaining a worker
per CPU. It does this using
[strong-cluster-control](https://github.com/strongloop/strong-cluster-control),
this behaviour is configurable (see `loadOptions()` in the
strong-cluster-control documentation).

Clustering can be disabled using the `--size=off` option, or the size can be
explicitly set to any value.

### Environment

Supervisor will load environment variable settings from a `.env` file in the
applications root directory, if it exists (see
[dotenv](https://www.npmjs.org/package/dotenv) for more information).

### Daemonization

Supervisor can detach the master from the controlling terminal, allowing to run
as a daemon. This behaviour is optional, see the `--detach` option.

### Logging

Supervisor collects the stdout and stderr of itself and its workers, and writes
it to stdout, by default. It is possible to redirect this to a file, or
a file per process with the use of the `%p` (process ID) and `%w` (worker ID)
expansions in the log file name option.

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
  -l,--log FILE      Write supervisor and worker terminal output to FILE,
                     in the app's working directory if FILE path is not
                     absolute.
                     To create a log file per process, FILE supports simple
                     substitutions of %p for process id and %w for worker id
                     FILE defaults to "-", meaning log to stdout.
  -p,--pid FILE      Write supervisor's pid to FILE, failing if FILE
                     already has a valid pid in it (default is not to).
  --cluster N        Set the cluster size (default is off, but see below).
  --no-profile       Do not profile with StrongOps (default is to profile
                     if registration data is found).

Cluster size N is one of:
  - A number of workers to run
  - A string containing "cpu" to run a worker per CPU
  - The string "off" to run unclustered, in which case the app
    will *NOT* be supervisable or controllable, but will be monitored.

Clustering defaults to off unless NODE_ENV is production, in which case it
defaults to CPUs.
```
