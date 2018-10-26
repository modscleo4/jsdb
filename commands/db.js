const fs = require('fs');
const scheme = require('./scheme');
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

            scheme.create(dbName, "public");

            return "Created DB " + dbName;
        } else {
            scheme.create(dbName, "public");

            return "DB " + dbName + " already exists";
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
    try {
        let DBList = [];

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
                scheme.create(dbname, "public");
            }
        });

        /*
        * Creates JSDB admin database
        * */
        if (DBList.indexOf("jsdb") === -1) {
            DBList.push('jsdb');
            writeDBFile(JSON.stringify(DBList));
            scheme.create('jsdb', "public");

            table.create('jsdb', 'public', 'users', {
                    'id': {
                        'type': 'number',
                        'unique': 'yes',
                        'autoIncrement': 'yes'
                    },

                    'username': {
                        'type': 'string',
                        'unique': 'yes'
                    },

                    'password': {
                        'type': 'string'
                    },

                    'valid': {
                        'type': 'boolean',
                        'default': true
                    },

                    'privileges': {
                        'type': 'object',
                        'default': {}
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
    } catch (e) {
        writeDBFile('[]');
        return readDBFile();
    }
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

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;