const fs = require('fs');

const db = require("./db");
const server = require('../server');

const f_schlist = 'schlist.json';

/**
 *
 * */
function createSchema(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        let SCHList = readSchemaFile(dbName);

        if (SCHList.indexOf(schemaName) === -1) {
            SCHList.push(schemaName);
            writeSchemaFile(dbName, JSON.stringify(SCHList));
            createSchemaFolder(dbName, schemaName);

            return "Created schema " + schemaName;
        } else {
            throw new Error("Schema " + schemaName + " already exists in DB " + dbName);
        }
    }
}

/**
 *
 * */
function createSchemaFolder(dbname, schemaName) {
    if (db.exists(dbname)) {
        if (!fs.existsSync(server.startDir + "dbs/" + dbname + "/" + schemaName)) {
            fs.mkdirSync(server.startDir + "dbs/" + dbname + "/" + schemaName);
        }
    }
}

/**
 *
 * */
function readSchemaFile(dbName) {
    if (typeof dbName === "string") {
        let r = [];

        /*
        * Checking if the database exists
        * */
        if (db.exists(dbName)) {
            if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + f_schlist)) {
                writeSchemaFile(dbName, JSON.stringify([]));
                return [];
            }

            r = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + f_schlist, 'utf8'));

            r.forEach(schName => {
                if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schName)) {
                    createSchemaFolder(dbName, schName);
                }
            });

            fs.readdirSync(server.startDir + "dbs/" + dbName + "/").forEach(schName => {
                if (schName !== f_schlist) {
                    if (r.indexOf(schName) === -1) {
                        r.push(schName);
                        writeSchemaFile(dbName, JSON.stringify(r));
                    }
                }
            });
        }

        return r;
    }
}

/**
 *
 * */
function writeSchemaFile(dbname, content) {
    if (db.exists(dbname)) {
        fs.writeFileSync(server.startDir + "dbs/" + dbname + "/" + f_schlist, content);
    }
}

/**
 *
 * */
function existsSchema(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        if (db.exists(dbName)) {
            let SCHList = readSchemaFile(dbName);
            if (SCHList.indexOf(schemaName) !== -1) {
                return true;
            } else {
                throw new Error("Schema " + dbName + ":" + schemaName + " does not exist.");
            }
        }
    }
}

exports.create = createSchema;
exports.createFolder = createSchemaFolder;

exports.readFile = readSchemaFile;
exports.writeFile = writeSchemaFile;

exports.exists = existsSchema;
