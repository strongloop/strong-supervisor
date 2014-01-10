strong-supervisor
=================

Runs an application under a supervisory master. This allows
[strong-cluster-control](https://github.com/strongloop/strong-cluster-control)
to be used to manage a cluster of workers, or even a single worker,
restarting them on failure, and allowing run-time control using the `clusterctl`
utility, or the
[StrongOps](http://strongloop.com/node-js-performance/strongops) dashboard.

The supervisor and workers can be automatically monitored using
[strong-agent](https//github.com/strongloop/strong-agent),
if the application has been registered. Registration is easy,
use the `slc strongops --register` command from
[strong-cli]((https://github.com/strongloop/strong-cli).

*NOTE*: When using strong-supervisor, it is not necessary to directly require
either strong-cluster-control or strong-agent in your application. The
supervisor will do that for you. See the example applications in `test/`.

## Installation

    npm install -g strong-supervisor

## Usage

``` text
usage: slr [options] [app [app-options...]]

Run an app, allowing it to be profiled (using StrongOps) and supervised.

For more information, see XXX(URL).

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
                     is to not detach).
  -l,--log FILE      When detaching, redirect terminal output to FILE, in
                     the app's working directory if FILE path is not
                     absolute (default is supervisor.log)
  -p,--pid FILE      Write supervisor's pid to FILE, failing if FILE
                     already has a valid pid in it (default is not to)
  --size N           Set the cluster size (default is 1).
  --no-profile       Do not profile with StrongOps (default is to profile
                     if registration data is found).

Cluster size is one of:
  - A number of workers to run
  - A string containing "cpu" to run a worker per CPU
  - The number zero, to run directly in the master, in which case the app
    will *NOT* be supervisable or controllable, but will be monitored. 
```

## License

MIT
