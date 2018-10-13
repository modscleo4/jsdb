const db = require("./commands/db");
const scheme = require("./commands/scheme");
const table = require("./commands/table");
const sql = require("./sql/sql");
const sql_parser = require("./node_modules/sql-parser/lib/sql_parser");

let dbS = null;
let schemeS = null;

setDB('marcos');
setScheme('vinicius');

sql.run("CREATE DATABASE marcos");
sql.run("CREATE SCHEME vinicius", dbS);

table.create('marcos', 'vinicius', 'lira', {'id': {'type': 'number'}, 'marcos': {'type': 'string'}});
table.insert('marcos', 'vinicius', 'lira', [0, 'lira']);

console.log(sql.run("SELECT marcos, id FROM lira", dbS, schemeS));

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
