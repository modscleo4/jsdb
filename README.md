# JSDB - JSON Database Manager

[![Build Status](https://travis-ci.org/modscleo4/jsdb.svg?branch=master)](https://travis-ci.org/modscleo4/jsdb)

JSDB is a Node.js database manager which supports SQL

## Installation
To install JSDB from GitHub (latest build), just run
```
$ npm install -g modscleo4/jsdb
```

For stable releases, install from NPM
```
$ npm install -g @modscleo4/jsdb
```

## Run
After installed, you can run JSDB just typing
```
$ jsdb <-d> <-p> <-N> <-Z>
```

Where args are:

| Short | Extended | Detailed info |
| ----- | -------- | ------------- |
| -d | --dir | Which dir to work on |
| -p | --port | What port to listen |
| -N | --noAuth | Run without authentication |
| -Z | --createZip | Enable backup system |

## Client
The official JSDB client is available at
https://github.com/modscleo4/jsdbclient
