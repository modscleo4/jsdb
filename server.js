const db = require("./commands/db");
const schema = require("./commands/schema");
const table = require("./commands/table");
const sql = require("./sql/sql");

const md5 = require('md5');
const net = require('net');
const fs = require("fs");

function authUser(username, password) {
    let users = table.select('jsdb', 'public', 'users', ["username", "password", "privileges"], {
        "where": "\`username\` == '" + username + "'",
        "orderby": [{"column": 'username', "mode": 'ASC'}]
    });

    if (users.length === 0) {
        throw new Error("AUTHERR: Invalid username: " + username);
    }

    if (users[0]['password'] === md5(password)) {
        return users[0]['privileges'];
    } else {
        throw new Error("AUTHERR: Wrong password");
    }
}

let server = net.createServer(function (socket) {
    socket.on('connection', function () {
        db.readFile();
    });

    let userPrivileges = null;

    let dbS = 'jsdb';
    let schemaS = 'public';

    function setDB(dbName) {
        let DBList = db.readFile();
        if (DBList.indexOf(dbName) !== -1) {
            dbS = dbName;
        }
    }

    function setSchema(schemaName) {
        let DBList = db.readFile();
        let SCHList = schema.readFile(dbS);

        if (DBList.indexOf(dbS) !== -1 && SCHList.indexOf(schemaName) !== -1) {
            schemaS = schemaName;
        }
    }

    socket.on('data', function (data) {
        let sqlCmd = data.toLocaleString();

        if (userPrivileges === null) {
            try {
                if (!sqlCmd.includes("credentials: ")) {
                    throw new Error("Username and password not informed");
                } else {
                    let credentials = JSON.parse(sqlCmd.slice("credentials: ".length));
                    userPrivileges = authUser(credentials['username'], credentials['password']);
                    exports.userPrivileges = userPrivileges;
                    socket.write("AUTHOK");
                    return;
                }
            } catch (e) {
                socket.write(e.message);
                socket.destroy();
            }
        }

        if (sqlCmd.includes("db ")) {
            setDB(sqlCmd.slice(3));
        } else if (sqlCmd.toUpperCase().includes("SET SEARCH_PATH TO")) {
            setSchema(sqlCmd.slice("SET SEARCH_PATH TO ".length));
        } else {
            try {
                let r = sql.run(sqlCmd, dbS, schemaS);

                if (typeof r === "object") {
                    r = JSON.stringify(r);
                }

                socket.write(r);
            } catch (err) {
                socket.write("ERROR: " + err.message);
            }
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
            console.error(err.code + ": " + err.message);
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
    console.log("Running server on " + address + ":" + port + ", " + dir);
    exports.startDir = dir;
    db.readFile();
}

exports.rmdirRSync = function rmdirRSync(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file, index) => {
            let curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                rmdirRSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};