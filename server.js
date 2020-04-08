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
const Log = require('./core/lib/Log');
const sql = require('./core/sql/sql');

const net = require('net');

const DB = require('./core/DB');
const Schema = require('./core/Schema');
const Table = require('./core/Table');
const User = require('./core/User');

//console.log(require('./core/sql/parser')('SELECT name, MAX(id) FROM users WHERE TRUE GROUP BY name ORDER BY name DESC, password LIMIT 1, 1'));
//console.log(require('sql-parser/lib/sql_parser').parse('SELECT name, MAX(id) FROM users WHERE TRUE GROUP BY name ORDER BY name DESC, password LIMIT 1, 1'));

const server = net.createServer(socket => {
    const connection = new Connection(socket);
    Log.info(`User connected, IP: ${socket.remoteAddress}`);

    readFile();

    socket.on('end', () => {
        Log.info(`[${socket.remoteAddress}] User disconnected`);
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
            Log.warning(`[${socket.remoteAddress}] User authenticated (NOAUTH)`);
            return;
        }

        if (connection.Username === null && !config.server.ignAuth) {
            try {
                if (!sqlCmd.includes('credentials: ')) {
                    const message = 'Username and password not informed';
                    Log.warning(`[${socket.remoteAddress}] Authentication error: ${message}`);
                    socket.write(message);
                    socket.destroy();
                } else {
                    const credentials = JSON.parse(sqlCmd.replace(/credentials: /, ''));
                    if (typeof credentials.username !== "string" || typeof credentials.password !== "string") {
                        const message = 'Username and/or password not informed';
                        Log.warning(`[${socket.remoteAddress}] Authentication error: ${message}`);
                        socket.write(message);
                        socket.destroy();
                    } else {
                        if (!User.auth(credentials.username, credentials.password)) {
                            throw new Error(`AUTHERR: Wrong password.`);
                        }

                        connection.Username = credentials.username;
                        connections.add(connection);

                        socket.write('AUTHOK');
                        Log.info(`[${socket.remoteAddress}] User authenticated, username: ${credentials.username}`);
                    }
                }
            } catch (e) {
                Log.warning(`[${socket.remoteAddress}] Authentication error: ${e.message}`);
                socket.write(e.message);
                socket.destroy();
            }

            return;
        }

        try {
            Log.info(`[${connection.Username}@${socket.remoteAddress}] SQL: ${sqlCmd}`);
            let r = sql(sqlCmd, connections.indexOf(connection));

            if (typeof r === 'object') {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(JSON.stringify({'code': 1, 'message': err.message}));
            Log.error(`[${connection.Username}@${socket.remoteAddress}] ${err.message}`);
        }
    });

    socket.on('error', err => {
        switch (err.code) {
            case 'ECONNRESET':
                console.error('Connection reset. Maybe a client disconnected');
                break;

            default:
                console.error(`${err.code}: ${err.message}`);
                break;
        }
    });
});

if (config.server.listenIP !== '' && config.server.port !== 0 && config.server.startDir !== '') {
    server.listen(config.server.port, config.server.listenIP);
    console.log(`Running server on ${config.server.listenIP}:${config.server.port}, ${config.server.startDir}`);
    if (config.server.ignAuth) {
        console.log('Warning: running without authentication!');
        Log.warning(`Warning: Server started without authentication`);
    }

    if (!config.server.ignAuth) {
        if (new DB('jsdb').table('users').select(['*'], {where: '\`username\` == \'jsdbadmin\''}).length === 0) {
            const stdin = process.openStdin();

            process.stdout.write('Insert jsdbadmin password: ');

            stdin.addListener('data', password => {
                password = password.toLocaleString().trim();
                if (password.length <= 8) {
                    console.log('jsdbadmin password must be greater than 8 characters!');
                } else {
                    stdin.removeAllListeners('data');

                    User.create('jsdbadmin', password, {'*': parseInt('1111', 2)});
                    console.log('User created.');
                }
            });
        }
    }

    server.on('error', err => {
        switch (err.code) {
            case 'EADDRINUSE':
                console.error('Address in use, retrying in 30 seconds...');
                setTimeout(() => {
                    server.close();
                    server.listen(config.server.port, config.server.listenIP);
                }, 30000);
                break;

            default:
                console.error(`${err.code}: ${err.message}`);
                break;
        }
    });
}
