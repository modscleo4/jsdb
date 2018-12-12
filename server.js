/**
 * @summary This is the main script of JSDB
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 *
 * @type {module:fs}
 */

const db = require("./commands/db");
const table = require("./commands/table");
const user = require('./commands/user');
const sql = require("./sql/sql");
const config = require('./config');

const net = require('net');

let server = net.createServer(socket => {
    socket.dbName = "jsdb";
    socket.schemaName = "public";

    db.readFile();

    socket.on('end', () => {
        config.removeSocket(socket);
    });

    socket.username = null;

    socket.on('data', data => {
        let sqlCmd = data.toLocaleString();

        if (sqlCmd === "PING") {
            socket.write("PONG");
            return;
        }

        if (config.ignAuth && sqlCmd.includes("credentials: ")) {
            socket.username = "grantall::jsdbadmin";
            config.addSocket(socket);
            return;
        }

        if (socket.username === null && !config.ignAuth) {
            try {
                if (!sqlCmd.includes("credentials: ")) {
                    throw new Error("Username and password not informed");
                } else {
                    let credentials = JSON.parse(sqlCmd.slice("credentials: ".length));
                    user.auth(credentials.username, credentials.password);

                    socket.username = credentials.username;
                    config.addSocket(socket);

                    socket.write("AUTHOK");
                    return;
                }
            } catch (e) {
                socket.write(e.message);
                socket.destroy();
            }
        }

        try {
            let r = sql.run(sqlCmd, config.sockets.indexOf(socket));

            if (typeof r === "object") {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(`[{"code": 1, "message": "${err.message}"}]`);
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
let port = 6637;
let dir = "./";

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-d" || process.argv[i] === "--dir") {
        dir = process.argv[i + 1];
    } else if (process.argv[i] === "-p" || process.argv[i] === "--port") {
        port = parseInt(process.argv[i + 1]);
    } else if (process.argv[i] === "-N" || process.argv[i] === "--noAuth") {
        config.ignAuth = true;
    }
}

if (dir === "") {
    dir = "./";
}

if (port === 0) {
    port = 6637;
}

if (address !== "" && port !== 0 && dir !== "") {
    server.listen(port, address);
    console.log(`Running server on ${address}:${port}, ${dir}`);
    if (config.ignAuth) {
        console.log('Warning: running without authentication!');
    }
    config.startDir = dir;
    db.readFile();

    if (!config.ignAuth && table.select('jsdb', 'public', 'users', ['*'], {"where": '\`username\` == \'jsdbadmin\''}).length === 0) {
        let stdin = process.openStdin();

        console.log('Insert jsdbadmin password: ');

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
