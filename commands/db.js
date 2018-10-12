const fs = require('fs');
const dbmgmt = require('../dbmgmt');
const scheme = require('./scheme');

function createDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = dbmgmt.readDBList();

        if (DBList.indexOf(dbName) === -1) {
            DBList.push(dbName);
            dbmgmt.writeDBList(JSON.stringify(DBList));
        }

        scheme.create(dbName, "public");
    }
}

function createDBFolder(dbname) {
    try {
        fs.mkdirSync("dbs/" + dbname);
    } catch (e) {
        if (!fs.existsSync("dbs/")) {
            fs.mkdirSync("dbs/");
            fs.mkdirSync("dbs/" + dbname);
        }
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;