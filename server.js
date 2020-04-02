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
 * @file This is the main script of JSDB
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {connections, config} = require('./config');
const Connection = require('./core/connection/Connection');
const {readFile} = require('./core/commands/db');
const registry = require('./core/commands/registry');
const logger = require('./core/lib/logger');
const sql = require('./core/sql/sql');

const net = require('net');

const DB = require('./core/DB');
const Schema = require('./core/Schema');
const Table = require('./core/Table');
const User = require('./core/User');

//console.log(require('./core/sql/parser')('SELECT name, MAX(id) FROM users WHERE TRUE GROUP BY name ORDER BY name DESC, password LIMIT 1, 1'));

let server = net.createServer(socket => {
    const connection = new Connection(socket);
    logger.log(logger.OK, `User connected, IP: ${socket.remoteAddress}`);

    readFile();

    socket.on('end', () => {
        logger.log(logger.OK, `[${socket.remoteAddress}] User disconnected`);
        connections.remove(connection);
    });

    socket.on('data', data => {
        const sqlCmd = data.toLocaleString().trim();

        if (sqlCmd === 'PING') {
            socket.write('PONG');
            return;
        }

        if (config.server.ignAuth && sqlCmd.includes('credentials: ')) {
            connection.Username = 'grantall::jsdbadmin';
            connections.add(connection);
            socket.write('AUTHOK');
            logger.log(logger.WARNING, `[${socket.remoteAddress}] User authenticated (NOAUTH)`);
            return;
        }

        if (connection.Username === null && !config.server.ignAuth) {
            try {
                if (!sqlCmd.includes('credentials: ')) {
                    const message = 'Username and password not informed';
                    logger.log(logger.WARNING, `[${socket.remoteAddress}] Authentication error: ${message}`);
                    socket.write(message);
                    socket.destroy();
                } else {
                    const credentials = JSON.parse(sqlCmd.replace(/credentials: /, ''));
                    if (typeof credentials.username !== "string" || typeof credentials.password !== "string") {
                        const message = 'Username and/or password not informed';
                        logger.log(logger.WARNING, `[${socket.remoteAddress}] Authentication error: ${message}`);
                        socket.write(message);
                        socket.destroy();
                    } else {
                        if (!User.auth(credentials.username, credentials.password)) {
                            throw new Error(`AUTHERR: Wrong password.`);
                        }

                        connection.Username = credentials.username;
                        connections.add(connection);

                        socket.write('AUTHOK');
                        logger.log(logger.OK, `[${socket.remoteAddress}] User authenticated, username: ${credentials.username}`);
                    }
                }
            } catch (e) {
                logger.log(logger.WARNING, `[${socket.remoteAddress}] Authentication error: ${e.message}`);
                socket.write(e.message);
                socket.destroy();
            }

            return;
        }

        try {
            logger.log(logger.OK, `[${connection.Username}@${socket.remoteAddress}] SQL: ${sqlCmd}`);
            let r = sql(sqlCmd, connections.indexOf(connection));

            if (typeof r === 'object') {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(JSON.stringify({'code': 1, 'message': err.message}));
            logger.log(logger.ERROR, `[${connection.Username}@${socket.remoteAddress}] ${err.message}`);
        }
    });

    socket.on('error', err => {
        switch (err.code) {
            case 'EADDRINUSE':
                console.error('Address in use, retrying...');
                setTimeout(() => {
                    server.close();
                    server.listen(config.server.port, config.server.listenIP);
                }, 1000);
                break;

            case 'ECONNRESET':
                console.error('Connection reset. Maybe a client disconnected');
                break;

            default:
                console.error(`${err.code}: ${err.message}`);
                break;
        }
    });
});

registry.readAll();

let params = [];

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '-d' || process.argv[i] === '--dir') {
        config.server.startDir = process.argv[i + 1];
        params.push('d');
    } else if (process.argv[i] === '-a' || process.argv[i] === '--listenIP') {
        config.server.listenIP = process.argv[i + 1];
        params.push('a');
    } else if (process.argv[i] === '-p' || process.argv[i] === '--port') {
        config.server.port = parseInt(process.argv[i + 1]);
        params.push('p');
    } else if (process.argv[i] === '-N' || process.argv[i] === '--noAuth') {
        config.server.ignAuth = true;
        params.push('N');
    } else if (process.argv[i] === '-Z' || process.argv[i] === '--createZip') {
        config.db.createZip = true;
        params.push('Z');
    }
}

if (config.server.startDir === '') {
    config.server.startDir = './';
}

// Ensure startDir ends with /
if (!config.server.startDir.endsWith('/')) {
    config.server.startDir += '/';
}

// Ensure startDir ends with data/ (data dir is where the databases and log files should be)
if (!config.server.startDir.endsWith('data/')) {
    config.server.startDir += 'data/';
}

if (config.server.port <= 0 || config.server.port >= 65535) {
    config.server.port = 6637;
}

if (config.server.listenIP !== '' && config.server.port !== 0 && config.server.startDir !== '') {
    server.listen(config.server.port, config.server.listenIP);
    logger.log(logger.OK, `Server started with parameters [${params.join(', ')}]`);
    console.log(`Running server on ${config.server.listenIP}:${config.server.port}, ${config.server.startDir}`);
    if (config.server.ignAuth) {
        console.log('Warning: running without authentication!');
        logger.log(logger.WARNING, `Warning: Server started without authentication`);
    }

    if (!config.server.ignAuth) {
        if (new DB('jsdb').table('users').select(['*'], {'where': '\`username\` == \'jsdbadmin\''}).length === 0) {
            let stdin = process.openStdin();

            process.stdout.write('Insert jsdbadmin password: ');

            stdin.addListener('data', d => {
                d = d.toLocaleString().trim();
                if (d.length > 8) {
                    stdin.removeAllListeners('data');

                    User.create('jsdbadmin', d, {'*': parseInt('1111', 2)});
                    console.log('User created.');
                } else {
                    console.log('jsdbadmin password must be greater than 8 characters!');
                }
            });
        }
    }
}
