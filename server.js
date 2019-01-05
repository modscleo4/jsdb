/**
 * @file This is the main script of JSDB
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const db = require("./commands/db");
const table = require("./commands/table");
const user = require('./commands/user');
const sql = require("./sql/sql");
const config = require('./config');
const registry = require('./commands/registry');
const logger = require('./lib/logger');

const net = require('net');

let server = net.createServer(socket => {
    socket.dbName = "jsdb";
    socket.schemaName = "public";

    logger.log(0, `User connected, IP: ${socket.remoteAddress}`);

    db.readFile();

    socket.on('end', () => {
        logger.log(0, `[${socket.remoteAddress}] User disconnected`);
        config.removeSocket(socket);
    });

    socket.username = null;

    socket.on('data', data => {
        let sqlCmd = data.toLocaleString();

        if (sqlCmd === "PING") {
            socket.write("PONG");
            return;
        }

        if (config.server.ignAuth && sqlCmd.includes("credentials: ")) {
            socket.username = "grantall::jsdbadmin";
            config.addSocket(socket);
            socket.write("AUTHOK");
            logger.log(1, `[${socket.remoteAddress}] User authenticated (NOAUTH)`);
            return;
        }

        if (socket.username === null && !config.server.ignAuth) {
            try {
                if (!sqlCmd.includes("credentials: ")) {
                    let message = "Username and password not informed";
                    logger.log(1, `[${socket.remoteAddress}] Authentication error: ${message}`);
                    socket.write(message);
                    socket.destroy();
                    return;
                } else {
                    let credentials = JSON.parse(sqlCmd.slice("credentials: ".length));
                    user.auth(credentials.username, credentials.password);

                    socket.username = credentials.username;
                    config.addSocket(socket);

                    socket.write("AUTHOK");
                    logger.log(0, `[${socket.remoteAddress}] User authenticated, username: ${credentials.username}`);
                    return;
                }
            } catch (e) {
                logger.log(1, `[${socket.remoteAddress}] Authentication error: ${e.message}`);
                socket.write(e.message);
                socket.destroy();
                return;
            }
        }

        try {
            logger.log(0, `[${socket.username}@${socket.remoteAddress}] SQL: ${sqlCmd}`);
            let r = sql(sqlCmd, config.sockets.indexOf(socket));

            if (typeof r === "object") {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(`[{"code": 1, "message": "${err.message}"}]`);
            logger.log(2, `[${socket.username}@${socket.remoteAddress}] ${err.message}`);
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

let address = "localhost";

db.checkJSDBIntegrity();
registry.readAll();

let params = [];

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-d" || process.argv[i] === "--dir") {
        config.server.startDir = process.argv[i + 1];
        params.push('d');
    } else if (process.argv[i] === "-p" || process.argv[i] === "--port") {
        config.server.port = parseInt(process.argv[i + 1]);
        params.push('p');
    } else if (process.argv[i] === "-N" || process.argv[i] === "--noAuth") {
        config.server.ignAuth = true;
        params.push('N');
    } else if (process.argv[i] === "-Z" || process.argv[i] === "--createZip") {
        config.db.createZip = true;
        params.push('Z');
    }
}

if (config.server.startDir === "") {
    config.server.startDir = "./";
}

if (config.server.port <= 0 || config.server.port >= 65535) {
    config.server.port = 6637;
}

if (address !== "" && config.server.port !== 0 && config.server.startDir !== "") {
    server.listen(config.server.port, address);
    logger.log(0, `Server started with parameters [${params.join(", ")}]`);
    console.log(`Running server on ${address}:${config.server.port}, ${config.server.startDir}`);
    if (config.server.ignAuth) {
        console.log('Warning: running without authentication!');
        logger.log(1, `Warning: Server started without authentication`);
    }

    if (!config.server.ignAuth) {
        if (table.select('jsdb', 'public', 'users', ['*'], {"where": '\`username\` == \'jsdbadmin\''}).length === 0) {
            let stdin = process.openStdin();

            process.stdout.write('Insert jsdbadmin password: ');

            stdin.addListener("data", d => {
                d = d.toLocaleString().trim();
                if (d.length > 8) {
                    stdin.removeAllListeners('data');

                    user.create('jsdbadmin', d, {"*": parseInt("1111", 2)});
                    console.log("User created.");
                } else {
                    console.log('jsdbadmin password must be greater than 8 characters!');
                }
            });
        }
    }
}
