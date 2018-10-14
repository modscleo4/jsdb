const db = require("./commands/db");
const scheme = require("./commands/scheme");
const table = require("./commands/table");
const sql = require("./sql/sql");
const sql_parser = require("sql-parser/lib/sql_parser");

const net = require('net');

let dbS = null;
let schemeS = null;

db.readFile();

let server = net.createServer(function (socket) {
    socket.write('jsdb1');
    socket.pipe(socket);

    socket.on('data', function (data) {
        let sqlCmd = data.toLocaleString();
        if (sqlCmd.includes("db ")) {
            setDB(sqlCmd.slice(3));
        } else if (sqlCmd.toUpperCase().includes("SET SEARCH_PATH TO")) {
            setScheme(sqlCmd.slice("SET SEARCH_PATH TO ".length));
        } else {
            try {
                let r = sql.run(sqlCmd, dbS, schemeS);
                if (typeof r === "object") {
                    r = JSON.stringify(r);
                }
                socket.write(r);
            } catch (e) {
                console.error(e.message);
            }
        }
    });

    socket.on('error', function (err) {
        console.log(err)
    })
});

server.listen(6637, '127.0.0.1');

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
