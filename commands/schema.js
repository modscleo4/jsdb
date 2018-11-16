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

        if (SCHList.indexOf(schemaName) !== -1) {
            throw new Error(`Schema ${schemaName} already exists in DB ${dbName}`);
        } else {
            SCHList.push(schemaName);
            writeSchemaFile(dbName, JSON.stringify(SCHList));
            createSchemaFolder(dbName, schemaName);

            return `Created schema ${schemaName}`;
        }
    }
}

/**
 *
 * */
function createSchemaFolder(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        if (db.exists(dbName)) {
            if (!fs.existsSync(`${server.startDir}dbs/${dbName}/${schemaName}`)) {
                fs.mkdirSync(`${server.startDir}dbs/${dbName}/${schemaName}`);
            }
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
            if (!fs.existsSync(`${server.startDir}dbs/${dbName}/${f_schlist}`)) {
                writeSchemaFile(dbName, JSON.stringify([]));
                return [];
            }

            r = JSON.parse(fs.readFileSync(`${server.startDir}dbs/${dbName}/${f_schlist}`, 'utf8'));

            r.forEach(schName => {
                if (!fs.existsSync(`${server.startDir}dbs/${dbName}/${schName}`)) {
                    createSchemaFolder(dbName, schName);
                }
            });

            fs.readdirSync(`${server.startDir}dbs/${dbName}/`).forEach(schName => {
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
function writeSchemaFile(dbName, content) {
    if (typeof dbName === "string") {
        if (db.exists(dbName)) {
            fs.writeFileSync(`${server.startDir}dbs/${dbName}/${f_schlist}`, content);
        }
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
                throw new Error(`Schema ${schemaName} does not exist.`);
            }
        }
    }
}

exports.create = createSchema;
exports.createFolder = createSchemaFolder;

exports.readFile = readSchemaFile;
exports.writeFile = writeSchemaFile;

exports.exists = existsSchema;
