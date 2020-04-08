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

'use strict';

module.exports = {
    // This makes the Date() available for all modules and stores the date-time when the server started
    date: new Date(),

    // Store all sockets connected
    connections: [],

    config: {
        // Config vars for server
        server: {
            ignAuth: false,
            startDir: './data/',
            listenIP: '0.0.0.0',
            port: 6637,
        },

        // Config vars for DB
        db: {
            createZip: false,
        },

        // Config vars for registry manager
        registry: {
            instantApplyChanges: false,
        },

        // Config vars for log system
        log: {
            generateLogs: true,
            minLevel: 0,
        }
    },
};

module.exports.connections.add = function (connection) {
    module.exports.connections.push(connection);
};

module.exports.connections.remove = function (connection) {
    module.exports.connections.splice(module.exports.connections.indexOf(connection), 1);
};
