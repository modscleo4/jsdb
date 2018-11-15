const fs = require('fs');
const schema = require('./schema');
const table = require('./table');
const server = require('../server');
const md5 = require('md5');

const f_dblist = 'dblist.json';

/**
 *
 * */
function createDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) === -1) {
            DBList.push(dbName);
            writeDBFile(JSON.stringify(DBList));
            createDBFolder(dbName);

            schema.create(dbName, "public");

            return "Created DB " + dbName;
        } else {
            schema.create(dbName, "public");

            throw new Error("DB " + dbName + " already exists");
        }
    }
}

/**
 *
 * */
function createDBFolder(dbname) {
    if (!fs.existsSync(server.startDir + "dbs/")) {
        fs.mkdirSync(server.startDir + "dbs/");
    }

    fs.mkdirSync(server.startDir + "dbs/" + dbname);
}

/**
 *
 * */
function readDBFile() {
    let DBList = [];

    if (!fs.existsSync(server.startDir + "dbs/" + f_dblist)) {
        writeDBFile(JSON.stringify([]));
        return readDBFile();
    }

    DBList = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + f_dblist, 'utf8'));

    fs.readdirSync(server.startDir + "dbs/").forEach(dbname => {
        if (dbname !== f_dblist) {
            if (DBList.indexOf(dbname) === -1) {
                DBList.push(dbname);
                writeDBFile(JSON.stringify(DBList));
            }
        }
    });

    DBList.forEach(dbname => {
        if (!fs.existsSync(server.startDir + "dbs/" + dbname)) {
            createDBFolder(dbname);
            schema.create(dbname, "public");
        }
    });

    /*
    * Creates JSDB admin database
    * */
    if (DBList.indexOf("jsdb") === -1) {
        DBList.push('jsdb');
        writeDBFile(JSON.stringify(DBList));
        schema.create('jsdb', "public");

        table.create('jsdb', 'public', 'users', {
                'id': {
                    'type': 'number',
                    'unique': true,
                    'autoIncremant': true,
                    'notNull': true
                },

                'username': {
                    'type': 'string',
                    'unique': true,
                    'notNull': true
                },

                'password': {
                    'type': 'string',
                    'notNull': true
                },

                'valid': {
                    'type': 'boolean',
                    'default': true,
                    'notNull': true
                },

                'privileges': {
                    'type': 'object',
                    'default': {},
                    'notNull': false
                },
            },

            {
                'primaryKey': [
                    'id'
                ]
            });

        table.insert('jsdb', 'public', 'users', ["DEFAULT", 'jsdbadmin', md5('dbadmin'), "DEFAULT", "DEFAULT"]);
    }

    return DBList;
}

/**
 *
 * */
function writeDBFile(content) {
    if (!fs.existsSync(server.startDir + "dbs/")) {
        fs.mkdirSync(server.startDir + "dbs");
    }

    fs.writeFileSync(server.startDir + "dbs/" + f_dblist, content);
}

/**
 *
 * */
function existsDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            return true;
        } else {
            throw new Error("Database " + dbName + " does not exist.");
        }
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;

exports.exists = existsDB;