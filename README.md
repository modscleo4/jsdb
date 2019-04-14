# JSDB - JSON Database Manager

<a href="https://travis-ci.org/modscleo4/jsdb">
    <img src="https://travis-ci.org/modscleo4/jsdb.svg?branch=master" />
</a>

## What is JSDB?
JSDB is a project to create a Node.js database manager which supports SQL.
Built on JavaScript, the JSDB uses JSON to store database data.

The JSDB Server and Client source code is licensed under <a href="https://github.com/modscleo4/jsdb/blob/master/LICENSE">Apache 2 License</a>

## Installation
To install JSDB from GitHub (latest build), clone this repo and install with NPM:
```
$ git clone https://github.com/modscleo4/jsdb.git
$ npm install -g jsdb
```
Or
```
$ npm install -g modscleo4/jsdb
```

---

For stable releases, install from NPM
```
$ npm install -g @modscleo4/jsdb
```

## Run
After installed, you can run JSDB just typing
```
$ jsdb (-d) <dir> (-a) <address> (-p) <port> (-N) (-Z)
```

Where args are:

| Short | Extended    | Description                |
| ----- | ----------- | -------------------------- |
| -d    | --dir       | Which dir to work on       |
| -a    | --listenIP  | Which IP to listen on      |
| -p    | --port      | What port to listen        |
| -N    | --noAuth    | Run without authentication |
| -Z    | --createZip | Enable backup system       |

## Issues and suggestions
Use the <a href="https://github.com/modscleo4/jsdb/issues">Issues page</a> to send bug reports and suggestions for new features

## Contributing
Feel free to fork and send <a href="https://github.com/modscleo4/jsdb/pulls">Pull Requests</a> to JSDB Server and Client projects, I'll love to see new contributions for these projects!

## Client
The official JSDB client is available at
https://github.com/modscleo4/jsdbclient
