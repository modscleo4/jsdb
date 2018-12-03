/**
 * @summary Contains functions to interact with DBs, like CREATE and DROP
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 *
 * @type {module:fs}
 *
 * @todo: Run on a backup DB, then delete the original and rename
 */

const fs = require('fs');
const schema = require('./schema');
const table = require('./table');
const config = require('../config');
const md5 = require('md5');

const f_dblist = 'dblist.json';

/**
 * @summary Create a DB
 *
 * @param dbName {string} The name of DB
 *
 * @returns {string} If everything runs ok, returns 'Created DB ${dbName}.'
 * @throws {Error} If the DB already exists, throw an error
 */
function createDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            schema.create(dbName, "public");

            throw new Error(`DB ${dbName} already exists.`);
        } else {
            DBList.push(dbName);
            writeDBFile(JSON.stringify(DBList));
            createDBFolder(dbName);

            schema.create(dbName, "public");

            return `Created DB ${dbName}.`;
        }
    }
}

/**
 * @summary Create the folder for the DB
 *
 * @param dbName {string} The name of DB
 */
function createDBFolder(dbName) {
    if (typeof dbName === "string") {
        if (!fs.existsSync(`${config.startDir}dbs/`)) {
            fs.mkdirSync(`${config.startDir}dbs/`);
        }

        fs.mkdirSync(`${config.startDir}dbs/${dbName}`);
    }
}

/**
 * @summary Reads the DB list file
 *
 * @returns {Object} Returns a indexed Object containing all the DBs
 */
function readDBFile() {
    let DBList = [];

    if (!fs.existsSync(`${config.startDir}dbs/${f_dblist}`)) {
        writeDBFile(JSON.stringify([]));
        return readDBFile();
    }

    DBList = JSON.parse(fs.readFileSync(`${config.startDir}dbs/${f_dblist}`, 'utf8'));

    fs.readdirSync(`${config.startDir}dbs/`).forEach(dbName => {
        if (dbName !== f_dblist) {
            if (DBList.indexOf(dbName) === -1) {
                DBList.push(dbName);
                writeDBFile(JSON.stringify(DBList));
            }
        }
    });

    DBList.forEach(dbName => {
        if (!fs.existsSync(`${config.startDir}dbs/${dbName}`)) {
            createDBFolder(dbName);
            schema.create(dbName, "public");
        }
    });

    /*
    * Creates JSDB admin database
    * */
    if (DBList.indexOf("jsdb") === -1) {
        DBList.push('jsdb');
        writeDBFile(JSON.stringify(DBList));
        if (schema.readFile('jsdb').indexOf('public') === -1) {
            schema.create('jsdb', "public");
        }

        table.create('jsdb', 'public', 'users',
            {
                'id': {
                    'type': 'number',
                    'unique': true,
                    'autoIncrement': true,
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
            }
        );
    }

    return DBList;
}

/**
 * @summary Writes the DB list file
 *
 * @param content {string} A JSON string of the indexed Object containing all the DBs
 */
function writeDBFile(content) {
    if (typeof content === "string") {
        if (!fs.existsSync(`${config.startDir}dbs/`)) {
            fs.mkdirSync(`${config.startDir}dbs/`);
        }

        fs.writeFileSync(`${config.startDir}dbs/${f_dblist}`, content);
    }
}

/**
 * @summary Drops a DB
 *
 * @param dbName {string} The name of DB
 * @param ifExists {boolean} If true, doesn't throw an error when the DB does not exist
 *
 * @returns {string} If everything runs without errors, return 'Dropped database ${dbName}.'
 * @throws {Error} If the DB does not exist and ifExists is false, throw an error
 */
function dropDB(dbName, ifExists = false) {
    if (typeof dbName === "string" && typeof ifExists === "boolean") {
        if ((ifExists && readDBFile().indexOf(dbName) !== -1) || (!ifExists && existsDB(dbName))) {
            let DBList = readDBFile();
            let i = DBList.indexOf(dbName);
            DBList.splice(i, 1);
            writeDBFile(JSON.stringify(DBList));
            config.rmdirRSync(`${config.startDir}dbs/${dbName}/`);

            return `Dropped database ${dbName}.`;
        } else {
            return `Database ${dbName} does not exist.`;
        }
    }
}

/**
 * @summary Check if the DB exists
 *
 * @param dbName {string} The name of DB
 *
 * @returns {boolean} Return true if the DB exists
 * @throws {Error} If the DB does not exist, throw an error
 */
function existsDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            return true;
        } else {
            throw new Error(`Database ${dbName} does not exist.`);
        }
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;

exports.drop = dropDB;

exports.exists = existsDB;
