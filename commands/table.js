const fs = require('fs');
const dbmgmt = require('../dbmgmt');

const f_tablelist = 'tablelist.json';

function createTable(dbName, schemeName, tableName) {
    if (typeof dbName === "string" && typeof schemeName === "string" && typeof tableName === "string") {

    }
}


exports.create = createTable;