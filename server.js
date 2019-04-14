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

const config = require('./config');
const db = require('./commands/db');
const table = require('./commands/table');
const user = require('./commands/user');
const registry = require('./commands/registry');
const logger = require('./lib/logger');
const sql = require('./sql/sql');

const net = require('net');

let server = net.createServer(socket => {
    let connection = new config.Connection();
    connection.Socket = socket;
    logger.log(0, `User connected, IP: ${socket.remoteAddress}`);

    db.readFile();

    socket.on('end', () => {
        logger.log(0, `[${socket.remoteAddress}] User disconnected`);
        config.removeConnection(connection);
    });

    socket.on('data', data => {
        let sqlCmd = data.toLocaleString().trim();

        if (sqlCmd === 'PING') {
            socket.write('PONG');
            return;
        }

        if (config.server.ignAuth && sqlCmd.includes('credentials: ')) {
            connection.Username = 'grantall::jsdbadmin';
            config.addConnection(connection);
            socket.write('AUTHOK');
            logger.log(1, `[${socket.remoteAddress}] User authenticated (NOAUTH)`);
            return;
        }

        if (connection.Username === null && !config.server.ignAuth) {
            try {
                if (!sqlCmd.includes('credentials: ')) {
                    let message = 'Username and password not informed';
                    logger.log(1, `[${socket.remoteAddress}] Authentication error: ${message}`);
                    socket.write(message);
                    socket.destroy();
                } else {
                    let credentials = JSON.parse(sqlCmd.replace(/credentials: /, ''));
                    if (typeof credentials.username !== "string" || typeof credentials.password !== "string") {
                        let message = 'Username and/or password not informed';
                        logger.log(1, `[${socket.remoteAddress}] Authentication error: ${message}`);
                        socket.write(message);
                        socket.destroy();
                    } else {
                        user.auth(credentials.username, credentials.password);

                        connection.Username = credentials.username;
                        config.addConnection(connection);

                        socket.write('AUTHOK');
                        logger.log(0, `[${socket.remoteAddress}] User authenticated, username: ${credentials.username}`);
                    }
                }
            } catch (e) {
                logger.log(1, `[${socket.remoteAddress}] Authentication error: ${e.message}`);
                socket.write(e.message);
                socket.destroy();
            }

            return;
        }

        try {
            logger.log(0, `[${connection.Username}@${socket.remoteAddress}] SQL: ${sqlCmd}`);
            let r = sql(sqlCmd, config.connections.indexOf(connection));

            if (typeof r === 'object') {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(JSON.stringify({'code': 1, 'message': err.message}));
            logger.log(2, `[${connection.Username}@${socket.remoteAddress}] ${err.message}`);
        }
    });

    socket.on('error', err => {
        if (err.code === 'EADDRINUSE') {
            console.error('Address in use, retrying...');
            setTimeout(() => {
                server.close();
                server.listen(port, address);
            }, 1000);
        } else if (err.code === 'ECONNRESET') {
            console.error('Connection reset. Maybe a client disconnected');
        } else {
            console.error(`${err.code}: ${err.message}`);
        }
    })
});

registry.readAll();

let params = [];

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '-d' || process.argv[i] === '--dir') {
        config.server.startDir = process.argv[i + 1];
        params.push('d');
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

if (config.server.port <= 0 || config.server.port >= 65535) {
    config.server.port = 6637;
}

if (config.server.listenIP !== '' && config.server.port !== 0 && config.server.startDir !== '') {
    server.listen(config.server.port, config.server.listenIP);
    logger.log(0, `Server started with parameters [${params.join(', ')}]`);
    console.log(`Running server on ${config.server.listenIP}:${config.server.port}, ${config.server.startDir}`);
    if (config.server.ignAuth) {
        console.log('Warning: running without authentication!');
        logger.log(1, `Warning: Server started without authentication`);
    }

    if (!config.server.ignAuth) {
        if (table.select('jsdb', 'public', 'users', ['*'], {'where': '\`username\` == \'jsdbadmin\''}).length === 0) {
            let stdin = process.openStdin();

            process.stdout.write('Insert jsdbadmin password: ');

            stdin.addListener('data', d => {
                d = d.toLocaleString().trim();
                if (d.length > 8) {
                    stdin.removeAllListeners('data');

                    user.create('jsdbadmin', d, {'*': parseInt('1111', 2)});
                    console.log('User created.');
                } else {
                    console.log('jsdbadmin password must be greater than 8 characters!');
                }
            });
        }
    }
}
