/**
 * @summary
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 *
 * @type {module:fs}
 */

const db = require("./commands/db");
const schema = require("./commands/schema");
const table = require("./commands/table");
const user = require('./commands/user');
const sql = require("./sql/sql");

const net = require('net');
const fs = require("fs");

let sockets = [];
exports.sockets = sockets;

let server = net.createServer(function (socket) {
    socket.dbName = "jsdb";
    socket.schemaName = "public";

    db.readFile();
    sockets.push(socket);
    exports.sockets = sockets;

    socket.on('end', function () {
        sockets.splice(sockets.indexOf(socket), 1);
        exports.sockets = socket;
    });

    let userPrivileges = null;

    socket.on('data', function (data) {
        let sqlCmd = data.toLocaleString();

        if (userPrivileges === null) {
            try {
                if (!sqlCmd.includes("credentials: ")) {
                    throw new Error("Username and password not informed");
                } else {
                    let credentials = JSON.parse(sqlCmd.slice("credentials: ".length));
                    userPrivileges = user.auth(credentials['username'], credentials['password']);
                    exports.userPrivileges = userPrivileges;
                    socket.write("AUTHOK");
                    return;
                }
            } catch (e) {
                socket.write(e.message);
                socket.destroy();
            }
        }

        try {
            let r = sql.run(sqlCmd, sockets.indexOf(socket));

            if (typeof r === "object") {
                r = JSON.stringify(r);
            }

            socket.write(r);
        } catch (err) {
            socket.write(`[{"code": 1, "message": "${err.message}"}]`);
        }
    });

    socket.on('error', function (err) {
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
    if (process.argv[i] === "-d") {
        dir = process.argv[i + 1];
    } else if (process.argv[i] === "-p") {
        port = parseInt(process.argv[i + 1]);
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
    exports.startDir = dir;
    db.readFile();
}

exports.rmdirRSync = function rmdirRSync(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file, index) => {
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
