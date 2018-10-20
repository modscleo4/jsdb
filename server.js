const db = require("./commands/db");
const scheme = require("./commands/scheme");
const table = require("./commands/table");
const sql = require("./sql/sql");

const net = require('net');

db.readFile();

let server = net.createServer(function (socket) {
    let dbS = null;
    let schemeS = null;

    function setDB(dbName) {
        let DBList = db.readFile();
        if (DBList.indexOf(dbName) !== -1) {
            dbS = dbName;
        }
    }

    function setScheme(schemeName) {
        let DBList = db.readFile();
        let SCHList = scheme.readFile(dbS);

        if (DBList.indexOf(dbS) !== -1 && SCHList.indexOf(schemeName) !== -1) {
            schemeS = schemeName;
        }
    }

    socket.on('data', function (data) {
        let sqlCmd = data.toLocaleString();
        if (sqlCmd.includes("db ")) {
            setDB(sqlCmd.slice(3));
            socket.write(JSON.stringify(scheme.readFile(dbS)));
        } else if (sqlCmd.toUpperCase().includes("SET SEARCH_PATH TO")) {
            setScheme(sqlCmd.slice("SET SEARCH_PATH TO ".length));
            socket.write(JSON.stringify(table.readFile(dbS, schemeS)));
        } else {
            try {
                let r = sql.run(sqlCmd, dbS, schemeS);

                if (typeof r === "object") {
                    r = JSON.stringify(r);
                }
                socket.write(r);
            } catch (err) {
                socket.write(err.message);
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
            console.error('Connection reset');
        } else {
            console.error(err.message);
        }


    })
});

let address = "";
let port = 0;
let dir = "";

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-d") {
        dir = process.argv[i + 1];
    } else if (process.argv[i] === "-a") {
        address = process.argv[i + 1];
    } else if (process.argv[i] === "-p") {
        port = parseInt(process.argv[i + 1]);
    }
}

if (dir === "") {
    dir = "./";
}

if (address === "") {
    address = "localhost";
}

if (port === 0) {
    port = 6637;
}

if (address !== "" && port !== 0 && dir !== "") {
    server.listen(port, address);
    console.log("Running server on " + address + ":" + port + ", " + dir);
    exports.startDir = dir;
}