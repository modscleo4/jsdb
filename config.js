/**
 * Copyright 2019 Dhiego Cassiano Fogaça Barbosa

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @file This script carries config variables for all JSDB modules
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

class Connection {
    constructor() {
        this.dbName = 'jsdb';
        this.schemaName = 'public';
        this.username = null;
    }

    get Socket() {
        return this.socket;
    }

    set Socket(value) {
        this.socket = value;
    }

    get DBName() {
        return this.dbName;
    }

    set DBName(value) {
        this.dbName = value;
    }

    get SchemaName() {
        return this.schemaName;
    }

    set SchemaName(value) {
        this.schemaName = value;
    }

    get Username() {
        return this.username;
    }

    set Username(value) {
        this.username = value;
    }
}
exports.Connection = Connection;

const fs = require('fs');

/* This makes the Date() available for all modules and stores the date-time when the server started */
let date = new Date();
exports.date = date;

/* Config vars for server */
let server = {
    ignAuth: false,
    startDir: './',
    port: 6637
};

/* Config vars for DB */
let db = {
    createZip: false
};

/* Config vars for registry manager */
let registry = {
    instantApplyChanges: false
};

exports.server = server;
exports.db = db;
exports.registry = registry;

/* Store all sockets connected */
let connections = [];
exports.connections = connections;

exports.addConnection = function addConnection(connection) {
    connections.push(connection);
};

exports.removeConnection = function removeConnection(connection) {
    connections.splice(connections.indexOf(connection), 1);
};

exports.rmdirRSync = function rmdirRSync(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file) => {
            let curPath = `${path}/${file}`;
            if (fs.lstatSync(curPath).isDirectory()) {
                rmdirRSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
